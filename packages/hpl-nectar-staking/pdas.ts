import * as web3 from "@solana/web3.js";
import { PROGRAM_ID } from "./generated";

type MetadataPDaType =
  | { __kind: "edition" }
  | { __kind: "token_record"; tokenAccount: web3.PublicKey }
  | { __kind: "persistent_delegate"; tokenAccountOwner: web3.PublicKey };

export const METADATA_PROGRAM_ID = new web3.PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);
// Metaplex
export const getMetadataAccount_ = (
  mint: web3.PublicKey,
  type?: MetadataPDaType,
  programId = METADATA_PROGRAM_ID
) => {
  const seeds = [
    Buffer.from("metadata"),
    programId.toBuffer(),
    mint.toBuffer(),
  ];

  if (type) {
    seeds.push(Buffer.from(type.__kind));
    switch (type.__kind) {
      case "token_record":
        seeds.push(type.tokenAccount.toBuffer());
        break;
      case "persistent_delegate":
        seeds.push(type.tokenAccountOwner.toBuffer());
        break;
      default:
        break;
    }
  }

  return web3.PublicKey.findProgramAddressSync(seeds, programId);
};

export const getStakingPoolPda = (
  project: web3.PublicKey,
  key: web3.PublicKey,
  programId: web3.PublicKey = PROGRAM_ID
) => {
  return web3.PublicKey.findProgramAddressSync(
    [Buffer.from("staking_pool"), project.toBuffer(), key.toBuffer()],
    programId
  );
};

export const getVaultPda = (
  pool: web3.PublicKey,
  rewardMint: web3.PublicKey,
  programId: web3.PublicKey = PROGRAM_ID
) => {
  return web3.PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), pool.toBuffer(), rewardMint.toBuffer()],
    programId
  );
};

export const getStakerPda = (
  pool: web3.PublicKey,
  wallet: web3.PublicKey,
  programId: web3.PublicKey = PROGRAM_ID
) => {
  return web3.PublicKey.findProgramAddressSync(
    [Buffer.from("staker"), wallet.toBuffer(), pool.toBuffer()],
    programId
  );
};

export const getNftPda = (
  pool: web3.PublicKey,
  mint: web3.PublicKey,
  programId: web3.PublicKey = PROGRAM_ID
) => {
  return web3.PublicKey.findProgramAddressSync(
    [Buffer.from("nft"), mint.toBuffer(), pool.toBuffer()],
    programId
  );
};

export const getDepositPda = (
  nftMint: web3.PublicKey,
  programId = PROGRAM_ID
) => {
  return web3.PublicKey.findProgramAddressSync(
    [Buffer.from("deposit"), nftMint.toBuffer()],
    programId
  );
};

export const getMultipliersPda = (
  pool: web3.PublicKey,
  programId = PROGRAM_ID
) =>
  web3.PublicKey.findProgramAddressSync(
    [Buffer.from("multipliers"), pool.toBuffer()],
    programId
  );
