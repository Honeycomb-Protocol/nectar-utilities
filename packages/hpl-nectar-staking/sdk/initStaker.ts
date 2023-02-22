import * as web3 from "@solana/web3.js";
import { createInitStakerInstruction, PROGRAM_ID } from "../generated";
import { Metaplex } from "@metaplex-foundation/js";
import { getStakerPda } from "../pdas";
import { VAULT } from "@honeycomb-protocol/hive-control";
import { createCtx } from "../utils";

type InitStakerArgs = {
  metaplex: Metaplex;
  project: web3.PublicKey;
  stakingPool: web3.PublicKey;
  programId?: web3.PublicKey;
};

type CreateInitStakerCtxArgs = {
  project: web3.PublicKey;
  stakingPool: web3.PublicKey;
  wallet: web3.PublicKey;
  programId?: web3.PublicKey;
};

export function createInitStakerCtx(args: CreateInitStakerCtxArgs) {
  const programId = args.programId || PROGRAM_ID;
  const [staker] = getStakerPda(args.stakingPool, args.wallet, programId);

  const instructions: web3.TransactionInstruction[] = [
    createInitStakerInstruction(
      {
        project: args.project,
        vault: VAULT,
        stakingPool: args.stakingPool,
        staker,
        wallet: args.wallet,
      },
      programId
    ),
  ];

  return createCtx(instructions);
}

export async function initStaker({ metaplex: mx, ...args }: InitStakerArgs) {
  const wallet = mx.identity();
  const ctx = createInitStakerCtx({
    project: args.project,
    stakingPool: args.stakingPool,
    wallet: wallet.publicKey,
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
