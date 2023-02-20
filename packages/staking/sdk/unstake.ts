import * as web3 from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import {
  createUnstakeInstruction,
  Project,
  LockType,
  MultipliersArgs,
  PROGRAM_ID,
} from "../generated";
import { StakedNft, TxSignersAccounts } from "../types";
import { Metaplex, Mint } from "@metaplex-foundation/js";
import {
  getMetadataAccount_,
  getDepositPda,
  getNftPda,
  getStakerPda,
  getProjectPda,
  METADATA_PROGRAM_ID,
} from "../pdas";
import { createClaimRewardsCtx } from "./claimRewards";
import { TokenStandard } from "@metaplex-foundation/mpl-token-metadata";

export function createUnstakeTransaction(
  project: web3.PublicKey,
  nftMint: web3.PublicKey,
  wallet: web3.PublicKey,
  lockType: LockType = LockType.Freeze,
  tokenStandard: TokenStandard = TokenStandard.NonFungible,
  programId: web3.PublicKey = PROGRAM_ID
): TxSignersAccounts {
  const [nft] = getNftPda(project, nftMint);
  const nftAccount = splToken.getAssociatedTokenAddressSync(nftMint, wallet);
  const [nftMetadata] = getMetadataAccount_(nftMint);
  const [nftEdition] = getMetadataAccount_(nftMint, { __kind: "edition" });
  const [staker] = getStakerPda(project, wallet);

  let nftTokenRecord: web3.PublicKey | undefined,
    depositAccount: web3.PublicKey | undefined,
    depositTokenRecord: web3.PublicKey | undefined;

  if (lockType == LockType.Custoday) {
    [depositAccount] = getDepositPda(nftMint);
  }

  if (tokenStandard === TokenStandard.ProgrammableNonFungible) {
    [nftTokenRecord] = getMetadataAccount_(nftMint, {
      __kind: "token_record",
      tokenAccount: nftAccount,
    });
    if (depositAccount && lockType == LockType.Custoday) {
      [depositTokenRecord] = getMetadataAccount_(nftMint, {
        __kind: "token_record",
        tokenAccount: depositAccount,
      });
    }
  }

  const instructions: web3.TransactionInstruction[] = [
    createUnstakeInstruction(
      {
        project,
        nft,
        nftMint,
        nftAccount,
        nftMetadata,
        nftEdition,
        nftTokenRecord: nftTokenRecord || programId,
        depositAccount: depositAccount || programId,
        depositTokenRecord: depositTokenRecord || programId,
        staker,
        wallet,
        associatedTokenProgram: splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadataProgram: METADATA_PROGRAM_ID,
        clock: web3.SYSVAR_CLOCK_PUBKEY,
        sysvarInstructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      },
      programId
    ),
  ];

  return {
    tx: new web3.Transaction().add(...instructions),
    signers: [],
    accounts: instructions.flatMap((i) => i.keys.map((k) => k.pubkey)),
  };
}

type CreateUnstakeCtxArgs = {
  metaplex: Metaplex;
  project: Project;
  nft: StakedNft;
  multipliers?:
    | (MultipliersArgs & {
        address: web3.PublicKey;
      })
    | null;
};
export function createUnstakeCtx({
  metaplex: mx,
  ...args
}: CreateUnstakeCtxArgs) {
  const tx = new web3.Transaction();
  const signers: web3.Signer[] = [];
  const accounts: web3.PublicKey[] = [];

  const wallet = mx.identity();
  const [projectAddress] = getProjectPda(args.project.key);
  const nftMint =
    args.nft.mint instanceof web3.PublicKey
      ? args.nft.mint
      : (args.nft.mint as Mint).address;

  const claimCtx = createClaimRewardsCtx(
    projectAddress,
    nftMint,
    args.project.rewardMint,
    wallet.publicKey,
    args.multipliers?.address
  );
  tx.add(claimCtx.tx);
  signers.push(...claimCtx.signers);
  accounts.push(...claimCtx.accounts);

  const unstakeCtx = createUnstakeTransaction(
    projectAddress,
    nftMint,
    wallet.publicKey,
    args.project.lockType,
    args.nft.tokenStandard || undefined
  );
  tx.add(unstakeCtx.tx);
  signers.push(...unstakeCtx.signers);
  accounts.push(...unstakeCtx.accounts);

  return {
    tx,
    signers,
    accounts,
  };
}

export async function unstake(
  metaplex: Metaplex,
  project: Project,
  ...nfts: StakedNft[]
) {
  const wallet = metaplex.identity();
  const txs = await Promise.all(
    nfts.map((nft, i) =>
      createUnstakeCtx({
        metaplex,
        project,
        nft,
      })
    )
  );

  if (!!!txs.length) return [];

  const recentBlockhash = await metaplex.connection.getLatestBlockhash();
  const txns: web3.Transaction[] = [];
  for (let tx of txs) {
    tx.tx.recentBlockhash = recentBlockhash.blockhash;
    tx.tx.feePayer = wallet.publicKey;
    tx.signers.length && tx.tx.partialSign(...tx.signers);
    txns.push(tx.tx);
  }
  const signedTxs = await wallet.signAllTransactions(txns);

  const firstTx = signedTxs.shift();

  if (!firstTx) return;

  const firstResponse = await metaplex
    .rpc()
    .sendAndConfirmTransaction(firstTx, {
      commitment: "processed",
    });
  const responses = await Promise.all(
    signedTxs.map((t) =>
      metaplex.rpc().sendAndConfirmTransaction(t, { commitment: "processed" })
    )
  );

  return [firstResponse, ...responses];
}
