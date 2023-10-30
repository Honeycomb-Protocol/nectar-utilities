import {
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  HPL_HIVE_CONTROL_PROGRAM,
  Honeycomb,
  Operation,
  VAULT,
} from "@honeycomb-protocol/hive-control";
import {
  PROGRAM_ID as HPL_CURRENCY_MANAGER_PROGRAM,
  createCreateHolderAccountOperation,
  createFixHolderAccountInstruction,
} from "@honeycomb-protocol/currency-manager";
import {
  HPL_NECTAR_STAKING_PROGRAM,
  StakedNft,
  getNftPda,
} from "@honeycomb-protocol/nectar-staking";
import {
  ParticipateArgs,
  PROGRAM_ID,
  createParticipateInstruction,
} from "../generated";
import { participationPda } from "../utils";
import { NectarMission } from "../NectarMissions";
import { HPL_EVENTS_PROGRAM } from "@honeycomb-protocol/events";
import { ASSOCIATED_TOKEN_PROGRAM_ID } from "@solana/spl-token";

/**
 * Represents the arguments needed to create a participate operation.
 * @category Types
 */
type CreateParticipateOperationArgs = {
  /**
   * The arguments for participating in a mission (defined in ParticipateArgs).
   */
  args: ParticipateArgs;
  /**
   * The NectarMission to participate in.
   */
  mission: NectarMission;
  /**
   * The StakedNft to use for participation.
   */
  nft: StakedNft;

  isFirst?: boolean;

  /**
   * (Optional) The program ID associated with the participate operation.
   * If not provided, the default PROGRAM_ID will be used.
   */
  programId?: PublicKey;
};

/**
 * Creates a new participate operation to join a mission.
 * @category Operation Builder
 * @param honeycomb - An instance of the Honeycomb class.
 * @param args - The arguments for participating in the mission.
 * @returns An object containing the participate operation.
 * @example
 * const honeycomb = new Honeycomb(...); // Initialize Honeycomb instance
 * const mission = await honeycomb.mission(missionAddress);
 * const nft = { stakingPool: stakingPoolAddress, mint: nftMintAddress, staker: stakerAddress };
 * const args: ParticipateArgs = {
 *   ...
 *   // Add other required fields for ParticipateArgs
 * };
 * const createParticipateArgs: CreateParticipateOperationArgs = {
 *   args,
 *   mission,
 *   nft,
 *   programId: myCustomProgramId, // (Optional) Provide a custom program ID if needed
 * };
 * const { operation } = createParticipateOperation(honeycomb, createParticipateArgs);
 * // Execute the participate transaction
 * await operation.send(confirmOptions);
 */
export async function createParticipateOperation(
  honeycomb: Honeycomb,
  args: CreateParticipateOperationArgs,
  luts: AddressLookupTableAccount[] = []
) {
  const programId = args.programId || PROGRAM_ID;
  const operation = new Operation(honeycomb, [
    ComputeBudgetProgram.setComputeUnitLimit({
      units: 500_000,
    }),
  ]);

  if (luts.length > 0) operation.add_lut(...luts);

  const [nft] = getNftPda(args.nft.stakingPool, args.nft.mint);
  const [participation] = participationPda(nft, programId);

  const preOperation = new Operation(honeycomb, []);

  const { holderAccount, tokenAccount } = honeycomb
    .pda()
    .currencyManager()
    .holderAccountWithTokenAccount(
      honeycomb.identity().address,
      args.mission.requirements.cost.currency().mint.address,
      args.mission.requirements.cost.currency().kind
    );

  if (args.isFirst) {
    try {
      await args.mission.requirements.cost
        .currency()
        .holderAccount(honeycomb.identity().address);
    } catch {
      preOperation.add(
        ...(await createCreateHolderAccountOperation(honeycomb, {
          currency: args.mission.requirements.cost.currency(),
          owner: honeycomb.identity().address,
        }).then(({ operation }) => operation.instructions))
      );
      operation.addPreOperations(preOperation);
    }
  }

  operation.add(
    createParticipateInstruction(
      {
        project: args.mission.pool().project().address,
        stakingPool: args.nft.stakingPool,
        missionPool: args.mission.pool().address,
        mission: args.mission.address,
        nft,
        staker: args.nft.staker,
        currency: args.mission.requirements.cost.currency().address,
        mint: args.mission.requirements.cost.currency().mint.address,
        holderAccount,
        tokenAccount,
        participation,
        wallet: honeycomb.identity().address,
        vault: VAULT,
        hiveControl: HPL_HIVE_CONTROL_PROGRAM,
        rentSysvar: SYSVAR_RENT_PUBKEY,
        instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
        clock: SYSVAR_CLOCK_PUBKEY,
        currencyManagerProgram: HPL_CURRENCY_MANAGER_PROGRAM,
        nectarStakingProgram: HPL_NECTAR_STAKING_PROGRAM,
        hplEvents: HPL_EVENTS_PROGRAM,
      },
      {
        args: args.args,
      },
      programId
    )
  );

  return {
    operation: operation,
  };
}
