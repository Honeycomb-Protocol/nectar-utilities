import { PublicKey } from "@solana/web3.js";
import {
  ConfirmedContext,
  Honeycomb,
  OperationCtx,
  VAULT,
  createCtx,
} from "@honeycomb-protocol/hive-control";
import {
  UpdateMissionPoolArgs as UpdateMissionPoolArgsSolita,
  PROGRAM_ID,
  createUpdateMissionPoolInstruction,
} from "../generated";

type CreateUpdateMissionPoolCtxArgs = {
  args: UpdateMissionPoolArgsSolita;
  project: PublicKey;
  missionPool: PublicKey;
  collection?: PublicKey;
  creator?: PublicKey;
  delegateAuthority?: PublicKey;
  authority: PublicKey;
  payer: PublicKey;
  programId?: PublicKey;
};
export function createUpdateMissionPoolCtx(
  args: CreateUpdateMissionPoolCtxArgs
): OperationCtx {
  const programId = args.programId || PROGRAM_ID;

  const instructions = [
    createUpdateMissionPoolInstruction(
      {
        project: args.project,
        missionPool: args.missionPool,
        collection: args.collection || programId,
        creator: args.creator || programId,
        delegateAuthority: args.delegateAuthority || programId,
        authority: args.authority,
        payer: args.payer,
        vault: VAULT,
      },
      {
        args: args.args,
      },
      programId
    ),
  ];

  return createCtx(instructions);
}

type UpdateMissionPoolArgs = {
  args: UpdateMissionPoolArgsSolita;
  project?: PublicKey;
  missionPool?: PublicKey;
  collection?: PublicKey;
  creator?: PublicKey;
  programId?: PublicKey;
};
export async function updateMissionPool(
  honeycomb: Honeycomb,
  args: UpdateMissionPoolArgs
): Promise<ConfirmedContext> {
  const ctx = createUpdateMissionPoolCtx({
    args: args.args,
    project: args.project || honeycomb.project().address,
    missionPool: args.missionPool || honeycomb.missions().address,
    collection: args.collection,
    creator: args.creator,
    delegateAuthority: honeycomb.identity().delegateAuthority().address,
    authority: honeycomb.identity().publicKey,
    payer: honeycomb.identity().publicKey,
    programId: args.programId,
  });

  return honeycomb.rpc().sendAndConfirmTransaction(ctx);
}
