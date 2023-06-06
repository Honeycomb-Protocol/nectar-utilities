import * as web3 from "@solana/web3.js";
import {
  createAddMultiplierInstruction,
  AddMultiplierArgs,
  PROGRAM_ID,
} from "../generated";
import { getMultipliersPda } from "../pdas";
import { Honeycomb, Operation, VAULT } from "@honeycomb-protocol/hive-control";
import { NectarStaking } from "../NectarStaking";

type CreateAddMultiplierCtxArgs = {
  args: AddMultiplierArgs;
  stakingPool: NectarStaking;
  programId?: web3.PublicKey;
};

export async function createAddMultiplierOperation(
  honeycomb: Honeycomb,
  args: CreateAddMultiplierCtxArgs
) {
  const programId = args.programId || PROGRAM_ID;

  const [multipliers] = getMultipliersPda(args.stakingPool.address, programId);

  const instructions: web3.TransactionInstruction[] = [
    createAddMultiplierInstruction(
      {
        project: args.stakingPool.project().address,
        vault: VAULT,
        stakingPool: args.stakingPool.address,
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
