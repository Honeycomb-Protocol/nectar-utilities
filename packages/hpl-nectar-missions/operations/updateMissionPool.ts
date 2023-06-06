import { PublicKey } from "@solana/web3.js";
import {
  Honeycomb,
  Operation,
  VAULT,
} from "@honeycomb-protocol/hive-control";
import {
  UpdateMissionPoolArgs as UpdateMissionPoolArgsSolita,
  PROGRAM_ID,
  createUpdateMissionPoolInstruction,
} from "../generated";
import { NectarMissions } from "../NectarMissions";

type CreateUpdateMissionPoolCtxArgs = {
  args: UpdateMissionPoolArgsSolita;
  missionPool: NectarMissions;
  collection?: PublicKey;
  creator?: PublicKey;
  programId?: PublicKey;
};
export async function createUpdateMissionPoolOperation(honeycomb:Honeycomb,
  args: CreateUpdateMissionPoolCtxArgs
) {
  const programId = args.programId || PROGRAM_ID;

  const instructions = [
    createUpdateMissionPoolInstruction(
      {
        project: args.missionPool.project().address,
        missionPool: args.missionPool.address,
        collection: args.collection || programId,
        creator: args.creator || programId,
        delegateAuthority: honeycomb.identity().delegateAuthority()?.address || programId,
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
