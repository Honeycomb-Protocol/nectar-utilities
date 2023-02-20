import * as web3 from "@solana/web3.js";
import {
  createCreateProjectInstruction,
  CreateProjectArgs as CreateStakingProjectArgs,
  AddMultiplierArgs,
  PROGRAM_ID,
} from "../generated";
import { TxSignersAccounts } from "../types";
import { Metaplex } from "@metaplex-foundation/js";
import { createUpdateProjectCtx } from "./updateProject";
import { createInitMultiplierCtx } from "./initMultipliers";
import { createAddMultiplierCtx } from "./addMultiplier";
import { getProjectPda, getVaultPda } from "../pdas";

export function createCreateProjectCtx(
  rewardMint: web3.PublicKey,
  authority: web3.PublicKey,
  payer: web3.PublicKey,
  args: CreateStakingProjectArgs,
  collections: web3.PublicKey[] = [],
  creators: web3.PublicKey[] = [],
  multipliers: AddMultiplierArgs[] = [],
  multipliersDecimals: number = 9,
  programId: web3.PublicKey = PROGRAM_ID
): TxSignersAccounts & { project: web3.PublicKey } {
  const key = web3.Keypair.generate().publicKey;
  const [project] = getProjectPda(key, programId);
  const [vault] = getVaultPda(project, rewardMint, programId);

  const instructions: web3.TransactionInstruction[] = [
    createCreateProjectInstruction(
      {
        key,
        project,
        rewardMint,
        vault,
        authority,
        payer,
      },
      { args },
      programId
    ),

    ...collections.map(
      (collection) =>
        createUpdateProjectCtx(
          project,
          authority,
          {
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
          collection
        ).tx.instructions[0]
    ),

    ...creators.map(
      (creator) =>
        createUpdateProjectCtx(
          project,
          authority,
          {
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
          undefined,
          creator
        ).tx.instructions[0]
    ),

    ...(multipliers.length
      ? [
          createInitMultiplierCtx(project, authority, {
            decimals: multipliersDecimals,
          }).tx.instructions[0],

          ...multipliers.map(
            (multiplier) =>
              createAddMultiplierCtx(project, authority, payer, multiplier).tx
                .instructions[0]
          ),
        ]
      : []),
  ];

  return {
    tx: new web3.Transaction().add(...instructions),
    signers: [],
    accounts: instructions.flatMap((i) => i.keys.map((k) => k.pubkey)),
    project,
  };
}

type CreateProjectArgs = {
  metaplex: Metaplex;
  rewardMint: web3.PublicKey;
  args: CreateStakingProjectArgs;
  collections?: web3.PublicKey[];
  creators?: web3.PublicKey[];
  multipliers?: AddMultiplierArgs[];
  multipliersDecimals?: number;
};

export async function createProject({
  metaplex: mx,
  ...args
}: CreateProjectArgs) {
  const wallet = mx.identity();
  const ctx = createCreateProjectCtx(
    args.rewardMint,
    wallet.publicKey,
    wallet.publicKey,
    args.args,
    args.collections || [],
    args.creators || [],
    args.multipliers || [],
    args.multipliersDecimals || 9
  );

  const blockhash = await mx.connection.getLatestBlockhash();

  ctx.tx.recentBlockhash = blockhash.blockhash;

  const response = await mx
    .rpc()
    .sendAndConfirmTransaction(ctx.tx, { skipPreflight: true }, ctx.signers);

  return {
    response,
    project: ctx.project,
  };
}
