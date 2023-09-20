import * as web3 from "@solana/web3.js";
import { PROGRAM_ID } from "./generated";
import { findProgramAddressSyncWithSeeds } from "@honeycomb-protocol/hive-control";

/**
 * The `MetadataPDaType` type represents different types of Program Derived Accounts (PDAs)
 * related to the metadata program used in the context of NFTs (Non-Fungible Tokens) and
 * metadata on the Solana blockchain.
 *
 * This type is used to differentiate between various types of PDAs used in the metadata program.
 * Depending on the use case, the `MetadataPDaType` can take one of the following shapes:
 *
 * - { __kind: "edition" }: Represents an edition PDA used to manage editions of an NFT.
 * - { __kind: "token_record"; tokenAccount: web3.PublicKey }: Represents a token record PDA
 *   used to manage token records for a specific NFT.
 * - { __kind: "persistent_delegate"; tokenAccountOwner: web3.PublicKey }: Represents a persistent
 *   delegate PDA used to manage token metadata for a delegate account owner.
 *
 * These PDAs are used to store and manage various aspects of NFTs and their metadata on the Solana blockchain.
 * The specific PDA type depends on the context and requirements of the application utilizing the metadata program.
 *
 * @category Types
 * @see MetadataProgramId The public key of the metadata program used to find the corresponding PDAs.
 */
type MetadataPDaType =
  | { __kind: "edition" }
  | { __kind: "token_record"; tokenAccount: web3.PublicKey }
  | { __kind: "persistent_delegate"; tokenAccountOwner: web3.PublicKey };

export const METADATA_PROGRAM_ID = new web3.PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);
/**
 *
 * Generates a Program Derived Address for the metadata account associated with a specific mint and type.
 * @category Helpers
 * @param mint The mint's public key.
 * @param type Optional MetadataPDaType parameter specifying the type of metadata account.
 * @param programId The program ID for the metadata program. Default is METADATA_PROGRAM_ID.
 * @returns The generated Program Derived Address.
 * @example
 * const mintPublicKey = new web3.PublicKey("..."); // Replace with actual mint public key
 * const metadataPda = getMetadataAccount_(mintPublicKey);
 */
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

  return findProgramAddressSyncWithSeeds(seeds, programId);
};

/**
 * Generates a Program Derived Address for a staking pool based on the project's public key and a key.
 * @category Helpers
 * @param project The project's public key.
 * @param key The key for the staking pool.
 * @param programId The program ID for the staking pool program. Default is PROGRAM_ID.
 * @returns The generated Program Derived Address.
 * @example
 * const projectPublicKey = new web3.PublicKey("..."); // Replace with actual project public key
 * const poolKey = new web3.PublicKey("..."); // Replace with actual pool key
 * const stakingPoolPda = getStakingPoolPda(projectPublicKey, poolKey);
 */
export const getStakingPoolPda = (
  project: web3.PublicKey,
  key: web3.PublicKey,
  programId: web3.PublicKey = PROGRAM_ID
) => {
  return findProgramAddressSyncWithSeeds(
    [Buffer.from("staking_pool"), project.toBuffer(), key.toBuffer()],
    programId
  );
};

/**
 * Generates a Program Derived Address for a staker in a specific pool based on the pool's public key and the staker's wallet public key.
 * @category Helpers
 * @param pool The pool's public key.
 * @param wallet The staker's wallet public key.
 * @param programId The program ID for the staking pool program. Default is PROGRAM_ID.
 * @returns The generated Program Derived Address.
 * @example
 * const poolPublicKey = new web3.PublicKey("..."); // Replace with actual pool public key
 * const walletPublicKey = new web3.PublicKey("..."); // Replace with actual wallet public key
 * const stakerPda = getStakerPda(poolPublicKey, walletPublicKey);
 */
export const getStakerPda = (
  pool: web3.PublicKey,
  wallet: web3.PublicKey,
  programId: web3.PublicKey = PROGRAM_ID
) => {
  return findProgramAddressSyncWithSeeds(
    [Buffer.from("staker"), wallet.toBuffer(), pool.toBuffer()],
    programId
  );
};

/**
 * Generates a Program Derived Address for an NFT (Non-Fungible Token) in a specific pool based on the pool's public key and the NFT's mint public key.
 * @category Helpers
 * @param pool The pool's public key.
 * @param mint The NFT's mint public key.
 * @param programId The program ID for the staking pool program. Default is PROGRAM_ID.
 * @returns The generated Program Derived Address.
 * @example
 * const poolPublicKey = new web3.PublicKey("..."); // Replace with actual pool public key
 * const mintPublicKey = new web3.PublicKey("..."); // Replace with actual NFT mint public key
 * const nftPda = getNftPda(poolPublicKey, mintPublicKey);
 */
export const getNftPda = (
  pool: web3.PublicKey,
  mint: web3.PublicKey,
  programId: web3.PublicKey = PROGRAM_ID
) => {
  return findProgramAddressSyncWithSeeds(
    [Buffer.from("nft"), mint.toBuffer(), pool.toBuffer()],
    programId
  );
};

/**
 * Generates a Program Derived Address for a deposit based on the NFT mint's public key.
 * @category Helpers
 * @param nftMint The NFT mint's public key.
 * @param programId The program ID for the staking pool program. Default is PROGRAM_ID.
 * @returns The generated Program Derived Address.
 * @example
 * const mintPublicKey = new web3.PublicKey("..."); // Replace with actual NFT mint public key
 * const depositPda = getDepositPda(mintPublicKey);
 */
export const getDepositPda = (
  nftMint: web3.PublicKey,
  programId = PROGRAM_ID
) => {
  return findProgramAddressSyncWithSeeds(
    [Buffer.from("deposit"), nftMint.toBuffer()],
    programId
  );
};

/**
 * Generates a Program Derived Address for multipliers based on a pool's public key.
 * @category Helpers
 * @param pool The pool's public key.
 * @param programId The program ID for the staking pool program. Default is PROGRAM_ID.
 * @returns The generated Program Derived Address.
 * @example
 * const poolPublicKey = new web3.PublicKey("..."); // Replace with actual pool public key
 * const multipliersPda = getMultipliersPda(poolPublicKey);
 */
export const getMultipliersPda = (
  pool: web3.PublicKey,
  programId = PROGRAM_ID
) =>
  findProgramAddressSyncWithSeeds(
    [Buffer.from("multipliers"), pool.toBuffer()],
    programId
  );
