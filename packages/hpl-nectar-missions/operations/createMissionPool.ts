import { PublicKey, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import {
  HIVECONTROL_PROGRAM_ID,
  Honeycomb,
  HoneycombProject,
  Operation,
  VAULT,
} from "@honeycomb-protocol/hive-control";
import {
  CreateMissionPoolArgs,
  PROGRAM_ID,
  createCreateMissionPoolInstruction,
} from "../generated";
import { missionPoolPda } from "../utils";
import { createUpdateMissionPoolOperation } from "./updateMissionPool";

type CreateCreateMissionPoolOperationArgs = {
  args: CreateMissionPoolArgs & {
    collections?: PublicKey[];
    creators?: PublicKey[];
  };
  project: HoneycombProject;
  programId?: PublicKey;
};
export async function createCreateMissionPoolOperation(
  honeycomb: Honeycomb,
  args: CreateCreateMissionPoolOperationArgs
) {
  const programId = args.programId || PROGRAM_ID;

  const [missionPool] = missionPoolPda(
    args.project.address,
    args.args.name,
    programId
  );

  const instructions = [
    createCreateMissionPoolInstruction(
      {
        project: args.project.address,
        missionPool,
        delegateAuthority:
          honeycomb.identity().delegateAuthority()?.address || programId,
        authority: honeycomb.identity().address,
        payer: honeycomb.identity().address,
        vault: VAULT,
        rentSysvar: SYSVAR_RENT_PUBKEY,
        hiveControl: HIVECONTROL_PROGRAM_ID,
      },
      {
        args: args.args,
      },
      programId
    ),
  ];

  if (args.args.collections?.length) {
    await Promise.all(
      args.args.collections.map((collection) =>
        createUpdateMissionPoolOperation(honeycomb, {
          args: {
            factionsMerkleRoot: null,
          },
          project: args.project.address,
          missionPool,
          collection,
          programId,
        }).then(({ operation }) => instructions.push(...operation.instructions))
      )
    );
  }

  if (args.args.creators?.length) {
    await Promise.all(
      args.args.creators.map((creator) =>
        createUpdateMissionPoolOperation(honeycomb, {
          args: {
            factionsMerkleRoot: null,
          },
          project: args.project.address,
          missionPool,
          creator,
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
