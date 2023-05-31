import * as web3 from "@solana/web3.js";
import { createWithdrawRewardsInstruction, PROGRAM_ID } from "../generated";
import { VAULT, createCtx } from "@honeycomb-protocol/hive-control";
import {
  PROGRAM_ID as HPL_CURRENCY_MANAGER_PROGRAM_ID,
  CurrencyKind,
  holderAccountPdas,
} from "@honeycomb-protocol/currency-manager";
import { NectarStaking } from "../NectarStaking";

type CreateWithdrawRewardsCrx = {
  project: web3.PublicKey;
  stakingPool: web3.PublicKey;
  currency: web3.PublicKey;
  currencyKind: CurrencyKind;
  mint: web3.PublicKey;
  receiverWallet: web3.PublicKey;
  authority: web3.PublicKey;
  payer: web3.PublicKey;
  amount: number;
  delegateAuthority?: web3.PublicKey;
  programId?: web3.PublicKey;
};

export function createWithdrawRewardsCtx(args: CreateWithdrawRewardsCrx) {
  const programId = args.programId || PROGRAM_ID;

  const { holderAccount: vaultHolderAccount, tokenAccount: vaultTokenAccount } =
    holderAccountPdas(args.stakingPool, args.mint, args.currencyKind);
  const { holderAccount, tokenAccount } = holderAccountPdas(
    args.receiverWallet,
    args.mint,
    args.currencyKind
  );

  const instructions: web3.TransactionInstruction[] = [
    createWithdrawRewardsInstruction(
      {
        project: args.project,
        vault: VAULT,
        stakingPool: args.stakingPool,
        currency: args.currency,
        mint: args.mint,
        vaultHolderAccount,
        vaultTokenAccount,
        holderAccount,
        tokenAccount,
        delegateAuthority: args.delegateAuthority || programId,
        authority: args.authority,
        payer: args.payer,
        currencyManagerProgram: HPL_CURRENCY_MANAGER_PROGRAM_ID,
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
  receiverWallet?: web3.PublicKey;
  programId?: web3.PublicKey;
};
export async function withdrawRewards(
  staking: NectarStaking,
  args: WithdrawRewardsArgs,
  confirmOptions?: web3.ConfirmOptions
) {
  const wallet = staking.honeycomb().identity();
  const ctx = createWithdrawRewardsCtx({
    project: staking.pool().project,
    stakingPool: staking.poolAddress,
    currency: staking.currency().address,
    currencyKind: staking.currency().kind,
    mint: staking.currency().mint,
    receiverWallet: args.receiverWallet || wallet.publicKey,
    authority: wallet.publicKey,
    payer: wallet.publicKey,
    amount: args.amount,
    delegateAuthority: wallet.delegateAuthority().address,
    programId: args.programId,
  });

  return staking
    .honeycomb()
    .rpc()
    .sendAndConfirmTransaction(ctx, confirmOptions);
}
