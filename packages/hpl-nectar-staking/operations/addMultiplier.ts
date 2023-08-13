import * as web3 from "@solana/web3.js";
import {
  createAddMultiplierInstruction,
  AddMultiplierArgs,
  PROGRAM_ID,
} from "../generated";
import { getMultipliersPda } from "../pdas";
import { Honeycomb, Operation, VAULT } from "@honeycomb-protocol/hive-control";

/**
 * Represents the context arguments for creating the AddMultiplier operation.
 * @category Types
 */
type CreateAddMultiplierCtxArgs = {
  args: AddMultiplierArgs;
  project: web3.PublicKey;
  stakingPool: web3.PublicKey;
  programId?: web3.PublicKey;
};

/**
 * Create an operation to add a new multiplier to the staking pool.
 * @category Operation Builder
 * @param honeycomb - The Honeycomb instance.
 * @param args - The context arguments for creating the AddMultiplier operation.
 * @returns An object containing the AddMultiplier operation.
 * @example
 * // Usage example:
 * const honeycomb = new Honeycomb(connection, wallet);
 * const stakingPool = new web3.PublicKey("...");
 * const project = new web3.PublicKey("...");
 * const args: AddMultiplierArgs = {
 *   type: "Custom Multiplier",
 *   multiplier: 2,
 * };
 * const { operation } = await createAddMultiplierOperation(honeycomb, {
 *   args,
 *   project,
 *   stakingPool,
 * });
 * // Send the transaction
 * const txSignature = await honeycomb.sendTransaction(operation);
 */
export async function createAddMultiplierOperation(
  honeycomb: Honeycomb,
  args: CreateAddMultiplierCtxArgs
) {
  const programId = args.programId || PROGRAM_ID;

  // Get the multipliers PDA associated with the staking pool
  const [multipliers] = getMultipliersPda(args.stakingPool, programId);

  // Create the instruction to add a new multiplier
  const instructions: web3.TransactionInstruction[] = [
    createAddMultiplierInstruction(
      {
        project: args.project,
        vault: VAULT,
        stakingPool: args.stakingPool,
        multipliers,
        delegateAuthority:
          honeycomb.identity().delegateAuthority()?.address || programId,
        authority: honeycomb.identity().address,
        payer: honeycomb.identity().address,
        rentSysvar: web3.SYSVAR_RENT_PUBKEY,
        instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      },
      { args: args.args },
      programId
    ),
  ];

  return {
    operation: new Operation(honeycomb, instructions),
  };
}
