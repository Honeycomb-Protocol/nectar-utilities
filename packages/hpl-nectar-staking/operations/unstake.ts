import * as web3 from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import {
  createUnstakeCnftInstruction,
  createUnstakeInstruction,
  LockType,
  PROGRAM_ID,
} from "../generated";
import { StakedNft } from "../types";
import {
  getMetadataAccount_,
  getDepositPda,
  getNftPda,
  getStakerPda,
  METADATA_PROGRAM_ID,
} from "../pdas";
import { VAULT, Honeycomb, Operation } from "@honeycomb-protocol/hive-control";
import { PROGRAM_ID as BUBBLEGUM_PROGRAM_ID } from "@metaplex-foundation/mpl-bubblegum";
import { PROGRAM_ID as AUTHORIZATION_PROGRAM_ID } from "@metaplex-foundation/mpl-token-auth-rules";
import { NectarStaking } from "../NectarStaking";
import { createClaimRewardsOperation } from "./claimRewards";
import {
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
} from "@solana/spl-account-compression";
import { fetchAssetProof } from "./fetch";

/**
 * Represents the arguments required to create an unstake operation.
 * @category Types
 */
type CreateUnstakeOperationArgs = {
  stakingPool: NectarStaking;
  nft: StakedNft;
  isFirst?: boolean;
  programId?: web3.PublicKey;
};

/**
 * Creates an unstake operation to unstake an NFT from the specified staking pool.
 *
 * @category Operation Builder
 * @param honeycomb - The Honeycomb instance to use for creating the operation.
 * @param args - The arguments required to create the unstake operation.
 * @returns An object containing the created operation.
 *
 * @example
 * // Assuming you have initialized the `honeycomb` instance and imported necessary types
 *
 * const stakingPool = new NectarStaking(honeycomb, "your_staking_pool_address");
 *
 * // Assuming you have an initialized `StakedNft` object `stakedNft`
 *
 * const createUnstakeArgs: CreateUnstakeOperationArgs = {
 *   stakingPool,
 *   nft: stakedNft,
 * };
 *
 * const operationResult = await createUnstakeOperation(honeycomb, createUnstakeArgs);
 * console.log("Created unstake operation:", operationResult.operation);
 */
export async function createUnstakeOperation(
  honeycomb: Honeycomb,
  args: CreateUnstakeOperationArgs,
  luts: web3.AddressLookupTableAccount[] = []
) {
  const programId = args.programId || PROGRAM_ID;

  const [nft] = getNftPda(args.stakingPool.address, args.nft.mint);
  const [staker] = getStakerPda(
    args.stakingPool.address,
    honeycomb.identity().address
  );

  // Create the transaction instructions for claiming rewards and unstaking the NFT
  const instructions = [
    ...(await createClaimRewardsOperation(honeycomb, {
      stakingPool: honeycomb.staking(),
      nft: args.nft,
      isFirst: args.isFirst,
      programId: args.programId,
    }).then(({ operation }) => operation.instructions)),
  ];

  if (args.nft.isCompressed) {
    const [treeAuthority] = web3.PublicKey.findProgramAddressSync(
      [args.nft.compression.tree.toBuffer()],
      BUBBLEGUM_PROGRAM_ID
    );

    const proof = await fetchAssetProof(
      args.stakingPool.helius_rpc,
      args.nft.mint
    );

    instructions.push(
      createUnstakeCnftInstruction(
        {
          project: args.stakingPool.project().address,
          vault: VAULT,
          stakingPool: args.stakingPool.address,
          nft,
          treeAuthority,
          merkleTree: args.nft.compression.tree,
          staker,
          wallet: honeycomb.identity().address,
          bubblegumProgram: BUBBLEGUM_PROGRAM_ID,
          compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
          logWrapper: SPL_NOOP_PROGRAM_ID,
          clock: web3.SYSVAR_CLOCK_PUBKEY,
          instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        },
        {
          args: {
            root: proof.root.toBuffer().toJSON().data,
            nonce: args.nft.compression.leafId,
            index: args.nft.compression.leafId,
            dataHash: args.nft.compression.dataHash.toBuffer().toJSON().data,
            creatorHash: args.nft.compression.creatorHash.toBuffer().toJSON()
              .data,
          },
        },
        programId
      )
    );
  } else {
    const nftAccount = splToken.getAssociatedTokenAddressSync(
      args.nft.mint,
      honeycomb.identity().address
    );
    const [nftMetadata] = getMetadataAccount_(args.nft.mint);
    const [nftEdition] = getMetadataAccount_(args.nft.mint, {
      __kind: "edition",
    });

    let nftTokenRecord: web3.PublicKey | undefined,
      depositAccount: web3.PublicKey | undefined,
      depositTokenRecord: web3.PublicKey | undefined;

    if (args.stakingPool.lockType === LockType.Custoday) {
      [depositAccount] = getDepositPda(args.nft.mint);
    }

    if (args.nft.isProgrammableNft) {
      [nftTokenRecord] = getMetadataAccount_(args.nft.mint, {
        __kind: "token_record",
        tokenAccount: nftAccount,
      });
      if (depositAccount && args.stakingPool.lockType === LockType.Custoday) {
        [depositTokenRecord] = getMetadataAccount_(args.nft.mint, {
          __kind: "token_record",
          tokenAccount: depositAccount,
        });
      }
    }

    instructions.push(
      createUnstakeInstruction(
        {
          project: args.stakingPool.project().address,
          vault: VAULT,
          stakingPool: args.stakingPool.address,
          nft,
          nftMint: args.nft.mint,
          nftAccount,
          nftMetadata,
          nftEdition,
          nftTokenRecord: nftTokenRecord || programId,
          depositAccount: depositAccount || programId,
          depositTokenRecord: depositTokenRecord || programId,
          staker,
          wallet: honeycomb.identity().address,
          associatedTokenProgram: splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenMetadataProgram: METADATA_PROGRAM_ID,
          clock: web3.SYSVAR_CLOCK_PUBKEY,
          instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
          authorizationRulesProgram: args.nft.programmableConfig?.ruleSet
            ? AUTHORIZATION_PROGRAM_ID
            : programId,
          authorizationRules: args.nft.programmableConfig?.ruleSet || programId,
          logWrapper: SPL_NOOP_PROGRAM_ID,
        },
        programId
      )
    );
  }
  const operation = new Operation(honeycomb, instructions);
  if (luts.length > 0) operation.add_lut(...luts);

  return {
    operation,
  };
}
