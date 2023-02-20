import * as web3 from "@solana/web3.js";
import {
  createInitMultipliersInstruction,
  InitMultipliersArgs,
  PROGRAM_ID,
} from "../generated";
import { TxSignersAccounts } from "../types";
import { Metaplex } from "@metaplex-foundation/js";
import { getMultipliersPda } from "../pdas";

export function createInitMultiplierCtx(
  project: web3.PublicKey,
  authority: web3.PublicKey,
  args: InitMultipliersArgs,
  programId: web3.PublicKey = PROGRAM_ID
): TxSignersAccounts {
  const [multipliers] = getMultipliersPda(project, programId);

  const instructions: web3.TransactionInstruction[] = [
    createInitMultipliersInstruction(
      {
        project,
        multipliers,
        authority,
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

export async function initMultipliers(
  mx: Metaplex,
  project: web3.PublicKey,
  args: InitMultipliersArgs,
  programId: web3.PublicKey = PROGRAM_ID
) {
  const wallet = mx.identity();
  const ctx = createInitMultiplierCtx(
    project,
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
