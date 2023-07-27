import { ComputeBudgetProgram, PublicKey } from "@solana/web3.js";
import { Honeycomb, Operation, VAULT } from "@honeycomb-protocol/hive-control";
import {
  UpdateMissionPoolArgs as UpdateMissionPoolArgsSolita,
  PROGRAM_ID,
  createUpdateMissionPoolInstruction,
} from "../generated";

/**
 * Represents the arguments needed to create an update mission pool operation.
 * @category Types
 */
type CreateUpdateMissionPoolOperationArgs = {
  /**
   * The update mission pool arguments.
   */
  args: UpdateMissionPoolArgsSolita;
  /**
   * The project public key associated with the mission pool.
   */
  project: PublicKey;
  /**
   * The mission pool public key to be updated.
   */
  missionPool: PublicKey;
  /**
   * (Optional) The collection public key associated with the mission pool.
   * If not provided, the default programId will be used.
   */
  collection?: PublicKey;
  /**
   * (Optional) The creator public key associated with the mission pool.
   * If not provided, the default programId will be used.
   */
  creator?: PublicKey;
  /**
   * (Optional) The program ID associated with the update mission pool operation.
   * If not provided, the default PROGRAM_ID will be used.
   */
  programId?: PublicKey;
};

/**
 * Creates a new update mission pool operation for a given mission pool.
 * @category Operation Builder
 * @param honeycomb - An instance of the Honeycomb class.
 * @param args - The arguments for updating the mission pool.
 * @returns An object containing the update mission pool operation.
 * @example
 * const honeycomb = new Honeycomb(...); // Initialize Honeycomb instance
 * const missionPoolAddress = ...; // Mission pool address to be updated
 * const updateArgs = {
 *   // Provide the update mission pool arguments
 * };
 * const createUpdateMissionPoolArgs: CreateUpdateMissionPoolOperationArgs = {
 *   args: updateArgs,
 *   project: myProjectPublicKey,
 *   missionPool: missionPoolAddress,
 *   collection: myCollectionPublicKey, // (Optional) Provide a custom collection public key if needed
 *   creator: myCreatorPublicKey, // (Optional) Provide a custom creator public key if needed
 *   programId: myCustomProgramId, // (Optional) Provide a custom program ID if needed
 * };
 * const { operation } = createUpdateMissionPoolOperation(honeycomb, createUpdateMissionPoolArgs);
 * // Execute the update mission pool transaction
 * await operation.send(confirmOptions);
 */
export async function createUpdateMissionPoolOperation(
  honeycomb: Honeycomb,
  args: CreateUpdateMissionPoolOperationArgs
) {
  const programId = args.programId || PROGRAM_ID;

  const instructions = [
    ComputeBudgetProgram.setComputeUnitLimit({
      units: 400_000,
    }),
    createUpdateMissionPoolInstruction(
      {
        project: args.project,
        missionPool: args.missionPool,
        collection: args.collection || programId,
        creator: args.creator || programId,
        delegateAuthority:
          honeycomb.identity().delegateAuthority()?.address || programId,
        authority: honeycomb.identity().address,
        payer: honeycomb.identity().address,
        vault: VAULT,
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
