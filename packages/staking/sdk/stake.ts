import * as web3 from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import {
  createStakeInstruction,
  LockType,
  PROGRAM_ID,
  Project,
} from "../generated";
import { AvailableNft, TxSignersAccounts } from "../types";
import { Metaplex } from "@metaplex-foundation/js";
import { TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import {
  getMetadataAccount_,
  getDepositPda,
  getNftPda,
  getStakerPda,
  getProjectPda,
  METADATA_PROGRAM_ID,
} from "../pdas";
import { getOrFetchNft, getOrFetchStaker } from "../utils";
import { createInitStakerCtx } from "./initStaker";
import { createInitNFTCtx } from "./initNFT";

export function createStakeTransaction(
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
    createStakeInstruction(
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

type CreateStakeCtxArgs = {
  metaplex: Metaplex;
  project: Project;
  nft: AvailableNft;
  isFirst?: boolean;
};
export async function createStakeCtx({
  metaplex: mx,
  ...args
}: CreateStakeCtxArgs): Promise<TxSignersAccounts> {
  const tx = new web3.Transaction();
  const signers: web3.Signer[] = [];
  const accounts: web3.PublicKey[] = [];

  const wallet = mx.identity();
  const [projectAddress] = getProjectPda(args.project.key);

  if (args.isFirst) {
    const staker = await getOrFetchStaker(
      mx.connection,
      wallet.publicKey,
      projectAddress
    );
    if (!staker) {
      const initStakerCtx = createInitStakerCtx(
        projectAddress,
        wallet.publicKey
      );
      tx.add(initStakerCtx.tx);
      signers.push(...initStakerCtx.signers);
      accounts.push(...initStakerCtx.accounts);
    }
  }

  const nft = await getOrFetchNft(
    mx.connection,
    args.nft.tokenMint,
    projectAddress
  );
  if (!nft) {
    const initNftCtx = createInitNFTCtx(
      projectAddress,
      args.nft.tokenMint,
      wallet.publicKey
    );
    tx.add(initNftCtx.tx);
    signers.push(...initNftCtx.signers);
    accounts.push(...initNftCtx.accounts);
  }

  const stakeCtx = createStakeTransaction(
    projectAddress,
    args.nft.tokenMint,
    wallet.publicKey,
    args.project.lockType,
    args.nft.tokenStandard || undefined
  );
  tx.add(stakeCtx.tx);
  signers.push(...stakeCtx.signers);
  accounts.push(...stakeCtx.accounts);

  return {
    tx,
    signers,
    accounts,
  };
}

export async function stake(
  metaplex: Metaplex,
  project: Project,
  ...nfts: AvailableNft[]
) {
  const wallet = metaplex.identity();
  const txs = await Promise.all(
    nfts.map((nft, i) =>
      createStakeCtx({
        metaplex,
        project,
        nft,
        isFirst: i == 0,
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

  if (!firstTx) return [];

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
