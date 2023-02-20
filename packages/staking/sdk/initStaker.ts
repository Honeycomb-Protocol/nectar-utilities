import * as web3 from "@solana/web3.js";
import { createInitStakerInstruction, PROGRAM_ID } from "../generated";
import { TxSignersAccounts } from "../types";
import { Metaplex } from "@metaplex-foundation/js";
import { getStakerPda } from "../pdas";

export function createInitStakerCtx(
  project: web3.PublicKey,
  wallet: web3.PublicKey,
  programId: web3.PublicKey = PROGRAM_ID
): TxSignersAccounts {
  const [staker] = getStakerPda(project, wallet, programId);

  const instructions: web3.TransactionInstruction[] = [
    createInitStakerInstruction(
      {
        project,
        staker,
        wallet,
      },
      programId
    ),
  ];

  return {
    tx: new web3.Transaction().add(...instructions),
    signers: [],
    accounts: instructions.flatMap((i) => i.keys.map((k) => k.pubkey)),
  };
}

export async function initStaker(
  mx: Metaplex,
  project: web3.PublicKey,
  programId: web3.PublicKey = PROGRAM_ID
) {
  const wallet = mx.identity();
  const ctx = createInitStakerCtx(project, wallet.publicKey, programId);

  const blockhash = await mx.connection.getLatestBlockhash();

  ctx.tx.recentBlockhash = blockhash.blockhash;

  const response = await mx
    .rpc()
    .sendAndConfirmTransaction(ctx.tx, { skipPreflight: true }, ctx.signers);

  return {
    response,
  };
}
