import * as web3 from "@solana/web3.js";
import {
  createInitMultipliersInstruction,
  InitMultipliersArgs as InitMultipliersArgsChain,
  PROGRAM_ID,
} from "../generated";
import { getMultipliersPda } from "../pdas";
import { VAULT, createCtx, Honeycomb } from "@honeycomb-protocol/hive-control";

type CreateInitMultiplierCtxArgs = {
  project: web3.PublicKey;
  stakingPool: web3.PublicKey;
  authority: web3.PublicKey;
  payer: web3.PublicKey;
  args: InitMultipliersArgsChain;
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

type InitMultipliersArgs = {
  args: InitMultipliersArgsChain;
  programId?: web3.PublicKey;
};

export async function initMultipliers(
  honeycomb: Honeycomb,
  args: InitMultipliersArgs
) {
  const wallet = honeycomb.identity();
  const ctx = createInitMultiplierCtx({
    project: honeycomb.projectAddress,
    stakingPool: honeycomb.staking().poolAddress,
    authority: wallet.publicKey,
    payer: wallet.publicKey,
    args: args.args,
    delegateAuthority: wallet.getDelegateAuthority().delegateAuthorityAddress,
    programId: args.programId,
  });

  return honeycomb
    .rpc()
    .sendAndConfirmTransaction(ctx, { skipPreflight: true });
}
