import * as web3 from "@solana/web3.js";
import {
  createCreateStakingProjectInstruction,
  CreateStakingProjectArgs,
  AddMultiplierArgs,
  PROGRAM_ID,
} from "../generated";
import { Context } from "../types";
import { Metaplex } from "@metaplex-foundation/js";
import { createUpdateProjectCtx } from "./updateProject";
import { createInitMultiplierCtx } from "./initMultipliers";
import { createAddMultiplierCtx } from "./addMultiplier";
import { getStakingProjectPda, getVaultPda } from "../pdas";
import {
  VAULT,
  HIVECONTROL_PROGRAM_ID,
} from "@honeycomb-protocol/hive-control";
import { createCtx } from "../utils";

type CreateProjectArgs = {
  metaplex: Metaplex;
  project: web3.PublicKey;
  rewardMint: web3.PublicKey;
  args: CreateStakingProjectArgs;
  collections?: web3.PublicKey[];
  creators?: web3.PublicKey[];
  multipliers?: AddMultiplierArgs[];
  multipliersDecimals?: number;
  delegateAuthority?: web3.PublicKey;
  programId?: web3.PublicKey;
};

type CreateCreateProjectCtxArgs = {
  project: web3.PublicKey;
  rewardMint: web3.PublicKey;
  authority: web3.PublicKey;
  payer: web3.PublicKey;
  args: CreateStakingProjectArgs;
  collections?: web3.PublicKey[];
  creators?: web3.PublicKey[];
  multipliers?: AddMultiplierArgs[];
  multipliersDecimals?: number;
  delegateAuthority?: web3.PublicKey;
  programId?: web3.PublicKey;
};

export function createCreateProjectCtx(
  args: CreateCreateProjectCtxArgs
): Context & { stakingProject: web3.PublicKey } {
  const programId = args.programId || PROGRAM_ID;

  const key = web3.Keypair.generate().publicKey;
  const [stakingProject] = getStakingProjectPda(key, programId);
  const [rewardVault] = getVaultPda(stakingProject, args.rewardMint, programId);

  const instructions: web3.TransactionInstruction[] = [
    createCreateStakingProjectInstruction(
      {
        project: args.project,
        vault: VAULT,
        key,
        stakingProject,
        rewardMint: args.rewardMint,
        rewardVault,
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
        createUpdateProjectCtx({
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
          stakingProject: stakingProject,
          authority: args.authority,
          payer: args.payer,
          collection,
          delegateAuthority: args.delegateAuthority,
          programId,
        }).tx.instructions
    ),

    ...(args.creators || []).flatMap(
      (creator) =>
        createUpdateProjectCtx({
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
          stakingProject: stakingProject,
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
            stakingProject,
            authority: args.authority,
            payer: args.payer,
            delegateAuthority: args.delegateAuthority || programId,
            programId,
          }).tx.instructions,

          ...args.multipliers.flatMap(
            (multiplier) =>
              createAddMultiplierCtx({
                project: args.project,
                stakingProject,
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
    stakingProject,
  };
}

export async function createProject({
  metaplex: mx,
  ...args
}: CreateProjectArgs) {
  const wallet = mx.identity();
  const ctx = createCreateProjectCtx({
    project: args.project,
    rewardMint: args.rewardMint,
    authority: wallet.publicKey,
    payer: wallet.publicKey,
    args: args.args,
    collections: args.collections || [],
    creators: args.creators || [],
    multipliers: args.multipliers || [],
    multipliersDecimals: args.multipliersDecimals || 9,
    delegateAuthority: args.delegateAuthority,
    programId: args.programId,
  });

  ctx.tx.recentBlockhash = await mx.connection
    .getLatestBlockhash()
    .then((x) => x.blockhash);
  return {
    response: await mx
      .rpc()
      .sendAndConfirmTransaction(ctx.tx, { skipPreflight: true }, ctx.signers),
    stakingProject: ctx.stakingProject,
  };
}
