import * as web3 from "@solana/web3.js";
import {
  createCreateStakingPoolInstruction,
  CreateStakingPoolArgs,
  AddMultiplierArgs,
  PROGRAM_ID,
} from "../generated";
import { createUpdatePoolCtx } from "./updateStakingPool";
import { createInitMultiplierCtx } from "./initMultipliers";
import { createAddMultiplierCtx } from "./addMultiplier";
import { getStakingPoolPda } from "../pdas";
import {
  VAULT,
  HIVECONTROL_PROGRAM_ID,
  createCtx,
  OperationCtx,
  Honeycomb,
} from "@honeycomb-protocol/hive-control";

type CreateCreateProjectCtxArgs = {
  project: web3.PublicKey;
  currency: web3.PublicKey;
  authority: web3.PublicKey;
  payer: web3.PublicKey;
  args: CreateStakingPoolArgs;
  collections?: web3.PublicKey[];
  creators?: web3.PublicKey[];
  multipliers?: AddMultiplierArgs[];
  multipliersDecimals?: number;
  delegateAuthority?: web3.PublicKey;
  programId?: web3.PublicKey;
};

export function createCreateProjectCtx(
  args: CreateCreateProjectCtxArgs
): OperationCtx & { stakingPool: web3.PublicKey } {
  const programId = args.programId || PROGRAM_ID;

  const key = web3.Keypair.generate().publicKey;
  const [stakingPool] = getStakingPoolPda(args.project, key, programId);

  const instructions: web3.TransactionInstruction[] = [
    createCreateStakingPoolInstruction(
      {
        project: args.project,
        vault: VAULT,
        key,
        stakingPool,
        currency: args.currency,
        delegateAuthority: args.delegateAuthority || programId,
        authority: args.authority,
        payer: args.payer,
        hiveControl: HIVECONTROL_PROGRAM_ID,
        rentSysvar: web3.SYSVAR_RENT_PUBKEY,
      },
      { args: args.args },
      programId
    ),

    ...(args.collections || []).flatMap(
      (collection) =>
        createUpdatePoolCtx({
          args: {
            name: null,
            rewardsPerDuration: null,
            rewardsDuration: null,
            maxRewardsDuration: null,
            minStakeDuration: null,
            cooldownDuration: null,
            resetStakeDuration: null,
            startTime: null,
            endTime: null,
          },
          project: args.project,
          stakingPool: stakingPool,
          authority: args.authority,
          payer: args.payer,
          collection,
          delegateAuthority: args.delegateAuthority,
          programId,
        }).tx.instructions
    ),

    ...(args.creators || []).flatMap(
      (creator) =>
        createUpdatePoolCtx({
          args: {
            name: null,
            rewardsPerDuration: null,
            rewardsDuration: null,
            maxRewardsDuration: null,
            minStakeDuration: null,
            cooldownDuration: null,
            resetStakeDuration: null,
            startTime: null,
            endTime: null,
          },
          project: args.project,
          stakingPool: stakingPool,
          authority: args.authority,
          payer: args.payer,
          creator,
          delegateAuthority: args.delegateAuthority,
          programId,
        }).tx.instructions
    ),

    ...(args.multipliers?.length
      ? [
          ...createInitMultiplierCtx({
            args: {
              decimals: args.multipliersDecimals || 9,
            },
            project: args.project,
            stakingPool,
            authority: args.authority,
            payer: args.payer,
            delegateAuthority: args.delegateAuthority || programId,
            programId,
          }).tx.instructions,

          ...args.multipliers.flatMap(
            (multiplier) =>
              createAddMultiplierCtx({
                project: args.project,
                stakingPool,
                authority: args.authority,
                payer: args.payer,
                args: multiplier,
                delegateAuthority: args.delegateAuthority,
                programId,
              }).tx.instructions
          ),
        ]
      : []),
  ];

  return {
    ...createCtx(instructions),
    stakingPool,
  };
}

type CreateProjectArgs = {
  project?: web3.PublicKey;
  currency: web3.PublicKey;
  args: CreateStakingPoolArgs;
  collections?: web3.PublicKey[];
  creators?: web3.PublicKey[];
  multipliers?: AddMultiplierArgs[];
  multipliersDecimals?: number;
  programId?: web3.PublicKey;
};
export async function createStakingPool(
  honeycomb: Honeycomb,
  args: CreateProjectArgs,
  confirmOptions?: web3.ConfirmOptions
) {
  const wallet = honeycomb.identity();
  const ctx = createCreateProjectCtx({
    args: args.args,
    project: args.project || honeycomb.project().projectAddress,
    currency: args.currency,
    authority: wallet.publicKey,
    payer: wallet.publicKey,
    collections: args.collections || [],
    creators: args.creators || [],
    multipliers: args.multipliers || [],
    multipliersDecimals: args.multipliersDecimals || 9,
    delegateAuthority: wallet.delegateAuthority().address,
    programId: args.programId,
  });

  return {
    ...(await honeycomb.rpc().sendAndConfirmTransaction(ctx, confirmOptions)),
    poolId: ctx.stakingPool,
  };
}
