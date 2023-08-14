import * as web3 from "@solana/web3.js";
import {
  UpdateStakingPoolArgs,
  createUpdateStakingPoolInstruction,
  PROGRAM_ID,
} from "../generated";
import { Honeycomb, VAULT, Operation } from "@honeycomb-protocol/hive-control";

/**
 * Represents the arguments required to create an update pool operation.
 * @category Types
 */
type CreateUpdatePoolCtxArgs = {
  args: UpdateStakingPoolArgs;
  project: web3.PublicKey;
  stakingPool: web3.PublicKey;
  collection?: web3.PublicKey;
  creator?: web3.PublicKey;
  merkleTree?: web3.PublicKey;
  currency?: web3.PublicKey;
  programId?: web3.PublicKey;
};

/**
 * Creates an update pool operation to update the specified staking pool.
 *
 * @category Operation Builder
 * @param honeycomb - The Honeycomb instance to use for creating the operation.
 * @param args - The arguments required to create the update pool operation.
 * @returns An object containing the created operation.
 *
 * @example
 * // Assuming you have initialized the `honeycomb` instance and imported necessary types
 *
 * const stakingPool = new NectarStaking(honeycomb, "your_staking_pool_address");
 *
 * // Assuming you have an initialized `UpdateStakingPoolArgs` object `updateArgs`
 *
 * const createUpdatePoolArgs: CreateUpdatePoolCtxArgs = {
 *   args: updateArgs,
 *   project: "your_project_address",
 *   stakingPool: "your_staking_pool_address",
 * };
 *
 * const operationResult = await createUpdatePoolOperation(honeycomb, createUpdatePoolArgs);
 * console.log("Created update pool operation:", operationResult.operation);
 */
export async function createUpdatePoolOperation(
  honeycomb: Honeycomb,
  args: CreateUpdatePoolCtxArgs
) {
  const programId = args.programId || PROGRAM_ID;

  // Create the transaction instruction to update the staking pool
  const instructions: web3.TransactionInstruction[] = [
    createUpdateStakingPoolInstruction(
      {
        project: args.project,
        vault: VAULT,
        stakingPool: args.stakingPool,
        collection: args.collection || programId,
        creator: args.creator || programId,
        merkleTree: args.merkleTree || programId,
        currency: args.currency || programId,
        authority: honeycomb.identity().address,
        payer: honeycomb.identity().address,
        delegateAuthority:
          honeycomb.identity().delegateAuthority()?.address || programId,
        instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      },
      {
        args: args.args,
      },
      programId
    ),
  ];

  return {
    operation: new Operation(honeycomb, instructions),
  };
}
