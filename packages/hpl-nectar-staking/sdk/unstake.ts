import * as web3 from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import {
  createUnstakeInstruction,
  StakingProject,
  LockType,
  MultipliersArgs,
  PROGRAM_ID,
} from "../generated";
import { StakedNft } from "../types";
import { Metaplex, Mint } from "@metaplex-foundation/js";
import {
  getMetadataAccount_,
  getDepositPda,
  getNftPda,
  getStakerPda,
  getStakingProjectPda,
  METADATA_PROGRAM_ID,
} from "../pdas";
import { createClaimRewardsCtx } from "./claimRewards";
import { TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import { VAULT } from "@honeycomb-protocol/hive-control";
import { createCtx } from "../utils";

type CreateUnstakeInstructionArgs = {
  project: web3.PublicKey;
  stakingProject: web3.PublicKey;
  nftMint: web3.PublicKey;
  wallet: web3.PublicKey;
  lockType?: LockType; // default: LockType.Freeze,
  tokenStandard?: TokenStandard; // deafult: TokenStandard.NonFungible,
  programId?: web3.PublicKey;
};

export function createUnstakeInstructionV2(args: CreateUnstakeInstructionArgs) {
  const programId = args.programId || PROGRAM_ID;

  const [nft] = getNftPda(args.stakingProject, args.nftMint);
  const nftAccount = splToken.getAssociatedTokenAddressSync(
    args.nftMint,
    args.wallet
  );
  const [nftMetadata] = getMetadataAccount_(args.nftMint);
  const [nftEdition] = getMetadataAccount_(args.nftMint, { __kind: "edition" });
  const [staker] = getStakerPda(args.stakingProject, args.wallet);

  let nftTokenRecord: web3.PublicKey | undefined,
    depositAccount: web3.PublicKey | undefined,
    depositTokenRecord: web3.PublicKey | undefined;

  if (args.lockType === LockType.Custoday) {
    [depositAccount] = getDepositPda(args.nftMint);
  }

  if (args.tokenStandard === TokenStandard.ProgrammableNonFungible) {
    [nftTokenRecord] = getMetadataAccount_(args.nftMint, {
      __kind: "token_record",
      tokenAccount: nftAccount,
    });
    if (depositAccount && args.lockType === LockType.Custoday) {
      [depositTokenRecord] = getMetadataAccount_(args.nftMint, {
        __kind: "token_record",
        tokenAccount: depositAccount,
      });
    }
  }

  return createUnstakeInstruction(
    {
      project: args.project,
      vault: VAULT,
      stakingProject: args.stakingProject,
      nft,
      nftMint: args.nftMint,
      nftAccount,
      nftMetadata,
      nftEdition,
      nftTokenRecord: nftTokenRecord || programId,
      depositAccount: depositAccount || programId,
      depositTokenRecord: depositTokenRecord || programId,
      staker,
      wallet: args.wallet,
      associatedTokenProgram: splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
      tokenMetadataProgram: METADATA_PROGRAM_ID,
      clock: web3.SYSVAR_CLOCK_PUBKEY,
      sysvarInstructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
    },
    programId
  );
}

type CreateUnstakeCtxArgs = {
  metaplex: Metaplex;
  stakingProject: StakingProject;
  nft: StakedNft;
  multipliers?: MultipliersArgs & {
    address: web3.PublicKey;
  };
  programId?: web3.PublicKey;
};
export function createUnstakeCtx({
  metaplex: mx,
  ...args
}: CreateUnstakeCtxArgs) {
  const instructions: web3.TransactionInstruction[] = [];
  const signers: web3.Signer[] = [];

  const wallet = mx.identity();
  const [stakingProjectAddress] = getStakingProjectPda(
    args.stakingProject.project,
    args.stakingProject.key,
    args.programId
  );

  const claimCtx = createClaimRewardsCtx({
    project: args.stakingProject.project,
    stakingProject: stakingProjectAddress,
    nftMint: args.nft.mintAddress,
    rewardMint: args.stakingProject.rewardMint,
    wallet: wallet.publicKey,
    multipliers: args.multipliers?.address,
    programId: args.programId,
  });
  instructions.push(...claimCtx.tx.instructions);
  signers.push(...claimCtx.signers);

  const unstakeIx = createUnstakeInstructionV2({
    project: args.stakingProject.project,
    stakingProject: stakingProjectAddress,
    nftMint: args.nft.mintAddress,
    wallet: wallet.publicKey,
    lockType: args.stakingProject.lockType,
    tokenStandard: args.nft.tokenStandard,
    programId: args.programId,
  });
  instructions.push(unstakeIx);

  return createCtx(instructions, signers);
}

export async function unstake(
  metaplex: Metaplex,
  stakingProject: StakingProject,
  ...nfts: StakedNft[]
) {
  const wallet = metaplex.identity();
  const txs = await Promise.all(
    nfts.map((nft, i) =>
      createUnstakeCtx({
        metaplex,
        stakingProject,
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
