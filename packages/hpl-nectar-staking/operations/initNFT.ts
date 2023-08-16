import * as web3 from "@solana/web3.js";
import {
  createInitCnftInstruction,
  createInitNftInstruction,
  PROGRAM_ID,
} from "../generated";
import { getMetadataAccount_, getNftPda } from "../pdas";
import { VAULT, Operation, Honeycomb } from "@honeycomb-protocol/hive-control";
import { NectarStaking } from "../NectarStaking";
import {
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
} from "@solana/spl-account-compression";
import { AvailableNft } from "../types";
import { fetchAssetProof } from "./fetch";

/**
 * Represents the arguments required to create an initialization NFT operation.
 * @category Types
 */
type CreateInitNftOperationArgs = {
  stakingPool: NectarStaking;
  nft: AvailableNft;
  programId?: web3.PublicKey;
};

/**
 * Creates an initialization NFT operation.
 * This operation initializes an NFT for a staking pool.
 *
 * @category Operation Builder
 * @param honeycomb - The Honeycomb instance to use for creating the operation.
 * @param args - The arguments required to create the initialization NFT operation.
 * @returns An object containing the created operation.
 *
 * @example
 * // Assuming you have initialized the `honeycomb` instance and imported necessary types
 *
 * const stakingPool = new NectarStaking(honeycomb, "your_staking_pool_address");
 * const nftMint = new web3.PublicKey("your_nft_mint_address");
 *
 * const createInitArgs: CreateInitNftOperationArgs = {
 *   stakingPool,
 *   nftMint,
 * };
 *
 * const operationResult = await createInitNFTOperation(honeycomb, createInitArgs);
 * console.log("Created operation:", operationResult.operation);
 */
export async function createInitNFTOperation(
  honeycomb: Honeycomb,
  args: CreateInitNftOperationArgs
) {
  const programId = args.programId || PROGRAM_ID;

  // Get the PDA account for the NFT and its metadata
  const [nft] = getNftPda(args.stakingPool.address, args.nft.mint, programId);

  const instructions: web3.TransactionInstruction[] = [];

  if (args.nft.isCompressed) {
    const proof = await fetchAssetProof(
      args.stakingPool.helius_rpc,
      args.nft.mint
    );

    instructions.push(
      createInitCnftInstruction(
        {
          project: args.stakingPool.project().address,
          vault: VAULT,
          stakingPool: args.stakingPool.address,
          nft,
          assetId: args.nft.mint,
          merkleTree: args.nft.compression.tree,
          wallet: honeycomb.identity().address,
          delegateAuthority:
            honeycomb.identity().delegateAuthority()?.address || programId,
          compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
          logWrapper: SPL_NOOP_PROGRAM_ID,
          clock: web3.SYSVAR_CLOCK_PUBKEY,
          instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
          anchorRemainingAccounts: proof.proof.map((p) => ({
            pubkey: p,
            isSigner: false,
            isWritable: false,
          })),
        },
        {
          args: {
            root: proof.root.toBuffer().toJSON().data,
            nonce: args.nft.compression.leafId,
            index: args.nft.compression.leafId,
            creatorHash: args.nft.compression.creatorHash.toBuffer().toJSON()
              .data,
            dataHash: args.nft.compression.dataHash.toBuffer().toJSON().data,
          },
        },
        programId
      )
    );
  } else {
    const [nftMetadata] = getMetadataAccount_(args.nft.mint);
    instructions.push(
      createInitNftInstruction(
        {
          project: args.stakingPool.project().address,
          vault: VAULT,
          stakingPool: args.stakingPool.address,
          nft,
          nftMetadata,
          nftMint: args.nft.mint,
          wallet: honeycomb.identity().address,
          delegateAuthority:
            honeycomb.identity().delegateAuthority()?.address || programId,
          logWrapper: SPL_NOOP_PROGRAM_ID,
          clock: web3.SYSVAR_CLOCK_PUBKEY,
          instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        },
        programId
      )
    );
  }

  // Return the operation as an object
  return {
    operation: new Operation(honeycomb, instructions),
  };
}
