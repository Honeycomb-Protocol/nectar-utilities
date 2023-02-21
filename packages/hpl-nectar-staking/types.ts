import { Metadata } from "@metaplex-foundation/js";
import * as web3 from "@solana/web3.js";
import { NFT } from "./generated";

export type Context = {
  tx: web3.Transaction;
  signers: web3.Signer[];
  accounts: web3.PublicKey[];
};

export type TxSignersAccounts = Context;

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

export type StakedNft = Metadata & NFT;
export type AvailableNft = Metadata & TokenAccountInfo;
