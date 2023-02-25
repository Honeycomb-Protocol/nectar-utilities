import * as web3 from "@solana/web3.js";
import {
  UpdateStakingPoolArgs,
  createUpdateStakingPoolInstruction,
  PROGRAM_ID,
} from "../generated";
import { VAULT, createCtx, Honeycomb } from "@honeycomb-protocol/hive-control";

type CreateUpdatePoolCtxArgs = {
  project: web3.PublicKey;
  stakingPool: web3.PublicKey;
  authority: web3.PublicKey;
  payer: web3.PublicKey;
  args: UpdateStakingPoolArgs;
  collection?: web3.PublicKey;
  creator?: web3.PublicKey;
  delegateAuthority?: web3.PublicKey;
  programId?: web3.PublicKey;
};
export function createUpdatePoolCtx(args: CreateUpdatePoolCtxArgs) {
  const programId = args.programId || PROGRAM_ID;

  const instructions: web3.TransactionInstruction[] = [
    createUpdateStakingPoolInstruction(
      {
        project: args.project,
        vault: VAULT,
        stakingPool: args.stakingPool,
        collection: args.collection || programId,
        creator: args.creator || programId,
        authority: args.authority,
        payer: args.payer,
        delegateAuthority: args.delegateAuthority || programId,
      },
      {
        args: args.args,
      },
      programId
    ),
  ];

  return createCtx(instructions);
}

type UpdatePoolArgs = {
  args: UpdateStakingPoolArgs;
  collection?: web3.PublicKey;
  creator?: web3.PublicKey;
  programId?: web3.PublicKey;
};
export async function updateStakingPool(
  honeycomb: Honeycomb,
  args: UpdatePoolArgs
) {
  const wallet = honeycomb.identity();
  const ctx = createUpdatePoolCtx({
    project: honeycomb.projectAddress,
    stakingPool: honeycomb.staking().poolAddress,
    authority: wallet.publicKey,
    payer: wallet.publicKey,
    args: args.args,
    collection: args.collection,
    creator: args.creator,
    delegateAuthority: wallet.getDelegateAuthority().delegateAuthorityAddress,
    programId: args.programId,
  });

  return honeycomb
    .rpc()
    .sendAndConfirmTransaction(ctx, { skipPreflight: true });
}
