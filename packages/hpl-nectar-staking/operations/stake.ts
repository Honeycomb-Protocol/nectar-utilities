import * as web3 from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import { createStakeInstruction, LockType, PROGRAM_ID } from "../generated";
import { AvailableNft } from "../types";
import { TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import {
  getMetadataAccount_,
  getDepositPda,
  getNftPda,
  getStakerPda,
  METADATA_PROGRAM_ID,
} from "../pdas";
import { VAULT, Honeycomb, Operation } from "@honeycomb-protocol/hive-control";
import { PROGRAM_ID as AUTHORIZATION_PROGRAM_ID } from "@metaplex-foundation/mpl-token-auth-rules";
import { NectarStaking } from "../NectarStaking";
import { createInitNFTOperation } from "./initNFT";
import { createInitStakerOperation } from "./initStaker";
import { SPL_NOOP_PROGRAM_ID } from "@solana/spl-account-compression";

/**
 * Represents the arguments required to create a stake operation.
 * @category Types
 */
type CreateStakeOperationArgs = {
  stakingPool: NectarStaking;
  nft: AvailableNft;
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
  args: CreateStakeOperationArgs
) {
  const programId = args.programId || PROGRAM_ID;

  // Get the PDA account for the NFT
  const [nft] = getNftPda(args.stakingPool.address, args.nft.tokenMint);

  // Get the associated token address for the NFT account
  const nftAccount = splToken.getAssociatedTokenAddressSync(
    args.nft.tokenMint,
    honeycomb.identity().address
  );

  // Get metadata accounts for NFT
  const [nftMetadata] = getMetadataAccount_(args.nft.tokenMint);
  const [nftEdition] = getMetadataAccount_(args.nft.tokenMint, {
    __kind: "edition",
  });

  // Get the PDA account for the staker
  const [staker] = getStakerPda(
    args.stakingPool.address,
    honeycomb.identity().address
  );

  let nftTokenRecord: web3.PublicKey | undefined,
    depositAccount: web3.PublicKey | undefined,
    depositTokenRecord: web3.PublicKey | undefined;

  if (args.stakingPool.lockType === LockType.Custoday) {
    [depositAccount] = getDepositPda(nft);
  }

  if (args.nft.tokenStandard === TokenStandard.ProgrammableNonFungible) {
    [nftTokenRecord] = getMetadataAccount_(args.nft.tokenMint, {
      __kind: "token_record",
      tokenAccount: nftAccount,
    });
    if (depositAccount && args.stakingPool.lockType === LockType.Custoday) {
      [depositTokenRecord] = getMetadataAccount_(args.nft.tokenMint, {
        __kind: "token_record",
        tokenAccount: depositAccount,
      });
    }
  }

  // Create the transaction instruction for staking the NFT
  const instructions = [
    web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 400_000,
    }),
    createStakeInstruction(
      {
        project: args.stakingPool.project().address,
        vault: VAULT,
        stakingPool: args.stakingPool.address,
        nft,
        nftMint: args.nft.tokenMint,
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
    ),
  ];

  if (args.isFirst) {
    try {
      await args.stakingPool
        .fetch()
        .staker({ wallet: honeycomb.identity().address });
    } catch {
      createInitStakerOperation(honeycomb, {
        stakingPool: args.stakingPool,
        programId: args.programId,
      }).then(({ operation }) =>
        instructions.unshift(...operation.instructions)
      );
    }
  }

  try {
    const nft = await args.stakingPool.fetch().nft(args.nft.tokenMint).catch();
    if (!nft) throw new Error("NFT not initialized");
  } catch {
    await createInitNFTOperation(honeycomb, {
      stakingPool: args.stakingPool,
      nftMint: args.nft.tokenMint,
      programId: args.programId,
    }).then(({ operation }) => instructions.unshift(...operation.instructions));
  }

  return {
    operation: new Operation(honeycomb, instructions),
  };
}
