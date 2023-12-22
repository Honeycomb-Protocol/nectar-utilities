import * as web3 from "@solana/web3.js";
import { createClaimRewardsInstruction, PROGRAM_ID } from "../../generated";
import {
  Honeycomb,
  HPL_HIVE_CONTROL_PROGRAM,
  Operation,
  VAULT,
} from "@honeycomb-protocol/hive-control";
import {
  PROGRAM_ID as HPL_CURRENCY_MANAGER_PROGRAM_ID,
  createCreateHolderAccountOperation,
} from "@honeycomb-protocol/currency-manager";
import { StakedNft } from "../../types";
import { NectarStaking } from "../../NectarStaking";
import { HPL_EVENTS_PROGRAM } from "@honeycomb-protocol/events";

/**
 * Represents the context arguments for creating the ClaimRewards operation.
 * @category Types
 */
type CreateClaimRewardsOperationArgs = {
  stakingPool: NectarStaking;
  nft: StakedNft;
  isFirst?: boolean;
  programId?: web3.PublicKey;
};

/**
 * Create an operation to claim rewards for a staked NFT.
 * @category Operation Builder
 * @param honeycomb - The Honeycomb instance.
 * @param args - The context arguments for creating the ClaimRewards operation.
 * @returns An object containing the ClaimRewards operation.
 * @example
 * // Usage example:
 * const honeycomb = new Honeycomb(connection, wallet);
 * const stakingPool = await NectarStaking.fromAddress(connection, stakingPoolAddress);
 * const stakedNft = { mint: nftMintAddress, staker: stakerAddress };
 * const args = { stakingPool, nft: stakedNft };
 * const { operation } = await createClaimRewardsOperation(honeycomb, args);
 * // Send the transaction
 * const txSignature = await honeycomb.sendTransaction(operation);
 */
export async function createClaimRewardsOperation(
  honeycomb: Honeycomb,
  args: CreateClaimRewardsOperationArgs,
  luts: web3.AddressLookupTableAccount[] = []
) {
  const programId = args.programId || PROGRAM_ID;

  const project = args.stakingPool.project().address;
  const projectAuthority = args.stakingPool.project().authority;
  const stakingPool = args.stakingPool.address;
  const [nft] = honeycomb
    .pda()
    .staking()
    .nft(args.stakingPool.address, args.nft.mint, programId);
  const [staker] = honeycomb
    .pda()
    .staking()
    .staker(args.stakingPool.address, honeycomb.identity().address, programId);

  const {
    holderAccount,
    tokenAccount,
    operation: createHolderAccountOperation,
  } = await createCreateHolderAccountOperation(honeycomb, {
    currency: args.stakingPool.currency(),
    owner: honeycomb.identity().address,
    runAllways: true,
  });

  const stakingPoolDelegate = honeycomb
    .pda()
    .hiveControl()
    .delegateAuthority(project, projectAuthority, stakingPool)[0];

  let units = 500_000;
  const instructions = [
    ...createHolderAccountOperation.instructions,
    createClaimRewardsInstruction(
      {
        project,
        vault: VAULT,
        stakingPool,
        stakingPoolDelegate,
        multipliers:
          (await args.stakingPool.multipliers())?.address || programId,
        nft,
        currency: args.stakingPool.currency().address,
        mint: args.stakingPool.currency().mint.address,
        holderAccount,
        tokenAccount,
        staker,
        wallet: honeycomb.identity().address,
        hiveControl: HPL_HIVE_CONTROL_PROGRAM,
        clock: web3.SYSVAR_CLOCK_PUBKEY,
        currencyManagerProgram: HPL_CURRENCY_MANAGER_PROGRAM_ID,
        instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        hplEvents: HPL_EVENTS_PROGRAM,
      },
      programId
    ),
  ];

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
