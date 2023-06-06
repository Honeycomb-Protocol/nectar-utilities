import * as web3 from "@solana/web3.js";
import { createInitStakerInstruction, PROGRAM_ID } from "../generated";
import { getStakerPda } from "../pdas";
import { VAULT, createCtx, Honeycomb } from "@honeycomb-protocol/hive-control";

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

type InitStakerArgs = {
  programId?: web3.PublicKey;
};

export async function initStaker(
  honeycomb: Honeycomb,
  args: InitStakerArgs,
  confirmOptions?: web3.ConfirmOptions
) {
  const wallet = honeycomb.identity();
  const ctx = createInitStakerCtx({
    project: honeycomb.project().projectAddress,
    stakingPool: honeycomb.staking().poolAddress,
    wallet: wallet.address,
    programId: args.programId,
  });

  return honeycomb.rpc().sendAndConfirmTransaction(ctx, confirmOptions);
}
