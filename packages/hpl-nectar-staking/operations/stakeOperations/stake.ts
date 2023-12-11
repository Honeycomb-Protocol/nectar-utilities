import * as web3 from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import {
  createStakeCnftInstruction,
  createStakeInstruction,
  LockType,
  PROGRAM_ID,
} from "../../generated";
import { AssetProof, AvailableNft } from "../../types";
import { PROGRAM_ID as BUBBLEGUM_PROGRAM_ID } from "@metaplex-foundation/mpl-bubblegum";
import { PROGRAM_ID as AUTHORIZATION_PROGRAM_ID } from "@metaplex-foundation/mpl-token-auth-rules";
import {
  VAULT,
  Honeycomb,
  Operation,
  HPL_HIVE_CONTROL_PROGRAM,
} from "@honeycomb-protocol/hive-control";
import { NectarStaking } from "../../NectarStaking";
import { createInitStakerOperation } from "../miscOperations/initStaker";
import {
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
} from "@solana/spl-account-compression";
import { HPL_EVENTS_PROGRAM } from "@honeycomb-protocol/events";
import { fetchAssetProof } from "../../utils";
import {
  METADATA_PROGRAM_ID,
  metadataPda,
} from "@honeycomb-protocol/currency-manager";

/**
 * Represents the arguments required to create a stake operation.
 * @category Types
 */
type CreateStakeOperationArgs = {
  stakingPool: NectarStaking;
  nft: AvailableNft;
  proof?: AssetProof;
  isFirst?: boolean;
  programId?: web3.PublicKey;
};

/**
 * Creates a stake operation to stake an NFT into the specified staking pool.
 *
 * @category Operation Builder
 * @param honeycomb - The Honeycomb instance to use for creating the operation.
 * @param args - The arguments required to create the stake operation.
 * @returns An object containing the created operation.
 *
 * @example
 * // Assuming you have initialized the `honeycomb` instance and imported necessary types
 *
 * const stakingPool = new NectarStaking(honeycomb, "your_staking_pool_address");
 * const nftMint = new web3.PublicKey("your_nft_mint_address");
 *
 * const availableNft: AvailableNft = {
 *   address: new web3.PublicKey("your_nft_account_address"),
 *   tokenMint: nftMint,
 *   tokenStandard: TokenStandard.ProgrammableNonFungible, // or TokenStandard.NonFungible
 *   state: "unlocked", // or "frozen"
 *   creator: new web3.PublicKey("nft_creator_address"),
 *   collection: new web3.PublicKey("nft_collection_address"),
 *   creators: [{ address: new web3.PublicKey("nft_creator_address"), share: 100 }],
 *   programmableConfig: {
 *     ruleSet: new web3.PublicKey("authorization_rules_program_address"),
 *     maxStakePerWallet: 10, // Only required for TokenStandard.ProgrammableNonFungible
 *   },
 * };
 *
 * const createStakeArgs: CreateStakeOperationArgs = {
 *   stakingPool,
 *   nft: availableNft,
 * };
 *
 * const operationResult = await createStakeOperation(honeycomb, createStakeArgs);
 * console.log("Created stake operation:", operationResult.operation);
 */
export async function createStakeOperation(
  honeycomb: Honeycomb,
  args: CreateStakeOperationArgs,
  luts: web3.AddressLookupTableAccount[] = []
) {
  const programId = args.programId || PROGRAM_ID;

  // Get the PDA account for the NFT
  const [nft] = honeycomb
    .pda()
    .nectarStaking()
    .nft(args.stakingPool.address, args.nft.mint, programId);

  // Get the PDA account for the staker
  const [staker] = honeycomb
    .pda()
    .nectarStaking()
    .staker(args.stakingPool.address, honeycomb.identity().address);

  // Create the transaction instruction for staking the NFT
  let units = 500_000;
  const instructions: web3.TransactionInstruction[] =
    await createInitStakerOperation(honeycomb, {
      pool: args.stakingPool.address,
      project: args.stakingPool.project().address,
      wallet: honeycomb.identity().address,
      programId: args.programId,
    }).then(({ operation }) => operation.instructions);

  if (args.nft.isCompressed) {
    units += 100_000;
    const [treeAuthority] = web3.PublicKey.findProgramAddressSync(
      [args.nft.compression.tree.toBuffer()],
      BUBBLEGUM_PROGRAM_ID
    );

    if (!args.proof && !args.nft.compression.proof)
      args.nft.compression.proof = await fetchAssetProof(
        args.stakingPool.helius_rpc,
        args.nft.mint
      );

    instructions.push(
      createStakeCnftInstruction(
        {
          project: args.stakingPool.project().address,
          vault: VAULT,
          stakingPool: args.stakingPool.address,
          nft,
          merkleTree: args.nft.compression.tree,
          treeAuthority,
          staker,
          wallet: honeycomb.identity().address,
          creatorHash: args.nft.compression.creatorHash,
          hiveControl: HPL_HIVE_CONTROL_PROGRAM,
          bubblegumProgram: BUBBLEGUM_PROGRAM_ID,
          compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
          hplEvents: HPL_EVENTS_PROGRAM,
          logWrapper: SPL_NOOP_PROGRAM_ID,
          clock: web3.SYSVAR_CLOCK_PUBKEY,
          instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
          dataHash: args.nft.compression.dataHash,
          root: (args.proof || args.nft.compression.proof).root,
          anchorRemainingAccounts: (
            args.proof || args.nft.compression.proof
          ).proof.map((p) => ({
            pubkey: p,
            isSigner: false,
            isWritable: false,
          })),
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
    // Get the associated token address for the NFT account
    const nftAccount = splToken.getAssociatedTokenAddressSync(
      args.nft.mint,
      honeycomb.identity().address
    );

    // Get metadata accounts for NFT
    const [nftMetadata] = metadataPda(args.nft.mint);
    const [nftEdition] = metadataPda(args.nft.mint, {
      __kind: "edition",
    });

    let nftTokenRecord: web3.PublicKey | undefined,
      depositAccount: web3.PublicKey | undefined,
      depositTokenRecord: web3.PublicKey | undefined;

    if (args.stakingPool.lockType === LockType.Custoday) {
      [depositAccount] = honeycomb.pda().nectarStaking().deposit(nft);
    }

    if (args.nft.isProgrammableNft) {
      units += 500_000;

      [nftTokenRecord] = metadataPda(args.nft.mint, {
        __kind: "token_record",
        tokenAccount: nftAccount,
      });
      if (depositAccount && args.stakingPool.lockType === LockType.Custoday) {
        [depositTokenRecord] = metadataPda(args.nft.mint, {
          __kind: "token_record",
          tokenAccount: depositAccount,
        });
      }
    }

    instructions.push(
      createStakeInstruction(
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
          hiveControl: HPL_HIVE_CONTROL_PROGRAM,
          associatedTokenProgram: splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenMetadataProgram: METADATA_PROGRAM_ID,
          clock: web3.SYSVAR_CLOCK_PUBKEY,
          instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
          authorizationRulesProgram: args.nft.programmableConfig?.ruleSet
            ? AUTHORIZATION_PROGRAM_ID
            : programId,
          authorizationRules: args.nft.programmableConfig?.ruleSet || programId,
          hplEvents: HPL_EVENTS_PROGRAM,
        },
        programId
      )
    );
  }

  instructions.unshift(
    web3.ComputeBudgetProgram.setComputeUnitLimit({
      units,
    })
  );
  const operation = new Operation(honeycomb, instructions);
  if (luts.length > 0) operation.add_lut(...luts);
  return {
    operation,
  };
}
