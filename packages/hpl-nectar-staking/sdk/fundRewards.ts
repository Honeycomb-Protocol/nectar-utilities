import * as web3 from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import {
  createFundRewardsInstruction,
  StakingPool,
  PROGRAM_ID,
} from "../generated";
import { Metaplex } from "@metaplex-foundation/js";
import { getVaultPda } from "../pdas";
import { VAULT } from "@honeycomb-protocol/hive-control";
import { createCtx } from "../utils";

type FundRewardsArgs = {
  metaplex: Metaplex;
  project: web3.PublicKey;
  stakingPool: web3.PublicKey;
  amount: number;
  programId?: web3.PublicKey;
};

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

export async function fundRewards({ metaplex: mx, ...args }: FundRewardsArgs) {
  const staking_poolAccount = await StakingPool.fromAccountAddress(
    mx.connection,
    args.stakingPool
  );

  const wallet = mx.identity();
  const ctx = createFundRewardsCtx({
    project: args.project,
    stakingPool: args.stakingPool,
    rewardMint: staking_poolAccount.rewardMint,
    wallet: wallet.publicKey,
    amount: args.amount,
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
