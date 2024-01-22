import * as web3 from "@solana/web3.js";
import { createStakeInstruction, PROGRAM_ID } from "../../generated";
import {
  VAULT,
  Honeycomb,
  Operation,
  HPL_HIVE_CONTROL_PROGRAM,
} from "@honeycomb-protocol/hive-control";
import { NectarStaking } from "../../NectarStaking";
import { HPL_EVENTS_PROGRAM } from "@honeycomb-protocol/events";
import {
  AssetProof,
  HPL_CHARACTER_MANAGER_PROGRAM,
  HplCharacter,
  HplCharacterModel,
} from "@honeycomb-protocol/character-manager";
import {
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
} from "@solana/spl-account-compression";

/**
 * Represents the arguments required to create a stake operation.
 * @category Types
 */
type CreateStakeOperationArgs = {
  stakingPool: NectarStaking;
  characterModel: HplCharacterModel;
  character: HplCharacter;
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

  // Get the PDA account for the staker
  const [staker] = honeycomb
    .pda()
    .staking()
    .staker(args.stakingPool.address, honeycomb.identity().address);

  const proofPack =
    args.proof || (await args.character.proof(honeycomb.rpcEndpoint));

  if (!proofPack) throw new Error("Proof not found for this character");

  const { root, proof } = proofPack;

  const operation = new Operation(honeycomb, [
    web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 300000,
    }),
    createStakeInstruction(
      {
        project: args.stakingPool.project().address,
        characterModel: args.characterModel.address,
        merkleTree: args.character.merkleTree,
        stakingPool: args.stakingPool.address,
        staker,
        wallet: honeycomb.identity().address,
        vault: VAULT,
        hiveControl: HPL_HIVE_CONTROL_PROGRAM,
        characterManager: HPL_CHARACTER_MANAGER_PROGRAM,
        hplEvents: HPL_EVENTS_PROGRAM,
        compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
        logWrapper: SPL_NOOP_PROGRAM_ID,
        clock: web3.SYSVAR_CLOCK_PUBKEY,
        instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        anchorRemainingAccounts: proof.map((pubkey) => ({
          pubkey,
          isSigner: false,
          isWritable: false,
        })),
      },
      {
        args: {
          root: Array.from(root.toBytes()),
          leafIdx: args.character.leafIdx,
          sourceHash: Array.from(args.character.sourceHash),
          usedBy: args.character.usedBy,
        },
      },
      programId
    ),
  ]);
  if (luts.length > 0) operation.add_lut(...luts);
  return {
    operation,
  };
}
