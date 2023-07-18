import {
  ComputeBudgetProgram,
  PublicKey,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { Honeycomb, Operation, VAULT } from "@honeycomb-protocol/hive-control";
import {
  CreateMissionArgs as CreateMissionArgsSolita,
  PROGRAM_ID,
  createCreateMissionInstruction,
} from "../generated";
import { missionPda } from "../utils";
import { NectarMissions } from "../NectarMissions";

type CreateCreateMissionCtxArgs = {
  args: CreateMissionArgsSolita;
  missionPool: NectarMissions;
  programId?: PublicKey;
};
export async function createCreateMissionOperation(
  honeycomb: Honeycomb,
  args: CreateCreateMissionCtxArgs
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
        rentSysvar: SYSVAR_RENT_PUBKEY,
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
