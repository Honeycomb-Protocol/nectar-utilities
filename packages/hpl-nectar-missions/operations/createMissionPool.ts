import { PublicKey, SYSVAR_RENT_PUBKEY } from "@solana/web3.js";
import {
  ConfirmedContext,
  HIVECONTROL_PROGRAM_ID,
  Honeycomb,
  OperationCtx,
  VAULT,
  createCtx,
} from "@honeycomb-protocol/hive-control";
import {
  CreateMissionPoolArgs as CreateMissionPoolArgsSolita,
  PROGRAM_ID,
  createCreateMissionPoolInstruction,
} from "../generated";
import { missionPoolPda } from "../utils";
import { createUpdateMissionPoolCtx } from "./updateMissionPool";

type CreateCreateMissionPoolCtxArgs = {
  args: CreateMissionPoolArgsSolita & {
    collections?: PublicKey[];
    creators?: PublicKey[];
  };
  project: PublicKey;
  delegateAuthority?: PublicKey;
  authority: PublicKey;
  payer: PublicKey;
  programId?: PublicKey;
};
export function createCreateMissionPoolCtx(
  args: CreateCreateMissionPoolCtxArgs
): OperationCtx & { poolId: PublicKey } {
  const programId = args.programId || PROGRAM_ID;

  const [missionPool] = missionPoolPda(args.project, args.args.name, programId);

  const instructions = [
    createCreateMissionPoolInstruction(
      {
        project: args.project,
        missionPool,
        delegateAuthority: args.delegateAuthority || programId,
        authority: args.authority,
        payer: args.payer,
        vault: VAULT,
        rentSysvar: SYSVAR_RENT_PUBKEY,
        hiveControl: HIVECONTROL_PROGRAM_ID,
      },
      {
        args: args.args,
      },
      programId
    ),

    ...(args.args.collections || []).flatMap((collection) => {
      return createUpdateMissionPoolCtx({
        args: {
          factionsMerkleRoot: null,
        },
        project: args.project,
        missionPool,
        collection,
        creator: programId,
        delegateAuthority: args.delegateAuthority || programId,
        authority: args.authority,
        payer: args.payer,
        programId,
      }).tx.instructions;
    }),

    ...(args.args.creators || []).flatMap((creator) => {
      return createUpdateMissionPoolCtx({
        args: {
          factionsMerkleRoot: null,
        },
        project: args.project,
        missionPool,
        collection: programId,
        creator,
        delegateAuthority: args.delegateAuthority || programId,
        authority: args.authority,
        payer: args.payer,
        programId,
      }).tx.instructions;
    }),
  ];

  return {
    ...createCtx(instructions),
    poolId: missionPool,
  };
}

type CreateMissionPoolArgs = {
  args: CreateMissionPoolArgsSolita & {
    collections?: PublicKey[];
    creators?: PublicKey[];
  };
  project?: PublicKey;
  programId?: PublicKey;
};
export async function createMissionPool(
  honeycomb: Honeycomb,
  args: CreateMissionPoolArgs
): Promise<ConfirmedContext & { poolId: PublicKey }> {
  const ctx = createCreateMissionPoolCtx({
    args: args.args,
    project: args.project || honeycomb.project().address,
    delegateAuthority: honeycomb.identity().delegateAuthority().address,
    authority: honeycomb.identity().publicKey,
    payer: honeycomb.identity().publicKey,
    programId: args.programId,
  });

  return {
    ...(await honeycomb.rpc().sendAndConfirmTransaction(ctx)),
    poolId: ctx.poolId,
  };
}
