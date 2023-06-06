import { PublicKey, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import {
  ConfirmedContext,
  Honeycomb,
  OperationCtx,
  VAULT,
  createCtx,
} from "@honeycomb-protocol/hive-control";
import {
  CreateMissionArgs as CreateMissionArgsSolita,
  PROGRAM_ID,
  createCreateMissionInstruction,
} from "../generated";
import { missionPda } from "../utils";

type CreateCreateMissionCtxArgs = {
  args: CreateMissionArgsSolita;
  project: PublicKey;
  missionPool: PublicKey;
  delegateAuthority?: PublicKey;
  authority: PublicKey;
  payer: PublicKey;
  programId?: PublicKey;
};
export function createCreateMissionCtx(
  args: CreateCreateMissionCtxArgs
): OperationCtx & { mission: PublicKey } {
  const programId = args.programId || PROGRAM_ID;

  const [mission] = missionPda(args.missionPool, args.args.name, programId);

  const instructions = [
    createCreateMissionInstruction(
      {
        project: args.project,
        missionPool: args.missionPool,
        mission,
        delegateAuthority: args.delegateAuthority || programId,
        authority: args.authority,
        payer: args.payer,
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
    ...createCtx(instructions),
    mission,
  };
}

type CreateMissionArgs = {
  args: CreateMissionArgsSolita;
  project?: PublicKey;
  missionPool?: PublicKey;
  programId?: PublicKey;
};
export async function createMission(
  honeycomb: Honeycomb,
  args: CreateMissionArgs
): Promise<ConfirmedContext & { mission: PublicKey }> {
  const ctx = createCreateMissionCtx({
    args: args.args,
    project: args.project || honeycomb.missions().project().address,
    missionPool: args.missionPool || honeycomb.missions().address,
    delegateAuthority: honeycomb.identity().delegateAuthority().address,
    authority: honeycomb.identity().address,
    payer: honeycomb.identity().address,
    programId: args.programId,
  });

  return {
    ...(await honeycomb.rpc().sendAndConfirmTransaction(ctx)),
    mission: ctx.mission,
  };
}
