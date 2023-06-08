import * as web3 from "@solana/web3.js";
import { createWithdrawRewardsInstruction, PROGRAM_ID } from "../generated";
import { Honeycomb, VAULT, Operation } from "@honeycomb-protocol/hive-control";
import {
  PROGRAM_ID as HPL_CURRENCY_MANAGER_PROGRAM_ID,
  holderAccountPdas,
} from "@honeycomb-protocol/currency-manager";
import { NectarStaking } from "../NectarStaking";

type CreateWithdrawRewardsCrx = {
  amount: number;
  stakingPool: NectarStaking;
  receiverWallet: web3.PublicKey;
  programId?: web3.PublicKey;
};

export async function createWithdrawRewardsOperation(
  honeycomb: Honeycomb,
  args: CreateWithdrawRewardsCrx
) {
  const programId = args.programId || PROGRAM_ID;

  const { holderAccount: vaultHolderAccount, tokenAccount: vaultTokenAccount } =
    holderAccountPdas(
      args.stakingPool.address,
      args.stakingPool.currency().mint,
      args.stakingPool.currency().kind
    );
  const { holderAccount, tokenAccount } = holderAccountPdas(
    args.receiverWallet,
    args.stakingPool.currency().mint,
    args.stakingPool.currency().kind
  );

  const instructions: web3.TransactionInstruction[] = [
    createWithdrawRewardsInstruction(
      {
        project: args.stakingPool.project().address,
        vault: VAULT,
        stakingPool: args.stakingPool.address,
        currency: args.stakingPool.currency().address,
        mint: args.stakingPool.currency().mint,
        vaultHolderAccount,
        vaultTokenAccount,
        holderAccount,
        tokenAccount,
        delegateAuthority:
          honeycomb.identity().delegateAuthority()?.address || programId,
        authority:
          honeycomb.identity().delegateAuthority()?.address || programId,
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
