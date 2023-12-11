import {
  ComputeBudgetProgram,
  PublicKey,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  HPL_HIVE_CONTROL_PROGRAM,
  Honeycomb,
  Operation,
  VAULT,
} from "@honeycomb-protocol/hive-control";
import {
  CreateMissionArgs as CreateMissionArgsSolita,
  PROGRAM_ID,
  createCreateMissionInstruction,
} from "../../generated";
import { missionPda } from "../../utils";
import { NectarMissions } from "../../NectarMissions";

/**
 * Represents the arguments needed to create a new mission operation.
 * @category Types
 */
type CreateCreateMissionOperationArgs = {
  /**
   * The arguments for creating the mission (defined in CreateMissionArgsSolita).
   */
  args: CreateMissionArgsSolita;
  /**
   * The mission pool where the new mission will be created.
   */
  missionPool: NectarMissions;
  /**
   * (Optional) The program ID associated with the mission.
   * If not provided, the default PROGRAM_ID will be used.
   */
  programId?: PublicKey;
};

/**
 * Creates a new mission operation.
 * @category Operation Builder
 * @param honeycomb - An instance of the Honeycomb class.
 * @param args - The arguments for creating the mission operation.
 * @returns An object containing the operation and the address of the new mission.
 * @example
 * const honeycomb = new Honeycomb(...); // Initialize Honeycomb instance
 * const missionPool = await NectarMissions.fromAddress(honeycomb.connection, missionPoolAddress);
 * const args: CreateMissionArgsSolita = {
 *   name: "Mission 1",
 *   minXp: 100,
 *   cost: {
 *     amount: 1000,
 *     address: "..."
 *   },
 *   duration: 3600, // 1 hour (in seconds)
 *   rewards: [...],
 *   ...
 * };
 * const createMissionArgs: CreateCreateMissionOperationArgs = {
 *   args,
 *   missionPool,
 *   programId: myCustomProgramId // (Optional) Provide a custom program ID if needed
 * };
 * const { operation, mission } = createCreateMissionOperation(honeycomb, createMissionArgs);
 * // Execute the transaction to create the mission
 * await operation.send(confirmOptions);
 */
export async function createCreateMissionOperation(
  honeycomb: Honeycomb,
  args: CreateCreateMissionOperationArgs
) {
  const programId = args.programId || PROGRAM_ID;

  const [mission] = missionPda(
    args.missionPool.address,
    args.args.name,
    programId
  );

  const instructions = [
    ComputeBudgetProgram.setComputeUnitLimit({
      units: 400_000,
    }),
    createCreateMissionInstruction(
      {
        project: args.missionPool.project().address,
        missionPool: args.missionPool.address,
        mission,
        delegateAuthority:
          honeycomb.identity().delegateAuthority()?.address || programId,
        authority: honeycomb.identity().address,
        payer: honeycomb.identity().address,
        vault: VAULT,
        hiveControl: HPL_HIVE_CONTROL_PROGRAM,
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
    mission,
  };
}
