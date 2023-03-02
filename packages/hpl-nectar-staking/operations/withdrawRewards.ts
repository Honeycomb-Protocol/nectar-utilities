import * as web3 from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import { createWithdrawRewardsInstruction, PROGRAM_ID } from "../generated";
import { getVaultPda } from "../pdas";
import { VAULT, createCtx } from "@honeycomb-protocol/hive-control";
import { NectarStaking } from "../NectarStaking";

type CreateWithdrawRewardsCrx = {
  project: web3.PublicKey;
  stakingPool: web3.PublicKey;
  rewardMint: web3.PublicKey;
  authority: web3.PublicKey;
  payer: web3.PublicKey;
  amount: number;
  delegateAuthority?: web3.PublicKey;
  programId?: web3.PublicKey;
};

export function createWithdrawRewardsCtx(args: CreateWithdrawRewardsCrx) {
  const programId = args.programId || PROGRAM_ID;
  const [rewardVault] = getVaultPda(
    args.stakingPool,
    args.rewardMint,
    programId
  );

  const tokenAccount = splToken.getAssociatedTokenAddressSync(
    args.rewardMint,
    args.authority
  );

  const instructions: web3.TransactionInstruction[] = [
    createWithdrawRewardsInstruction(
      {
        project: args.project,
        vault: VAULT,
        stakingPool: args.stakingPool,
        rewardMint: args.rewardMint,
        rewardVault,
        tokenAccount,
        delegateAuthority: args.delegateAuthority || programId,
        authority: args.authority,
        payer: args.payer,
      },
      {
        amount: args.amount,
      },
      programId
    ),
  ];

  return createCtx(instructions);
}

type WithdrawRewardsArgs = {
  amount: number;
  programId?: web3.PublicKey;
};
export async function withdrawRewards(
  staking: NectarStaking,
  args: WithdrawRewardsArgs
) {
  const wallet = staking.honeycomb().identity();
  const ctx = createWithdrawRewardsCtx({
    project: staking.pool().project,
    stakingPool: staking.poolAddress,
    rewardMint: staking.rewardMint,
    authority: wallet.publicKey,
    payer: wallet.publicKey,
    amount: args.amount,
    delegateAuthority: wallet.getDelegateAuthority().delegateAuthorityAddress,
    programId: args.programId,
  });

  return staking
    .honeycomb()
    .rpc()
    .sendAndConfirmTransaction(ctx, { skipPreflight: true });
}
