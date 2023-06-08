import * as web3 from "@solana/web3.js";
import {
  createAddMultiplierInstruction,
  AddMultiplierArgs,
  PROGRAM_ID,
} from "../generated";
import { getMultipliersPda } from "../pdas";
import { Honeycomb, Operation, VAULT } from "@honeycomb-protocol/hive-control";

type CreateAddMultiplierCtxArgs = {
  args: AddMultiplierArgs;
  project: web3.PublicKey;
  stakingPool: web3.PublicKey;
  programId?: web3.PublicKey;
};

export async function createAddMultiplierOperation(
  honeycomb: Honeycomb,
  args: CreateAddMultiplierCtxArgs
) {
  const programId = args.programId || PROGRAM_ID;

  const [multipliers] = getMultipliersPda(args.stakingPool, programId);

  const instructions: web3.TransactionInstruction[] = [
    createAddMultiplierInstruction(
      {
        project: args.project,
        vault: VAULT,
        stakingPool: args.stakingPool,
        multipliers,
        delegateAuthority:
          honeycomb.identity().delegateAuthority()?.address || programId,
        authority: honeycomb.identity().address,
        payer: honeycomb.identity().address,
        rentSysvar: web3.SYSVAR_RENT_PUBKEY,
      },
      { args: args.args },
      programId
    ),
  ];

  return {
    operation: new Operation(honeycomb, instructions),
  };
}
