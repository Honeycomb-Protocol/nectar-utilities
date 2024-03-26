import { PublicKey } from "@solana/web3.js";
import {
  CreateMissionArgs,
  CreateMissionPoolArgs,
  EarnedReward,
} from "./generated/types";
import { HoneycombProject } from "@honeycomb-protocol/hive-control";

/**
 * The `ItemOrArray` type represents a value that can either be a single item of type `T`
 * or an array of items of type `T`.
 *
 * @category Types
 * @typeparam T - The type of items in the array.
 *
 * @example
 * type ExampleType = ItemOrArray<number>;
 * const value1: ExampleType = 42; // A single number
 * const value2: ExampleType = [1, 2, 3]; // An array of numbers
 */
export type ItemOrArray<T = any> = T | T[];

/**
 * The `NewMissionPoolArgs` type represents the arguments needed to create a new mission pool in the Honeycomb Protocol.
 *
 * @category Types
 * @property args - The `CreateMissionPoolArgs` object containing the necessary data to create the mission pool,
 *                along with optional properties `collections` and `creators`.
 * @property project - An optional `HoneycombProject` object representing the project associated with the mission pool.
 *
 * @example
 * const args: NewMissionPoolArgs = {
 *   args: {
 *     name: "Mission Pool 1",
 *     ... (other properties from CreateMissionPoolArgs)
 *     stakingPools: [stakingPool1, stakingPool2],
 *   },
 *   project: honeycombProject, // Optional, if not provided, it will use the default project
 * };
 */
export type NewMissionPoolArgs = {
  args: CreateMissionPoolArgs & {
    stakingPools?: PublicKey[];
    guildKits?: PublicKey[];
  };
  project: PublicKey;
};

/**
 * The `NewMissionPoolArgs` type represents the arguments needed to create a new mission pool in the Honeycomb Protocol.
 *
 * @category Types
 * @property args - The `CreateMissionPoolArgs` object containing the necessary data to create the mission pool,
 *                along with optional properties `collections` and `creators`.
 * @property project - An optional `HoneycombProject` object representing the project associated with the mission pool.
 *
 * @example
 * const args: NewMissionPoolArgs = {
 *   args: {
 *     name: "Mission Pool 1",
 *     ... (other properties from CreateMissionPoolArgs)
 *     stakingPools: [stakingPool1, stakingPool2],
 *   },
 *   project: honeycombProject, // Optional, if not provided, it will use the default project
 * };
 */
export type NewMissionArgs = {
  args: CreateMissionArgs;
  project: PublicKey;
  pool: PublicKey;
};

export interface OffchainParticipation {
  _id: string;
  wallet: string;
  mission: string;
  instrument: { __kind: "Nft" | "Guild"; address: string };
  endTime: string;
  isRecalled: boolean;
  rewards: EarnedReward[];
  updatedAt: string;
}
