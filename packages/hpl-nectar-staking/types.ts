import * as web3 from "@solana/web3.js";
import {
  AddMultiplierArgs,
  CreateStakingPoolArgs,
  MultipliersArgs,
  UpdateStakingPoolArgs,
} from "./generated";

/**
 * Represents the arguments for creating a new staking pool.
 * @category Types
 */
export type NewStakingPoolArgs = {
  args: CreateStakingPoolArgs;
  project: web3.PublicKey;
  currency: web3.PublicKey;
  collections?: web3.PublicKey[];
  creators?: web3.PublicKey[];
  merkleTrees?: web3.PublicKey[];
  multipliers?: AddMultiplierArgs[];
  multipliersDecimals?: number;
};

/**
 * Represents the arguments for updating a staking pool.
 * @category Types
 */
export type UpdatePoolArgs = {
  args: UpdateStakingPoolArgs;
  collection?: web3.PublicKey;
  creator?: web3.PublicKey;
  merkleTree?: web3.PublicKey;
  currency?: web3.PublicKey;
};

/**
 * Represents data for staking multipliers.
 * @category Types
 */
export type StakingMultipliers = MultipliersArgs & {
  address: web3.PublicKey;
};
