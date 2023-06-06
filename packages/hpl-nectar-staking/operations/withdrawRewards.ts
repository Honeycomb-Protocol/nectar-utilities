import * as web3 from "@solana/web3.js";
import { createWithdrawRewardsInstruction, PROGRAM_ID } from "../generated";
import { Honeycomb, VAULT, Operation } from "@honeycomb-protocol/hive-control";
import {
  PROGRAM_ID as HPL_CURRENCY_MANAGER_PROGRAM_ID,
  CurrencyKind,
  holderAccountPdas,
  HplCurrency,
} from "@honeycomb-protocol/currency-manager";
import { NectarStaking } from "../NectarStaking";

type CreateWithdrawRewardsCrx = {
  stakingPool: NectarStaking;
  currency: HplCurrency;
  currencyKind: CurrencyKind;
  mint: web3.PublicKey;
  receiverWallet: web3.PublicKey;
  amount: number;
  programId?: web3.PublicKey;
};

export async function createWithdrawRewardsOperation(honeycomb:Honeycomb,args: CreateWithdrawRewardsCrx) {
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
        project: args.stakingPool.project().address,
        vault: VAULT,
        stakingPool: args.stakingPool.address,
        currency: args.currency,
        mint: args.mint,
        vaultHolderAccount,
        vaultTokenAccount,
        holderAccount,
        tokenAccount,
        delegateAuthority: honeycomb.identity().delegateAuthority()?.address || programId,
        authority: honeycomb.identity().delegateAuthority()?.address || programId,
        payer: honeycomb.identity().delegateAuthority()?.address || programId,
        currencyManagerProgram: HPL_CURRENCY_MANAGER_PROGRAM_ID,
      },
      {
        amount: args.amount,
      },
      programId
    ),
  ];

  return {
    operation: new Operation(honeycomb, instructions),
  };
}

