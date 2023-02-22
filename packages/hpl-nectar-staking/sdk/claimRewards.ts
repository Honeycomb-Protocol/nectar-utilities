import * as web3 from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import {
  createClaimRewardsInstruction,
  StakingPool,
  PROGRAM_ID,
} from "../generated";
import { Metaplex } from "@metaplex-foundation/js";
import { createCtx, getOrFetchMultipliers } from "../utils";
import { getNftPda, getStakerPda, getVaultPda } from "../pdas";
import { VAULT } from "@honeycomb-protocol/hive-control";

type ClaimRewardsArgs = {
  metaplex: Metaplex;
  project: web3.PublicKey;
  stakingPool: web3.PublicKey;
  nftMint: web3.PublicKey;
  programId?: web3.PublicKey;
};

type CreateClaimRewardsCtxArgs = {
  project: web3.PublicKey;
  stakingPool: web3.PublicKey;
  nftMint: web3.PublicKey;
  rewardMint: web3.PublicKey;
  wallet: web3.PublicKey;
  multipliers?: web3.PublicKey;
  programId?: web3.PublicKey;
};

export function createClaimRewardsCtx(args: CreateClaimRewardsCtxArgs) {
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

  const instructions: web3.TransactionInstruction[] = [
    createClaimRewardsInstruction(
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
    ),
  ];

  return createCtx(instructions);
}

export async function claimRewards({
  metaplex: mx,
  ...args
}: ClaimRewardsArgs) {
  const staking_poolAccount = await StakingPool.fromAccountAddress(
    mx.connection,
    args.stakingPool
  );
  const multipliers = await getOrFetchMultipliers(mx.connection, args.project);
  const wallet = mx.identity();
  const ctx = createClaimRewardsCtx({
    project: args.project,
    stakingPool: args.stakingPool,
    nftMint: args.nftMint,
    rewardMint: staking_poolAccount.rewardMint,
    wallet: wallet.publicKey,
    multipliers: multipliers?.address,
    programId: args.programId,
  });

  ctx.tx.recentBlockhash = await mx.connection
    .getLatestBlockhash()
    .then((x) => x.blockhash);
  return {
    response: await mx
      .rpc()
      .sendAndConfirmTransaction(ctx.tx, { skipPreflight: true }, ctx.signers),
  };
}
