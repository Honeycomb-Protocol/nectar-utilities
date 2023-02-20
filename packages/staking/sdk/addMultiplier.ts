import * as web3 from "@solana/web3.js";
import {
  createAddMultiplierInstruction,
  AddMultiplierArgs,
  PROGRAM_ID,
} from "../generated";
import { TxSignersAccounts } from "../types";
import { Metaplex } from "@metaplex-foundation/js";
import { getMultipliersPda } from "../pdas";

export function createAddMultiplierCtx(
  project: web3.PublicKey,
  authority: web3.PublicKey,
  payer: web3.PublicKey,
  args: AddMultiplierArgs,
  programId: web3.PublicKey = PROGRAM_ID
): TxSignersAccounts {
  const [multipliers] = getMultipliersPda(project, programId);

  const instructions: web3.TransactionInstruction[] = [
    createAddMultiplierInstruction(
      {
        project,
        multipliers,
        authority,
        payer,
        rentSysvar: web3.SYSVAR_RENT_PUBKEY,
      },
      { args },
      programId
    ),
  ];

  return {
    tx: new web3.Transaction().add(...instructions),
    signers: [],
    accounts: instructions.flatMap((i) => i.keys.map((k) => k.pubkey)),
  };
}

export async function addMultiplier(
  mx: Metaplex,
  project: web3.PublicKey,
  args: AddMultiplierArgs,
  programId: web3.PublicKey = PROGRAM_ID
) {
  const wallet = mx.identity();
  const ctx = createAddMultiplierCtx(
    project,
    wallet.publicKey,
    wallet.publicKey,
    args,
    programId
  );

  const blockhash = await mx.connection.getLatestBlockhash();

  ctx.tx.recentBlockhash = blockhash.blockhash;

  const response = await mx
    .rpc()
    .sendAndConfirmTransaction(ctx.tx, { skipPreflight: true }, ctx.signers);

  return {
    response,
  };
}
