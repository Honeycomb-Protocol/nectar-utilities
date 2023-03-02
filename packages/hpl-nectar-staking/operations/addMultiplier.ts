import * as web3 from "@solana/web3.js";
import {
  createAddMultiplierInstruction,
  AddMultiplierArgs as AddMultiplierArgsChain,
  PROGRAM_ID,
} from "../generated";
import { getMultipliersPda } from "../pdas";
import { VAULT, createCtx } from "@honeycomb-protocol/hive-control";
import { NectarStaking } from "../NectarStaking";

type CreateAddMultiplierCtxArgs = {
  project: web3.PublicKey;
  stakingPool: web3.PublicKey;
  authority: web3.PublicKey;
  payer: web3.PublicKey;
  args: AddMultiplierArgsChain;
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

type AddMultiplierArgs = {
  args: AddMultiplierArgsChain;
  programId?: web3.PublicKey;
};

export async function addMultiplier(
  staking: NectarStaking,
  args: AddMultiplierArgs
) {
  const wallet = staking.honeycomb().identity();
  const ctx = createAddMultiplierCtx({
    project: staking.pool().project,
    stakingPool: staking.poolAddress,
    authority: wallet.publicKey,
    payer: wallet.publicKey,
    args: args.args,
    delegateAuthority: wallet.getDelegateAuthority().delegateAuthorityAddress,
    programId: args.programId,
  });

  return staking
    .honeycomb()
    .rpc()
    .sendAndConfirmTransaction(ctx, { skipPreflight: true });
}
