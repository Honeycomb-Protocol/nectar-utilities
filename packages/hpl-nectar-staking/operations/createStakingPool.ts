import * as web3 from "@solana/web3.js";
import {
  createCreateStakingPoolInstruction,
  CreateStakingPoolArgs,
  AddMultiplierArgs,
  PROGRAM_ID,
} from "../generated";
import { getStakingPoolPda } from "../pdas";
import {
  VAULT,
  HIVECONTROL_PROGRAM_ID,
  Honeycomb,
  Operation,
  HoneycombProject,
} from "@honeycomb-protocol/hive-control";
import { createUpdatePoolOperation } from "./updateStakingPool";
import { createInitMultiplierOperation } from "./initMultipliers";
import { createAddMultiplierOperation } from "./addMultiplier";
import { HplCurrency } from "@honeycomb-protocol/currency-manager";
import { TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

type CreateCreateStakingOperationArgs = {
  project: HoneycombProject;
  currency: HplCurrency;
  args: CreateStakingPoolArgs;
  collections?: web3.PublicKey[];
  creators?: web3.PublicKey[];
  multipliers?: AddMultiplierArgs[];
  multipliersDecimals?: number;
  programId?: web3.PublicKey;
};

export async function createCreateStakingPoolOperation(
  honeycomb: Honeycomb,
  args: CreateCreateStakingOperationArgs
) {
  const programId = args.programId || PROGRAM_ID;

  const key = web3.Keypair.generate().publicKey;
  const [stakingPool] = getStakingPoolPda(args.project.address, key, programId);

  const instructions: web3.TransactionInstruction[] = [
    createCreateStakingPoolInstruction(
      {
        project: args.project.address,
        vault: VAULT,
        key,
        stakingPool,
        currency: args.currency.address,
        delegateAuthority:
          honeycomb.identity().delegateAuthority()?.address || programId,
        authority: honeycomb.identity().address,
        payer: honeycomb.identity().address,
        hiveControl: HIVECONTROL_PROGRAM_ID,
        rentSysvar: web3.SYSVAR_RENT_PUBKEY,
        tokenProgram: TOKEN_2022_PROGRAM_ID,
      },
      { args: args.args },
      programId
    ),
  ];

  if (args.collections?.length) {
    await Promise.all(
      args.collections.map((collection) =>
        createUpdatePoolOperation(honeycomb, {
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
          project: args.project.address,
          stakingPool: stakingPool,
          collection,
          programId,
        }).then(({ operation }) => instructions.push(...operation.instructions))
      )
    );
  }

  if (args.creators?.length) {
    await Promise.all(
      args.creators.map((creator) =>
        createUpdatePoolOperation(honeycomb, {
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
          project: args.project.address,
          stakingPool: stakingPool,
          creator,
          programId,
        }).then(({ operation }) => instructions.push(...operation.instructions))
      )
    );
  }

  if (args.multipliers?.length) {
    await createInitMultiplierOperation(honeycomb, {
      args: {
        decimals: args.multipliersDecimals || 9,
      },
      project: args.project.address,
      stakingPool,
      programId,
    }).then(({ operation }) => instructions.push(...operation.instructions));

    await Promise.all(
      args.multipliers.map((multiplier) =>
        createAddMultiplierOperation(honeycomb, {
          args: multiplier,
          project: args.project.address,
          stakingPool,
          programId,
        }).then(({ operation }) => instructions.push(...operation.instructions))
      )
    );
  }

  return {
    operation: new Operation(honeycomb, instructions),
    stakingPool,
  };
}
