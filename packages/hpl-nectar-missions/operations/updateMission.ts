import {
  ComputeBudgetProgram,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { Honeycomb, Operation, VAULT } from "@honeycomb-protocol/hive-control";
import {
  UpdateMissionArgs as UpdateMissionArgsSolita,
  PROGRAM_ID,
  createUpdateMissionInstruction,
} from "../generated";
import { NectarMission } from "../NectarMissions";

/**
 * Represents the arguments needed to create a new mission operation.
 * @category Types
 */
type CreateUpdateMissionOperationArgs = {
  /**
   * The arguments for updatinng the mission (defined in UpdateMissionArgsSolita).
   */
  args: UpdateMissionArgsSolita;
  /**
   * The mission to be updated.
   */
  mission: NectarMission;
  /**
   * (Optional) The program ID associated with the mission.
   * If not provided, the default PROGRAM_ID will be used.
   */
  programId?: PublicKey;
};

/**
 * Creates a update mission operation.
 * @category Operation Builder
 * @param honeycomb - An instance of the Honeycomb class.
 * @param args - The arguments for update mission operation.
 * @returns An object containing the operation and the address of the new mission.
 * @example
 * const honeycomb = new Honeycomb(...); // Initialize Honeycomb instance
 * const missionPool = await NectarMissions.fromAddress(honeycomb.connection, missionPoolAddress);
 * const args: UpdateMissionArgsSolita = {
 *   name: "Renamed",
 * };
 * const updateMissionArgs: CreateUpdateMissionOperationArgs = {
 *   args,
 *   mission,
 *   programId: myCustomProgramId // (Optional) Provide a custom program ID if needed
 * };
 * const { operation } = createUpdateMissionOperation(honeycomb, updateMissionArgs);
 * // Execute the transaction to create the mission
 * await operation.send(confirmOptions);
 */
export async function createUpdateMissionOperation(
  honeycomb: Honeycomb,
  args: CreateUpdateMissionOperationArgs
) {
  const programId = args.programId || PROGRAM_ID;

  const instructions = [
    ComputeBudgetProgram.setComputeUnitLimit({
      units: 400_000,
    }),
    createUpdateMissionInstruction(
      {
        project: args.mission.pool().project().address,
        missionPool: args.mission.pool().address,
        mission: args.mission.address,
        delegateAuthority:
          honeycomb.identity().delegateAuthority()?.address || programId,
        authority: honeycomb.identity().address,
        payer: honeycomb.identity().address,
        vault: VAULT,
        rentSysvar: SYSVAR_RENT_PUBKEY,
        instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
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
