import * as web3 from "@solana/web3.js";
import { NFTv1Args } from "./generated";
import {
  ProgrammableConfig,
  TokenRecord,
  TokenStandard,
} from "@metaplex-foundation/mpl-token-metadata";

/**
 * Represents the information about a token account.
 * @category Types
 */
export type TokenAccountInfo = {
  tokenMint: web3.PublicKey;
  owner: string;
  state: "frozen" | string;
  tokenAmount: {
    amount: string;
    decimals: number;
    uiAmount: number;
    uiAmountString: string;
  };
};

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
  tokenStandard?: TokenStandard | null;
  programmableConfig?: ProgrammableConfig | null;
  creators: {
    address: web3.PublicKey;
    share: number;
    verified: boolean;
  }[];
  collection?: {
    verified: boolean;
    address: web3.PublicKey;
  } | null;
  merkleTree?: web3.PublicKey | null;
  isCompressed: boolean;
  frozen: boolean;
};

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
