// import * as web3 from "@solana/web3.js";
// import { createClaimRewardsInstruction, PROGRAM_ID } from "../../generated";
// import {
//   Honeycomb,
//   HPL_HIVE_CONTROL_PROGRAM,
//   Operation,
//   VAULT,
// } from "@honeycomb-protocol/hive-control";
// import {
//   PROGRAM_ID as HPL_CURRENCY_MANAGER_PROGRAM_ID,
//   createCreateHolderAccountOperation,
// } from "@honeycomb-protocol/currency-manager";
// import { NectarStaking } from "../../NectarStaking";
// import { HPL_EVENTS_PROGRAM } from "@honeycomb-protocol/events";
// import {
//   HPL_CHARACTER_MANAGER_PROGRAM,
//   HplCharacter,
//   HplCharacterModel,
// } from "@honeycomb-protocol/character-manager";
// import {
//   SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
//   SPL_NOOP_PROGRAM_ID,
// } from "@solana/spl-account-compression";

// /**
//  * Represents the context arguments for creating the ClaimRewards operation.
//  * @category Types
//  */
// type CreateClaimRewardsOperationArgs = {
//   stakingPool: NectarStaking;
//   characterModel: HplCharacterModel;
//   character: HplCharacter;
//   programId?: web3.PublicKey;
// };

// /**
//  * Create an operation to claim rewards for a staked NFT.
//  * @category Operation Builder
//  * @param honeycomb - The Honeycomb instance.
//  * @param args - The context arguments for creating the ClaimRewards operation.
//  * @returns An object containing the ClaimRewards operation.
//  * @example
//  * // Usage example:
//  * const honeycomb = new Honeycomb(connection, wallet);
//  * const stakingPool = await NectarStaking.fromAddress(connection, stakingPoolAddress);
//  * const stakedNft = { mint: nftMintAddress, staker: stakerAddress };
//  * const args = { stakingPool, nft: stakedNft };
//  * const { operation } = await createClaimRewardsOperation(honeycomb, args);
//  * // Send the transaction
//  * const txSignature = await honeycomb.sendTransaction(operation);
//  */
// export async function createClaimRewardsOperation(
//   honeycomb: Honeycomb,
//   args: CreateClaimRewardsOperationArgs,
//   luts: web3.AddressLookupTableAccount[] = []
// ) {
//   const programId = args.programId || PROGRAM_ID;

//   const project = args.stakingPool.project().address;
//   const projectAuthority = args.stakingPool.project().authority;
//   const stakingPool = args.stakingPool.address;

//   const proofPack = await args.character.proof(honeycomb.rpcEndpoint);

//   if (!proofPack) throw new Error("Proof not found for this character");

//   const { root, proof } = proofPack;

//   const [staker] = honeycomb
//     .pda()
//     .staking()
//     .staker(args.stakingPool.address, honeycomb.identity().address, programId);

//   const {
//     holderAccount,
//     tokenAccount,
//     operation: createHolderAccountOperation,
//   } = await createCreateHolderAccountOperation(honeycomb, {
//     currency: args.stakingPool.currency(),
//     owner: honeycomb.identity().address,
//     runAllways: true,
//   });

//   const stakingPoolDelegate = honeycomb
//     .pda()
//     .hiveControl()
//     .delegateAuthority(project, projectAuthority, stakingPool)[0];

//   let units = 500_000;
//   const instructions = [
//     ...createHolderAccountOperation.instructions,
//     createClaimRewardsInstruction(
//       {
//         project,
//         characterModel: args.characterModel.address,
//         merkleTree: args.character.merkleTree,
//         stakingPool,
//         stakingPoolDelegate,
//         multipliers:
//           (await args.stakingPool.multipliers())?.address || programId,
//         staker,
//         currency: args.stakingPool.currency().address,
//         mint: args.stakingPool.currency().mint.address,
//         holderAccount,
//         tokenAccount,
//         wallet: honeycomb.identity().address,
//         vault: VAULT,
//         hiveControl: HPL_HIVE_CONTROL_PROGRAM,
//         characterManager: HPL_CHARACTER_MANAGER_PROGRAM,
//         currencyManagerProgram: HPL_CURRENCY_MANAGER_PROGRAM_ID,
//         hplEvents: HPL_EVENTS_PROGRAM,
//         compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
//         logWrapper: SPL_NOOP_PROGRAM_ID,
//         clock: web3.SYSVAR_CLOCK_PUBKEY,
//         instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
//         anchorRemainingAccounts: proof.map((pubkey) => ({
//           pubkey,
//           isSigner: false,
//           isWritable: false,
//         })),
//       },
//       {
//         args: {
//           root: Array.from(root.toBytes()),
//           leafIdx: args.character.leafIdx,
//           source: args.character.source,
//           usedBy: args.character.usedBy,
//         },
//       },
//       programId
//     ),
//   ];

//   instructions.unshift(
//     web3.ComputeBudgetProgram.setComputeUnitLimit({
//       units,
//     })
//   );
//   const operation = new Operation(honeycomb, instructions);
//   if (luts.length > 0) operation.add_lut(...luts);
//   return {
//     operation,
//   };
// }
