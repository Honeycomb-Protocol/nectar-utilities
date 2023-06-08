import * as web3 from "@solana/web3.js";
import { createInitStakerInstruction, PROGRAM_ID } from "../generated";
import { getStakerPda } from "../pdas";
import { VAULT, Operation, Honeycomb } from "@honeycomb-protocol/hive-control";
import { NectarStaking } from "../NectarStaking";

type CreateInitStakerOperationArgs = {
  stakingPool: NectarStaking;
  programId?: web3.PublicKey;
};

export async function createInitStakerOperation(
  honeycomb: Honeycomb,
  args: CreateInitStakerOperationArgs
) {
  const programId = args.programId || PROGRAM_ID;
  const [staker] = getStakerPda(
    args.stakingPool.address,
    honeycomb.identity().address,
    programId
  );

  const instructions: web3.TransactionInstruction[] = [
    createInitStakerInstruction(
      {
        project: args.stakingPool.project().address,
        vault: VAULT,
        stakingPool: args.stakingPool.address,
        staker,
        wallet: honeycomb.identity().address,
      },
      programId
    ),
  ];

  return {
    operation: new Operation(honeycomb, instructions),
  };
}
