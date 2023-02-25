import * as web3 from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import {
  createClaimRewardsInstruction,
  StakingPool,
  PROGRAM_ID,
} from "../generated";
import { Honeycomb, createCtx } from "@honeycomb-protocol/hive-control";
import {
  getNftPda,
  getStakerPda,
  getStakingPoolPda,
  getVaultPda,
} from "../pdas";
import { VAULT } from "@honeycomb-protocol/hive-control";
import { StakedNft } from "../types";

type CreateClaimRewardsInstructionArgs = {
  project: web3.PublicKey;
  stakingPool: web3.PublicKey;
  nftMint: web3.PublicKey;
  rewardMint: web3.PublicKey;
  wallet: web3.PublicKey;
  multipliers?: web3.PublicKey;
  programId?: web3.PublicKey;
};

export function createClaimRewardsInstructionV2(
  args: CreateClaimRewardsInstructionArgs
) {
  const programId = args.programId || PROGRAM_ID;

  const [nft] = getNftPda(args.stakingPool, args.nftMint, programId);
  const [rewardVault] = getVaultPda(
    args.stakingPool,
    args.rewardMint,
    programId
  );
  const [staker] = getStakerPda(args.stakingPool, args.wallet, programId);

  const tokenAccount = splToken.getAssociatedTokenAddressSync(
    args.rewardMint,
    args.wallet
  );

  return createClaimRewardsInstruction(
    {
      project: args.project,
      vault: VAULT,
      stakingPool: args.stakingPool,
      multipliers: args.multipliers || programId,
      nft,
      rewardMint: args.rewardMint,
      rewardVault,
      tokenAccount,
      staker,
      wallet: args.wallet,
      clock: web3.SYSVAR_CLOCK_PUBKEY,
    },
    programId
  );
}

type CreateClaimRewardsCtxArgs = {
  connection: web3.Connection;
  project: web3.PublicKey;
  stakingPool: StakingPool;
  nft: StakedNft;
  wallet: web3.PublicKey;
  multipliers?: web3.PublicKey;
  isFirst?: boolean;
  programId?: web3.PublicKey;
};

export async function createClaimRewardsCtx({
  connection,
  ...args
}: CreateClaimRewardsCtxArgs) {
  const instructions: web3.TransactionInstruction[] = [];

  const [stakingPoolAddress] = getStakingPoolPda(
    args.stakingPool.project,
    args.stakingPool.key,
    args.programId
  );

  if (args.isFirst) {
    const rewardTokenAccount = splToken.getAssociatedTokenAddressSync(
      args.stakingPool.rewardMint,
      args.wallet
    );
    try {
      splToken.getAccount(connection, rewardTokenAccount);
    } catch {
      instructions.push(
        splToken.createAssociatedTokenAccountInstruction(
          args.wallet,
          rewardTokenAccount,
          args.wallet,
          args.stakingPool.rewardMint
        )
      );
    }
  }

  instructions.push(
    createClaimRewardsInstructionV2({
      project: args.project,
      stakingPool: stakingPoolAddress,
      nftMint: args.nft.mintAddress,
      rewardMint: args.stakingPool.rewardMint,
      wallet: args.wallet,
      multipliers: args.multipliers,
      programId: args.programId,
    })
  );

  return createCtx(instructions);
}

type ClaimRewardsArgs = {
  nfts: StakedNft[];
  programId?: web3.PublicKey;
};
export async function claimRewards(
  honeycomb: Honeycomb,
  args: ClaimRewardsArgs
) {
  const wallet = honeycomb.identity();
  const multipliers = await honeycomb
    .staking()
    .fetch()
    .multipliers()
    .catch((_) => undefined);
  const ctxs = await Promise.all(
    args.nfts.map((nft, i) =>
      createClaimRewardsCtx({
        connection: honeycomb.connection,
        project: honeycomb.projectAddress,
        stakingPool: honeycomb.staking().pool(),
        nft,
        wallet: wallet.publicKey,
        multipliers: multipliers?.address,
        isFirst: i === 0,
        programId: args.programId,
      })
    )
  );

  const prepared = await honeycomb.rpc().prepareTransactions(ctxs);
  const preparedCtxs = prepared.ctxs;

  const firstTxResponse = await honeycomb
    .rpc()
    .sendAndConfirmTransaction(preparedCtxs.shift(), {
      commitment: "processed",
      skipPreflight: true,
    });

  const responses = await honeycomb
    .rpc()
    .sendAndConfirmTransactionsInBatches(preparedCtxs, {
      commitment: "processed",
      skipPreflight: true,
    });

  return [firstTxResponse, ...responses];
}
