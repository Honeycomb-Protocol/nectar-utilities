import { PublicKey } from "@solana/web3.js";
import { Honeycomb, Operation, VAULT } from "@honeycomb-protocol/hive-control";
import {
  UpdateMissionPoolArgs as UpdateMissionPoolArgsSolita,
  PROGRAM_ID,
  createUpdateMissionPoolInstruction,
} from "../generated";

type CreateUpdateMissionPoolOperationArgs = {
  args: UpdateMissionPoolArgsSolita;
  project: PublicKey;
  missionPool: PublicKey;
  collection?: PublicKey;
  creator?: PublicKey;
  programId?: PublicKey;
};
export async function createUpdateMissionPoolOperation(
  honeycomb: Honeycomb,
  args: CreateUpdateMissionPoolOperationArgs
) {
  const programId = args.programId || PROGRAM_ID;

  const instructions = [
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
