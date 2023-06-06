import * as web3 from "@solana/web3.js";
import {
  createInitMultipliersInstruction,
  InitMultipliersArgs,
  PROGRAM_ID,
} from "../generated";
import { getMultipliersPda } from "../pdas";
import { VAULT, Honeycomb,Operation } from "@honeycomb-protocol/hive-control";
import { NectarStaking } from "../NectarStaking";

type CreateInitMultiplierCtxArgs = {
  args: InitMultipliersArgs;
  stakingPool: NectarStaking;
  programId?: web3.PublicKey;
};

export async function createInitMultiplierOperation(honeycomb: Honeycomb,
  args: CreateInitMultiplierCtxArgs) {
    const programId = args.programId || PROGRAM_ID;
  const [multipliers] = getMultipliersPda(args.stakingPool, programId);

  const instructions: web3.TransactionInstruction[] = [
    createInitMultipliersInstruction(
      {
        project: args.stakingPool.project().address,
        vault: VAULT,
        stakingPool: args.stakingPool.address,
        multipliers,
        authority: honeycomb.identity().address,
        payer: honeycomb.identity().address,
        delegateAuthority: honeycomb.identity().delegateAuthority()?.address || programId,
      },
      { args: args.args },
      programId
    ),
  ];

  return {
    operation: new Operation(honeycomb, instructions),
  };
}

