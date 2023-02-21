import * as web3 from "@solana/web3.js";
import {
  UpdateStakingProjectArgs,
  createUpdateStakingProjectInstruction,
  PROGRAM_ID,
} from "../generated";
import { Metaplex } from "@metaplex-foundation/js";
import { VAULT } from "@honeycomb-protocol/hive-control";
import { createCtx } from "../utils";

type UpdateProjectArgs = {
  metaplex: Metaplex;
  project: web3.PublicKey;
  stakingProject: web3.PublicKey;
  args: UpdateStakingProjectArgs;
  collection?: web3.PublicKey;
  creator?: web3.PublicKey;
  delegateAuthority?: web3.PublicKey;
  programId?: web3.PublicKey;
};

type CreateUpdateProjectCtxArgs = {
  project: web3.PublicKey;
  stakingProject: web3.PublicKey;
  authority: web3.PublicKey;
  payer: web3.PublicKey;
  args: UpdateStakingProjectArgs;
  collection?: web3.PublicKey;
  creator?: web3.PublicKey;
  delegateAuthority?: web3.PublicKey;
  programId?: web3.PublicKey;
};

export function createUpdateProjectCtx(args: CreateUpdateProjectCtxArgs) {
  const programId = args.programId || PROGRAM_ID;

  const instructions: web3.TransactionInstruction[] = [
    createUpdateStakingProjectInstruction(
      {
        project: args.project,
        vault: VAULT,
        stakingProject: args.stakingProject,
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

export async function updateProject({
  metaplex: mx,
  ...args
}: UpdateProjectArgs) {
  const wallet = mx.identity();
  const ctx = createUpdateProjectCtx({
    project: args.project,
    stakingProject: args.stakingProject,
    authority: wallet.publicKey,
    payer: wallet.publicKey,
    args: args.args,
    collection: args.collection,
    creator: args.creator,
    delegateAuthority: args.delegateAuthority,
    programId: args.programId,
  });

  ctx.tx.recentBlockhash = await mx.connection
    .getLatestBlockhash()
    .then((x) => x.blockhash);
  return {
    response: await mx
      .rpc()
      .sendAndConfirmTransaction(ctx.tx, { skipPreflight: true }, ctx.signers),
  };
}
