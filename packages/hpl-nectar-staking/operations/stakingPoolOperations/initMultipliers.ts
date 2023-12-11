import * as web3 from "@solana/web3.js";
import {
  createInitMultipliersInstruction,
  InitMultipliersArgs,
  PROGRAM_ID,
} from "../../generated";
import {
  VAULT,
  Honeycomb,
  Operation,
  HPL_HIVE_CONTROL_PROGRAM,
} from "@honeycomb-protocol/hive-control";

/**
 * Represents the arguments required to create an initialization multiplier operation.
 * @category Types
 */
type CreateInitMultiplierOperationArgs = {
  args: InitMultipliersArgs;
  project: web3.PublicKey;
  stakingPool: web3.PublicKey;
  programId?: web3.PublicKey;
};

/**
 * Creates an initialization multiplier operation.
 * This operation initializes the multipliers for a staking pool.
 *
 * @category Operation Builder
 * @param honeycomb - The Honeycomb instance to use for creating the operation.
 * @param args - The arguments required to create the initialization multiplier operation.
 * @returns An object containing the created operation.
 *
 * @example
 * // Assuming you have initialized the `honeycomb` instance and imported necessary types
 *
 * const initMultipliersArgs: InitMultipliersArgs = {
 *   durationMultipliers: [...],
 *   countMultipliers: [...],
 *   creatorMultipliers: [...],
 *   collectionMultipliers: [...],
 * };
 *
 * const stakingPool = new web3.PublicKey("your_staking_pool_address");
 * const project = new web3.PublicKey("your_project_address");
 *
 * const createInitArgs: CreateInitMultiplierOperationArgs = {
 *   args: initMultipliersArgs,
 *   stakingPool,
 *   project,
 * };
 *
 * const operationResult = await createInitMultiplierOperation(honeycomb, createInitArgs);
 * console.log("Created operation:", operationResult.operation);
 */
export async function createInitMultiplierOperation(
  honeycomb: Honeycomb,
  args: CreateInitMultiplierOperationArgs
) {
  const programId = args.programId || PROGRAM_ID;

  // Get the multipliers for the staking pool
  const [multipliers] = honeycomb
    .pda()
    .staking()
    .multipliers(args.stakingPool, programId);

  // Create the transaction instruction for initializing multipliers
  const instructions: web3.TransactionInstruction[] = [
    createInitMultipliersInstruction(
      {
        project: args.project,
        vault: VAULT,
        stakingPool: args.stakingPool,
        multipliers,
        authority: honeycomb.identity().address,
        payer: honeycomb.identity().address,
        delegateAuthority:
          honeycomb.identity().delegateAuthority()?.address || programId,
        hiveControl: HPL_HIVE_CONTROL_PROGRAM,
        instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      },
      { args: args.args },
      programId
    ),
  ];

  // Return the operation as an object
  return {
    operation: new Operation(honeycomb, instructions),
  };
}
