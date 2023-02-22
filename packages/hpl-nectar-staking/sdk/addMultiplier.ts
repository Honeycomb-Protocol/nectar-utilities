import * as web3 from "@solana/web3.js";
import {
  createAddMultiplierInstruction,
  AddMultiplierArgs as AddStakingMultiplierArgs,
  PROGRAM_ID,
} from "../generated";
import { Metaplex } from "@metaplex-foundation/js";
import { getMultipliersPda } from "../pdas";
import { VAULT } from "@honeycomb-protocol/hive-control";
import { createCtx } from "../utils";

type AddMultiplierArgs = {
  metaplex: Metaplex;
  project: web3.PublicKey;
  stakingPool: web3.PublicKey;
  args: AddStakingMultiplierArgs;
  programId?: web3.PublicKey;
  delegateAuthority?: web3.PublicKey;
};

type CreateAddMultiplierCtxArgs = {
  project: web3.PublicKey;
  stakingPool: web3.PublicKey;
  authority: web3.PublicKey;
  payer: web3.PublicKey;
  args: AddStakingMultiplierArgs;
  delegateAuthority?: web3.PublicKey;
  programId?: web3.PublicKey;
};

export function createAddMultiplierCtx(args: CreateAddMultiplierCtxArgs) {
  const programId = args.programId || PROGRAM_ID;

  const [multipliers] = getMultipliersPda(args.stakingPool, programId);

  const instructions: web3.TransactionInstruction[] = [
    createAddMultiplierInstruction(
      {
        project: args.project,
        vault: VAULT,
        stakingPool: args.stakingPool,
        multipliers,
        delegateAuthority: args.delegateAuthority || programId,
        authority: args.authority,
        payer: args.payer,
        rentSysvar: web3.SYSVAR_RENT_PUBKEY,
      },
      { args: args.args },
      programId
    ),
  ];

  return createCtx(instructions);
}

export async function addMultiplier(args: AddMultiplierArgs) {
  const mx = args.metaplex;
  const wallet = mx.identity();
  const ctx = createAddMultiplierCtx({
    project: args.project,
    stakingPool: args.stakingPool,
    authority: wallet.publicKey,
    payer: wallet.publicKey,
    args: args.args,
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
