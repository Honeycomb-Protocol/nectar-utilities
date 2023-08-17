import {
  ComputeBudgetProgram,
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { Honeycomb, Operation, VAULT } from "@honeycomb-protocol/hive-control";
import {
  PROGRAM_ID as HPL_CURRENCY_MANAGER_PROGRAM,
  createFixHolderAccountInstruction,
  holderAccountPdas,
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
import { SPL_NOOP_PROGRAM_ID } from "@solana/spl-account-compression";
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
  args: CreateParticipateOperationArgs
) {
  const programId = args.programId || PROGRAM_ID;

  const [nft] = getNftPda(args.nft.stakingPool, args.nft.mint);
  const [participation] = participationPda(nft, programId);

  const { holderAccount: vaultHolderAccount, tokenAccount: vaultTokenAccount } =
    holderAccountPdas(
      args.mission.pool().address,
      args.mission.requirements.cost.currency().mint.address,
      args.mission.requirements.cost.currency().kind
    );

  const { holderAccount, tokenAccount } = holderAccountPdas(
    honeycomb.identity().address,
    args.mission.requirements.cost.currency().mint.address,
    args.mission.requirements.cost.currency().kind
  );

  const instructions = [
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
        vaultHolderAccount,
        vaultTokenAccount,
        participation,
        wallet: honeycomb.identity().address,
        vault: VAULT,
        rentSysvar: SYSVAR_RENT_PUBKEY,
        instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
        clock: SYSVAR_CLOCK_PUBKEY,
        currencyManagerProgram: HPL_CURRENCY_MANAGER_PROGRAM,
        nectarStakingProgram: HPL_NECTAR_STAKING_PROGRAM,
        logWrapper: SPL_NOOP_PROGRAM_ID,
      },
      {
        args: args.args,
      },
      programId
    ),
  ];

  if (args.isFirst) {
    try {
      const holderAccountT = await args.mission.requirements.cost
        .currency()
        .holderAccount(honeycomb.identity().address);

      if (!holderAccountT.tokenAccount.equals(tokenAccount)) {
        instructions.unshift(
          createFixHolderAccountInstruction({
            project: holderAccountT.currency().project().address,
            currency: holderAccountT.currency().address,
            mint: holderAccountT.currency().mint.address,
            holderAccount,
            tokenAccount: holderAccountT.tokenAccount,
            newTokenAccount: tokenAccount,
            owner: holderAccountT.owner,
            payer: honeycomb.identity().address,
            vault: VAULT,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
          })
        );
      }

      instructions.unshift(
        ComputeBudgetProgram.setComputeUnitLimit({
          units: 500_000,
        })
      );
    } catch {}
  }

  return {
    operation: new Operation(honeycomb, instructions),
  };
}
