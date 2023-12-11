import * as web3 from "@solana/web3.js";
import {
  createInitCnftInstruction,
  createInitNftInstruction,
  PROGRAM_ID,
} from "../../generated";
import {
  VAULT,
  Operation,
  Honeycomb,
  HPL_HIVE_CONTROL_PROGRAM,
} from "@honeycomb-protocol/hive-control";
import { NectarStaking } from "../../NectarStaking";
import { SPL_ACCOUNT_COMPRESSION_PROGRAM_ID } from "@solana/spl-account-compression";
import { AssetProof, AvailableNft } from "../../types";
import { HPL_EVENTS_PROGRAM } from "@honeycomb-protocol/events";
import { fetchAssetProof } from "packages/hpl-nectar-staking/utils";
import { metadataPda } from "@honeycomb-protocol/currency-manager";

/**
 * Represents the arguments required to create an initialization NFT operation.
 * @category Types
 */
type CreateInitNftOperationArgs = {
  stakingPool: NectarStaking;
  nft: AvailableNft;
  proof?: AssetProof;
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
  args: CreateInitNftOperationArgs,
  luts: web3.AddressLookupTableAccount[] = []
) {
  const programId = args.programId || PROGRAM_ID;

  // Get the PDA account for the NFT and its metadata
  const [nft] = honeycomb
    .pda()
    .nectarStaking()
    .nft(args.stakingPool.address, args.nft.mint, programId);

  const instructions: web3.TransactionInstruction[] = [];

  if (args.nft.isCompressed) {
    if (!args.proof)
      args.proof = await fetchAssetProof(
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
          hiveControl: HPL_HIVE_CONTROL_PROGRAM,
          compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
          hplEvents: HPL_EVENTS_PROGRAM,
          clock: web3.SYSVAR_CLOCK_PUBKEY,
          creatorHash: args.nft.compression.creatorHash,
          instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
          anchorRemainingAccounts: args.proof.proof.map((p) => ({
            pubkey: p,
            isSigner: false,
            isWritable: false,
          })),
          dataHash: args.nft.compression.dataHash,
          root: args.proof.root,
        },
        {
          args: {
            nonce: args.nft.compression.leafId,
            index: args.nft.compression.leafId,
          },
        },
        programId
      )
    );
  } else {
    const [nftMetadata] = metadataPda(args.nft.mint);
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
          hiveControl: HPL_HIVE_CONTROL_PROGRAM,
          hplEvents: HPL_EVENTS_PROGRAM,
          clock: web3.SYSVAR_CLOCK_PUBKEY,
          instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        },
        programId
      )
    );
  }
  const operation = new Operation(honeycomb, instructions);
  if (luts.length > 0) operation.add_lut(...luts);
  // Return the operation as an object
  return {
    operation,
  };
}
