import {
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  CurrencyManagerPermission,
  HPL_HIVE_CONTROL_PROGRAM,
  Honeycomb,
  Operation,
  VAULT,
  createCreateDelegateAuthorityOperation,
} from "@honeycomb-protocol/hive-control";
import {
  CreateMissionPoolArgs,
  PROGRAM_ID,
  createCreateMissionPoolInstruction,
} from "../../generated";
import { createUpdateMissionPoolOperation } from "./updateMissionPool";
import { HPL_EVENTS_PROGRAM } from "@honeycomb-protocol/events";

/**
 * Represents the arguments needed to create a new mission pool operation.
 * @category Types
 */
type CreateCreateMissionPoolOperationArgs = {
  /**
   * The arguments for creating the mission pool (defined in CreateMissionPoolArgs).
   * You can provide additional fields like collections and creators.
   */
  args: CreateMissionPoolArgs & {
    stakingPools?: PublicKey[];
    guildKits?: PublicKey[];
  };
  /**
   * The HoneycombProject where the new mission pool will be created.
   */
  project: PublicKey;
  /**
   * (Optional) The program ID associated with the mission pool.
   * If not provided, the default PROGRAM_ID will be used.
   */
  programId?: PublicKey;
};

/**
 * Creates a new mission pool operation.
 * @category Operation Builder
 * @param honeycomb - An instance of the Honeycomb class.
 * @param args - The arguments for creating the mission pool operation.
 * @returns An object containing the operation and the address of the new mission pool.
 * @example
 * const honeycomb = new Honeycomb(...); // Initialize Honeycomb instance
 * const project = await honeycomb.project(projectAddress);
 * const args: CreateMissionPoolArgs = {
 *   name: "Mission Pool 1",
 *   description: "This is a mission pool.",
 *   ...
 *   // Add other required fields for CreateMissionPoolArgs
 *   collections: [collectionPublicKey1, collectionPublicKey2],
 *   creators: [creatorPublicKey1, creatorPublicKey2],
 * };
 * const createMissionPoolArgs: CreateCreateMissionPoolOperationArgs = {
 *   args,
 *   project,
 *   programId: myCustomProgramId, // (Optional) Provide a custom program ID if needed
 * };
 * const { operation, missionPool } = createCreateMissionPoolOperation(honeycomb, createMissionPoolArgs);
 * // Execute the transaction to create the mission pool
 * await operation.send(confirmOptions);
 */
export async function createCreateMissionPoolOperation(
  honeycomb: Honeycomb,
  args: CreateCreateMissionPoolOperationArgs
) {
  const programId = args.programId || PROGRAM_ID;

  const [missionPool] = honeycomb
    .pda()
    .missions()
    .pool(args.project, args.args.name, programId);

  const instructions = [
    createCreateMissionPoolInstruction(
      {
        project: args.project,
        missionPool,
        delegateAuthority:
          honeycomb.identity().delegateAuthority()?.address || programId,
        authority: honeycomb.identity().address,
        payer: honeycomb.identity().address,
        vault: VAULT,
        hiveControl: HPL_HIVE_CONTROL_PROGRAM,
        hplEvents: HPL_EVENTS_PROGRAM,
        clockSysvar: SYSVAR_CLOCK_PUBKEY,
        rentSysvar: SYSVAR_RENT_PUBKEY,
        instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
      },
      {
        args: args.args,
      },
      programId
    ),
  ];

  await createCreateDelegateAuthorityOperation(honeycomb, {
    args: {
      delegations: [
        {
          __kind: "CurrencyManager",
          permission: CurrencyManagerPermission.MintCurrencies,
        },
      ],
    },
    delegate: missionPool,
    project: args.project,
  }).then(({ operation }) => instructions.push(...operation.instructions));

  const stakingPools = args.args.stakingPools || [];
  const guildKits = args.args.guildKits || [];
  const maxLength = Math.max(stakingPools.length, guildKits.length);

  if (maxLength > 0) {
    await Promise.all(
      Array.from({ length: maxLength }, (_, index) =>
        createUpdateMissionPoolOperation(honeycomb, {
          args: {
            factionsMerkleRoot: null,
          },
          project: args.project,
          missionPool,
          stakingPool: stakingPools[index],
          guildKit: guildKits[index],
          programId,
        }).then(({ operation }) => instructions.push(...operation.instructions))
      )
    );
  }

  return {
    operation: new Operation(honeycomb, instructions),
    missionPool,
  };
}
