import * as web3 from "@solana/web3.js";
import {
  createCreateStakingPoolInstruction,
  CreateStakingPoolArgs,
  AddMultiplierArgs,
  PROGRAM_ID,
} from "../../generated";
import {
  VAULT,
  HPL_HIVE_CONTROL_PROGRAM,
  Honeycomb,
  Operation,
  HoneycombProject,
  CurrencyManagerPermission,
  createCreateDelegateAuthorityOperation,
} from "@honeycomb-protocol/hive-control";
import { createUpdatePoolOperation } from "./updateStakingPool";
import { createInitMultiplierOperation } from "./initMultipliers";
import { createAddMultiplierOperation } from "./addMultiplier";
import { HplCurrency } from "@honeycomb-protocol/currency-manager";
import { HPL_EVENTS_PROGRAM } from "@honeycomb-protocol/events";

/**
 * Represents the context arguments for creating the CreateStakingPool operation.
 * @category Types
 */
type CreateCreateStakingOperationArgs = {
  project: HoneycombProject;
  currency: HplCurrency;
  args: CreateStakingPoolArgs;
  collections?: web3.PublicKey[];
  creators?: web3.PublicKey[];
  merkleTrees?: web3.PublicKey[];
  multipliers?: AddMultiplierArgs[];
  multipliersDecimals?: number;
  programId?: web3.PublicKey;
};

/**
 * Create an operation to create a new staking pool.
 * @category Operation Builder
 * @param honeycomb - The Honeycomb instance.
 * @param args - The context arguments for creating the CreateStakingPool operation.
 * @returns An object containing the CreateStakingPool operation and the newly created staking pool's address.
 * @example
 * // Usage example:
 * const honeycomb = new Honeycomb(connection, wallet);
 * const project = await honeycomb.getProject(projectAddress);
 * const currency = await honeycomb.getCurrency(currencyAddress);
 * const args = {
 *   project,
 *   currency,
 *   args: {
 *     name: "My Staking Pool",
 *     rewardsPerDuration: 10,
 *     rewardsDuration: 86400, // 1 day in seconds
 *     maxRewardsDuration: 604800, // 7 days in seconds
 *     minStakeDuration: 86400, // 1 day in seconds
 *     cooldownDuration: 86400, // 1 day in seconds
 *     resetStakeDuration: 2592000, // 30 days in seconds
 *     startTime: Math.floor(Date.now() / 1000) + 60, // Start after 1 minute
 *     endTime: Math.floor(Date.now() / 1000) + 604800, // End after 7 days
 *   },
 *   collections: [collection1Address, collection2Address],
 *   creators: [creator1Address, creator2Address],
 *   multipliers: [
 *     { nftMint: nftMintAddress1, multiplier: 2 },
 *     { nftMint: nftMintAddress2, multiplier: 3 },
 *   ],
 *   multipliersDecimals: 6,
 * };
 * const { operation, stakingPool } = await createCreateStakingPoolOperation(honeycomb, args);
 * // Send the transaction
 * const txSignature = await honeycomb.sendTransaction(operation);
 */
export async function createCreateStakingPoolOperation(
  honeycomb: Honeycomb,
  args: CreateCreateStakingOperationArgs
) {
  const programId = args.programId || PROGRAM_ID;

  const key = web3.Keypair.generate().publicKey;
  const [stakingPool] = honeycomb
    .pda()
    .staking()
    .pool(args.project.address, key, programId);

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
        hiveControl: HPL_HIVE_CONTROL_PROGRAM,
        hplEvents: HPL_EVENTS_PROGRAM,
        clockSysvar: web3.SYSVAR_CLOCK_PUBKEY,
        rentSysvar: web3.SYSVAR_RENT_PUBKEY,
        instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      },
      { args: args.args },
      programId
    ),
  ];

  await createCreateDelegateAuthorityOperation(honeycomb, {
    args: {
      delegations: [
        {
          __kind: "CurrencyManager",
          permission: CurrencyManagerPermission.MintCurrencies,
        },
      ],
    },
    delegate: stakingPool,
    project: args.project,
  }).then(({ operation }) => instructions.push(...operation.instructions));

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

  if (args.merkleTrees?.length) {
    await Promise.all(
      args.merkleTrees.map((merkleTree) =>
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
          merkleTree,
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
