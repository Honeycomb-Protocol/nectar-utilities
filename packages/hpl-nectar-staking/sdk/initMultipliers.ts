import * as web3 from "@solana/web3.js";
import {
  createInitMultipliersInstruction,
  InitMultipliersArgs as InitStakingMultipliersArgs,
  PROGRAM_ID,
} from "../generated";
import { Metaplex } from "@metaplex-foundation/js";
import { getMultipliersPda } from "../pdas";
import { VAULT } from "@honeycomb-protocol/hive-control";
import { createCtx } from "../utils";

type InitMultipliersArgs = {
  metaplex: Metaplex;
  project: web3.PublicKey;
  stakingPool: web3.PublicKey;
  args: InitStakingMultipliersArgs;
  delegateAuthority?: web3.PublicKey;
  programId?: web3.PublicKey;
};

type CreateInitMultiplierCtxArgs = {
  project: web3.PublicKey;
  stakingPool: web3.PublicKey;
  authority: web3.PublicKey;
  payer: web3.PublicKey;
  args: InitStakingMultipliersArgs;
  delegateAuthority?: web3.PublicKey;
  programId?: web3.PublicKey;
};

export function createInitMultiplierCtx(args: CreateInitMultiplierCtxArgs) {
  const programId = args.programId || PROGRAM_ID;
  const [multipliers] = getMultipliersPda(args.stakingPool, programId);

  const instructions: web3.TransactionInstruction[] = [
    createInitMultipliersInstruction(
      {
        project: args.project,
        vault: VAULT,
        stakingPool: args.stakingPool,
        multipliers,
        authority: args.authority,
        payer: args.payer,
        delegateAuthority: args.delegateAuthority || programId,
      },
      { args: args.args },
      programId
    ),
  ];

  return createCtx(instructions);
}

export async function initMultipliers({
  metaplex: mx,
  ...args
}: InitMultipliersArgs) {
  const wallet = mx.identity();
  const ctx = createInitMultiplierCtx({
    project: args.project,
    stakingPool: args.stakingPool,
    authority: wallet.publicKey,
    payer: wallet.publicKey,
    args: args.args,
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
