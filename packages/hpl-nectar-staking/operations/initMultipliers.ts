import * as web3 from "@solana/web3.js";
import {
  createInitMultipliersInstruction,
  InitMultipliersArgs,
  PROGRAM_ID,
} from "../generated";
import { getMultipliersPda } from "../pdas";
import { VAULT, Honeycomb, Operation } from "@honeycomb-protocol/hive-control";

type CreateInitMultiplierOperationArgs = {
  args: InitMultipliersArgs;
  project: web3.PublicKey;
  stakingPool: web3.PublicKey;
  programId?: web3.PublicKey;
};

export async function createInitMultiplierOperation(
  honeycomb: Honeycomb,
  args: CreateInitMultiplierOperationArgs
) {
  const programId = args.programId || PROGRAM_ID;
  const [multipliers] = getMultipliersPda(args.stakingPool, programId);

  const instructions: web3.TransactionInstruction[] = [
    createInitMultipliersInstruction(
      {
        project: args.project,
        vault: VAULT,
        stakingPool: args.stakingPool,
        multipliers,
        authority: honeycomb.identity().address,
        payer: honeycomb.identity().address,
        delegateAuthority:
          honeycomb.identity().delegateAuthority()?.address || programId,
      },
      { args: args.args },
      programId
    ),
  ];

  return {
    operation: new Operation(honeycomb, instructions),
  };
}
