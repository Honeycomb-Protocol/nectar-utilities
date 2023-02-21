import * as web3 from "@solana/web3.js";

import {
  PROGRAM_ID,
  Multipliers,
  NFT,
  Staker,
  MultipliersArgs,
} from "./generated";
import { Context } from "./types";

export const createCtx = (
  instructions: (web3.TransactionInstruction | web3.Transaction)[],
  signers: web3.Signer[] = []
): Context => ({
  tx: new web3.Transaction().add(...instructions),
  signers,
  accounts: instructions.flatMap((x) =>
    x instanceof web3.TransactionInstruction
      ? x.keys.map((k) => k.pubkey)
      : x.instructions.flatMap((i) => i.keys.map((k) => k.pubkey))
  ),
});

export const getOrFetchMultipliers = async (
  connection: web3.Connection,
  project: web3.PublicKey,
  programId = PROGRAM_ID
): Promise<(MultipliersArgs & { address: web3.PublicKey }) | null> => {
  const [multipliers] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("multipliers"), project.toBuffer()],
    programId
  );
  try {
    return {
      ...(await Multipliers.fromAccountAddress(connection, multipliers)),
      address: multipliers,
    };
  } catch {
    return null;
  }
};

export const getOrFetchStaker = async (
  connection: web3.Connection,
  wallet: web3.PublicKey,
  project: web3.PublicKey,
  programId = PROGRAM_ID
) => {
  const [staker] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("staker"), wallet.toBuffer(), project.toBuffer()],
    programId
  );
  try {
    return {
      ...(await Staker.fromAccountAddress(connection, staker)),
      address: staker,
    };
  } catch {
    return null;
  }
};

export const getOrFetchNft = async (
  connection: web3.Connection,
  nftMint: web3.PublicKey,
  project: web3.PublicKey,
  programId = PROGRAM_ID
) => {
  const [nft] = web3.PublicKey.findProgramAddressSync(
    [Buffer.from("nft"), nftMint.toBuffer(), project.toBuffer()],
    programId
  );
  try {
    return {
      ...(await NFT.fromAccountAddress(connection, nft)),
      address: nft,
    };
  } catch {
    return null;
  }
};
