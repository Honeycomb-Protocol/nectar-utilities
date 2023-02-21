import * as web3 from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import {
  createWithdrawRewardsInstruction,
  StakingProject,
  PROGRAM_ID,
} from "../generated";
import { Metaplex } from "@metaplex-foundation/js";
import { getVaultPda } from "../pdas";
import { VAULT } from "@honeycomb-protocol/hive-control";
import { createCtx } from "../utils";

type WithdrawRewardsArgs = {
  metaplex: Metaplex;
  project: web3.PublicKey;
  stakingProject: web3.PublicKey;
  amount: number;
  delegateAuthority?: web3.PublicKey;
  programId?: web3.PublicKey;
};

type CreateWithdrawRewardsCrx = {
  project: web3.PublicKey;
  stakingProject: web3.PublicKey;
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
    args.stakingProject,
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
        stakingProject: args.stakingProject,
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

export async function withdrawRewards({
  metaplex: mx,
  ...args
}: WithdrawRewardsArgs) {
  const stakingProjectAccount = await StakingProject.fromAccountAddress(
    mx.connection,
    args.project
  );

  const wallet = mx.identity();
  const ctx = createWithdrawRewardsCtx({
    project: stakingProjectAccount.project,
    stakingProject: args.stakingProject,
    rewardMint: stakingProjectAccount.rewardMint,
    authority: wallet.publicKey,
    payer: wallet.publicKey,
    amount: args.amount,
    delegateAuthority: args.delegateAuthority,
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
