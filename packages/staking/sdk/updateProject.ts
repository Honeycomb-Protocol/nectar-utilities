import * as web3 from "@solana/web3.js";
import {
  UpdateProjectArgs as UpdateStakingProjectArgs,
  createUpdateProjectInstruction,
  PROGRAM_ID,
} from "../generated";
import { TxSignersAccounts } from "../types";
import { Metaplex } from "@metaplex-foundation/js";

export function createUpdateProjectCtx(
  project: web3.PublicKey,
  authority: web3.PublicKey,
  args: UpdateStakingProjectArgs,
  collection?: web3.PublicKey,
  creator?: web3.PublicKey,
  programId: web3.PublicKey = PROGRAM_ID
): TxSignersAccounts & { project: web3.PublicKey } {
  const instructions: web3.TransactionInstruction[] = [
    createUpdateProjectInstruction(
      {
        project,
        collection: collection || programId,
        creator: creator || programId,
        authority,
        newAuthority: programId,
      },
      {
        args,
      }
    ),
  ];

  return {
    tx: new web3.Transaction().add(...instructions),
    signers: [],
    accounts: instructions.flatMap((i) => i.keys.map((k) => k.pubkey)),
    project,
  };
}

type UpdateProjectArgs = {
  metaplex: Metaplex;
  project: web3.PublicKey;
  args: UpdateStakingProjectArgs;
  collection?: web3.PublicKey;
  creator?: web3.PublicKey;
  programId?: web3.PublicKey;
};

export async function updateProject({
  metaplex: mx,
  ...args
}: UpdateProjectArgs) {
  const wallet = mx.identity();
  const ctx = createUpdateProjectCtx(
    args.project,
    wallet.publicKey,
    args.args,
    args.collection,
    args.creator,
    args.programId
  );

  const blockhash = await mx.connection.getLatestBlockhash();

  ctx.tx.recentBlockhash = blockhash.blockhash;

  const response = await mx
    .rpc()
    .sendAndConfirmTransaction(ctx.tx, { skipPreflight: true }, ctx.signers);

  return {
    response,
    project: ctx.project,
  };
}
