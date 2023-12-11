import * as web3 from "@solana/web3.js";
import {
  AddMultiplierArgs,
  CreateStakingPoolArgs,
  MultipliersArgs,
  NFTv1Args,
  UpdateStakingPoolArgs,
} from "./generated";
import { TokenRecord } from "@metaplex-foundation/mpl-token-metadata";
import { HoneycombProject } from "@honeycomb-protocol/hive-control";
import { HplCurrency } from "@honeycomb-protocol/currency-manager";

/**
 * Represents the asset data responded by helius RPC.
 * @category Types
 */
export interface HeluisAsset {
  interface: string;
  id: string;
  content: {
    $schema: string;
    json_uri: string;
    files: {
      uri: string;
      cdn_uri: string;
      mime: string;
    }[];
    metadata: {
      name: string;
      symbol: string;
      attributes?: {
        value: string;
        trait_type: string;
      }[];
      description?: string;
      token_standard?: string;
      [key: string]: unknown;
    };
    links: {
      image?: string;
      [key: string]: string;
    };
  };
  authorities: {
    address: string;
    scopes: string[];
  }[];
  compression: {
    eligible: boolean;
    compressed: boolean;
    data_hash: string;
    creator_hash: string;
    asset_hash: string;
    tree: string;
    seq: number;
    leaf_id: number;
  };
  grouping: {
    group_key: string;
    group_value: string;
  }[];
  royalty: {
    royalty_model: string;
    target: any;
    percent: number;
    basis_points: number;
    primary_sale_happened: boolean;
    locked: boolean;
  };
  creators: {
    address: string;
    share: number;
    verified: boolean;
  }[];
  ownership: {
    frozen: boolean;
    delegated: boolean;
    delegate?: string;
    ownership_model: string;
    owner: string;
  };
  supply?: {
    print_max_supply: number;
    print_current_supply: number;
    edition_nonce: any;
  };
  mutable: boolean;
  burnt: boolean;
}

/**
 * Represents the metadata of an NFT.
 * @category Types
 */
export type Metadata = {
  mint: web3.PublicKey;
  json?: JsonMetadata | null;
  jsonLoaded: boolean;
  name: string;
  symbol: string;
  uri: string;
  creators: {
    address: web3.PublicKey;
    share: number;
    verified: boolean;
  }[];
  collection?: {
    verified: boolean;
    address: web3.PublicKey;
  } | null;
  frozen: boolean;

  isProgrammableNft?: boolean | null;
  programmableConfig?: { ruleSet: web3.PublicKey } | null;

  compression?: {
    leafId: number;
    dataHash: web3.PublicKey;
    creatorHash: web3.PublicKey;
    assetHash: web3.PublicKey;
    tree: web3.PublicKey;
    proof?: AssetProof;
  } | null;
  isCompressed: boolean;

  links?: {
    [key: string]: string;
  } | null;
};

/**
 * Represents the proof data of cNFT for merkle tree.
 * @category Types
 */
export interface AssetProof {
  root: web3.PublicKey;
  proof: web3.PublicKey[];
  node_index: number;
  leaf: web3.PublicKey;
  tree_id: web3.PublicKey;
}

/**
 * Represents the uri data of an NFT.
 * @category Types
 */
export type JsonMetadata = {
  name?: string;
  symbol?: string;
  description?: string;
  seller_fee_basis_points?: number;
  image?: string;
  external_url?: string;
  attributes?: Array<{
    trait_type?: string;
    value?: string;
    [key: string]: unknown;
  }>;
  properties?: {
    creators?: Array<{
      address?: string;
      share?: number;
      [key: string]: unknown;
    }>;
    files?: Array<{
      type?: string;
      uri?: string;
      [key: string]: unknown;
    }>;
    [key: string]: unknown;
  };
  collection?: {
    name?: string;
    family?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

/**
 * Represents a staked NFT.
 * @category Types
 */
export type StakedNft = Metadata & NFTv1Args;

/**
 * Represents the available NFT.
 * @category Types
 */
export type AvailableNft = Metadata & { tokenRecord?: TokenRecord };

/**
 * Represents the arguments for creating a new staking pool.
 * @category Types
 */
export type NewStakingPoolArgs = {
  args: CreateStakingPoolArgs;
  project: HoneycombProject;
  currency: HplCurrency;
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
