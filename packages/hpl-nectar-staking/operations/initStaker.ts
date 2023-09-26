import * as web3 from "@solana/web3.js";
import { createInitStakerInstruction, PROGRAM_ID } from "../generated";
import { getStakerPda } from "../pdas";
import { VAULT, Operation, Honeycomb } from "@honeycomb-protocol/hive-control";
import { NectarStaking } from "../NectarStaking";
import { HPL_EVENTS_PROGRAM } from "@honeycomb-protocol/events";

/**
 * Represents the arguments required to create an initialization staker operation.
 * @category Types
 */
type CreateInitStakerOperationArgs = {
  stakingPool: NectarStaking;
  programId?: web3.PublicKey;
};

/**
 * Creates an initialization staker operation.
 * This operation initializes a staker for a staking pool.
 *
 * @category Operation Builder
 * @param honeycomb - The Honeycomb instance to use for creating the operation.
 * @param args - The arguments required to create the initialization staker operation.
 * @returns An object containing the created operation.
 *
 * @example
 * // Assuming you have initialized the `honeycomb` instance and imported necessary types
 *
 * const stakingPool = new NectarStaking(honeycomb, "your_staking_pool_address");
 *
 * const createInitArgs: CreateInitStakerOperationArgs = {
 *   stakingPool,
 * };
 *
 * const operationResult = await createInitStakerOperation(honeycomb, createInitArgs);
 * console.log("Created operation:", operationResult.operation);
 */
export function createInitStakerOperation(
  honeycomb: Honeycomb,
  args: CreateInitStakerOperationArgs
) {
  const programId = args.programId || PROGRAM_ID;

  // Get the PDA account for the staker
  const [staker] = getStakerPda(
    args.stakingPool.address,
    honeycomb.identity().address,
    programId
  );

  // Create the transaction instruction for initializing the staker
  const instructions: web3.TransactionInstruction[] = [
    createInitStakerInstruction(
      {
        project: args.stakingPool.project().address,
        vault: VAULT,
        stakingPool: args.stakingPool.address,
        staker,
        wallet: honeycomb.identity().address,
        hplEvents: HPL_EVENTS_PROGRAM,
        clock: web3.SYSVAR_CLOCK_PUBKEY,
        instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      },
      programId
    ),
  ];

  // Return the operation as an object
  return {
    operation: new Operation(honeycomb, instructions),
  };
}
