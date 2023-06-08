import * as web3 from "@solana/web3.js";
import {
  UpdateStakingPoolArgs,
  createUpdateStakingPoolInstruction,
  PROGRAM_ID,
} from "../generated";
import { Honeycomb, VAULT, Operation } from "@honeycomb-protocol/hive-control";

type CreateUpdatePoolCtxArgs = {
  args: UpdateStakingPoolArgs;
  project: web3.PublicKey;
  stakingPool: web3.PublicKey;
  collection?: web3.PublicKey;
  creator?: web3.PublicKey;
  programId?: web3.PublicKey;
};
export async function createUpdatePoolOperation(
  honeycomb: Honeycomb,
  args: CreateUpdatePoolCtxArgs
) {
  const programId = args.programId || PROGRAM_ID;

  const instructions: web3.TransactionInstruction[] = [
    createUpdateStakingPoolInstruction(
      {
        project: args.project,
        vault: VAULT,
        stakingPool: args.stakingPool,
        collection: args.collection || programId,
        creator: args.creator || programId,
        authority: honeycomb.identity().address,
        payer: honeycomb.identity().address,
        delegateAuthority:
          honeycomb.identity().delegateAuthority()?.address || programId,
      },
      {
        args: args.args,
      },
      programId
    ),
  ];

  return {
    operation: new Operation(honeycomb, instructions),
  };
}
