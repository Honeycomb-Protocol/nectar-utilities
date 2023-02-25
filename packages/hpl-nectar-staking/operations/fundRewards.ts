import * as web3 from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import { createFundRewardsInstruction, PROGRAM_ID } from "../generated";
import { getVaultPda } from "../pdas";
import { VAULT, createCtx, Honeycomb } from "@honeycomb-protocol/hive-control";

type CreateFundRewardsCrxArgs = {
  project: web3.PublicKey;
  stakingPool: web3.PublicKey;
  rewardMint: web3.PublicKey;
  wallet: web3.PublicKey;
  amount: number;
  programId?: web3.PublicKey;
};

export function createFundRewardsCtx(args: CreateFundRewardsCrxArgs) {
  const programId = args.programId || PROGRAM_ID;
  const [rewardVault] = getVaultPda(
    args.stakingPool,
    args.rewardMint,
    programId
  );

  const tokenAccount = splToken.getAssociatedTokenAddressSync(
    args.rewardMint,
    args.wallet
  );

  const instructions: web3.TransactionInstruction[] = [
    createFundRewardsInstruction(
      {
        project: args.project,
        vault: VAULT,
        stakingPool: args.stakingPool,
        rewardMint: args.rewardMint,
        rewardVault,
        tokenAccount,
        wallet: args.wallet,
      },
      {
        amount: args.amount,
      },
      programId
    ),
  ];

  return createCtx(instructions);
}

type FundRewardsArgs = {
  amount: number;
  programId?: web3.PublicKey;
};

export async function fundRewards(honeycomb: Honeycomb, args: FundRewardsArgs) {
  const wallet = honeycomb.identity();
  const ctx = createFundRewardsCtx({
    project: honeycomb.projectAddress,
    stakingPool: honeycomb.staking().poolAddress,
    rewardMint: honeycomb.staking().rewardMint,
    wallet: wallet.publicKey,
    amount: args.amount,
    programId: args.programId,
  });

  return honeycomb
    .rpc()
    .sendAndConfirmTransaction(ctx, { skipPreflight: true });
}
