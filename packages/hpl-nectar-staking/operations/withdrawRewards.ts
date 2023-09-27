import * as web3 from "@solana/web3.js";
import { createWithdrawRewardsInstruction, PROGRAM_ID } from "../generated";
import {
  Honeycomb,
  VAULT,
  Operation,
  HPL_HIVE_CONTROL_PROGRAM,
} from "@honeycomb-protocol/hive-control";
import {
  PROGRAM_ID as HPL_CURRENCY_MANAGER_PROGRAM_ID,
  holderAccountPdas,
} from "@honeycomb-protocol/currency-manager";
import { NectarStaking } from "../NectarStaking";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

/**
 * Represents the arguments required to create a withdraw rewards operation.
 * @category Types
 */
type CreateWithdrawRewardsCrx = {
  amount: number;
  stakingPool: NectarStaking;
  receiverWallet: web3.PublicKey;
  programId?: web3.PublicKey;
};

/**
 * Creates a withdraw rewards operation to withdraw rewards from the specified staking pool.
 *
 * @category Operation Builder
 * @param honeycomb - The Honeycomb instance to use for creating the operation.
 * @param args - The arguments required to create the withdraw rewards operation.
 * @returns An object containing the created operation.
 *
 * @example
 * // Assuming you have initialized the `honeycomb` instance and imported necessary types
 *
 * const stakingPool = new NectarStaking(honeycomb, "your_staking_pool_address");
 *
 * const withdrawRewardsArgs: CreateWithdrawRewardsCrx = {
 *   amount: 100, // The amount of rewards to withdraw
 *   stakingPool: stakingPool,
 *   receiverWallet: "your_receiver_wallet_address",
 * };
 *
 * const operationResult = await createWithdrawRewardsOperation(honeycomb, withdrawRewardsArgs);
 * console.log("Created withdraw rewards operation:", operationResult.operation);
 */
export async function createWithdrawRewardsOperation(
  honeycomb: Honeycomb,
  args: CreateWithdrawRewardsCrx
) {
  const programId = args.programId || PROGRAM_ID;

  // Get the holder account and token account for the staking pool's currency
  const { holderAccount: vaultHolderAccount, tokenAccount: vaultTokenAccount } =
    holderAccountPdas(
      args.stakingPool.address,
      args.stakingPool.currency().mint.address,
      args.stakingPool.currency().kind
    );

  // Get the holder account and token account for the receiver wallet
  const { holderAccount, tokenAccount } = holderAccountPdas(
    args.receiverWallet,
    args.stakingPool.currency().mint.address,
    args.stakingPool.currency().kind
  );

  // Create the transaction instructions to withdraw rewards
  const instructions: web3.TransactionInstruction[] = [
    web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 400_000,
    }),
    createWithdrawRewardsInstruction(
      {
        project: args.stakingPool.project().address,
        vault: VAULT,
        stakingPool: args.stakingPool.address,
        currency: args.stakingPool.currency().address,
        mint: args.stakingPool.currency().mint.address,
        vaultHolderAccount,
        vaultTokenAccount,
        holderAccount,
        tokenAccount,
        delegateAuthority:
          honeycomb.identity().delegateAuthority()?.address || programId,
        authority:
          honeycomb.identity().delegateAuthority()?.address || programId,
        payer: honeycomb.identity().delegateAuthority()?.address || programId,
        hiveControl: HPL_HIVE_CONTROL_PROGRAM,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
        currencyManagerProgram: HPL_CURRENCY_MANAGER_PROGRAM_ID,
        instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
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
