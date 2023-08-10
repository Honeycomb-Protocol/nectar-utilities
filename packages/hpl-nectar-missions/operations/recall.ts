import {
  ComputeBudgetProgram,
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  HIVECONTROL_PROGRAM_ID,
  Honeycomb,
  Operation,
  VAULT,
  getProfilePda,
} from "@honeycomb-protocol/hive-control";
import {
  PROGRAM_ID as CURRENCY_MANAGER_PROGRAM_ID,
  createCreateHolderAccountOperation,
  holderAccountPdas,
} from "@honeycomb-protocol/currency-manager";
import {
  PROGRAM_ID,
  createCollectRewardsInstruction,
  createRecallInstruction,
} from "../generated";
import {
  NectarMissionParticipation,
  ParticipationReward,
} from "../NectarMissions";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
} from "@solana/spl-account-compression";

/**
 * Represents the arguments needed to create a collect rewards operation.
 * @category Types
 */
type CreateCollectRewardsOperationArgs = {
  /**
   * The participation reward to collect.
   */
  reward: ParticipationReward;
  /**
   * The wallet address of the user collecting the rewards.
   */
  wallet: PublicKey;
  /**
   * (Optional) The program ID associated with the collect rewards operation.
   * If not provided, the default PROGRAM_ID will be used.
   */
  programId?: PublicKey;
};

/**
 * Creates a new collect rewards operation for a given participation reward.
 * @category Operation Builder
 * @param honeycomb - An instance of the Honeycomb class.
 * @param args - The arguments for collecting rewards.
 * @returns An object containing the collect rewards operation.
 * @example
 * const honeycomb = new Honeycomb(...); // Initialize Honeycomb instance
 * const participation = await honeycomb.mission(missionAddress).participations(walletAddress);
 * const reward = participation[0].rewards[0]; // Assuming there is at least one participation and one reward
 * const createCollectRewardsArgs: CreateCollectRewardsOperationArgs = {
 *   reward,
 *   wallet: myWalletAddress,
 *   programId: myCustomProgramId, // (Optional) Provide a custom program ID if needed
 * };
 * const { operation } = createCollectRewardsOperation(honeycomb, createCollectRewardsArgs);
 * // Execute the collect rewards transaction
 * await operation.send(confirmOptions);
 */
export async function createCollectRewardsOperation(
  honeycomb: Honeycomb,
  args: CreateCollectRewardsOperationArgs
) {
  const programId = args.programId || PROGRAM_ID;

  let vaultHolderAccount: PublicKey | undefined = undefined,
    vaultTokenAccount: PublicKey | undefined = undefined,
    holderAccount: PublicKey | undefined = undefined,
    tokenAccount: PublicKey | undefined = undefined;
  if (args.reward.isCurrency()) {
    const vault = holderAccountPdas(
      args.reward.participation().mission().pool().address,
      args.reward.currency().mint.address,
      args.reward.currency().kind,
      TOKEN_PROGRAM_ID
    );
    vaultHolderAccount = vault.holderAccount;
    vaultTokenAccount = vault.tokenAccount;

    const user = holderAccountPdas(
      args.wallet,
      args.reward.currency().mint.address,
      args.reward.currency().kind,
      TOKEN_PROGRAM_ID
    );
    holderAccount = user.holderAccount;
    tokenAccount = user.tokenAccount;
  }

  const user = await honeycomb.identity().user();

  const instructions = [
    ComputeBudgetProgram.setComputeUnitLimit({
      units: 400_000,
    }),
    createCollectRewardsInstruction(
      {
        project: args.reward.participation().mission().pool().project().address,
        missionPool: args.reward.participation().mission().pool().address,
        mission: args.reward.participation().mission().address,
        participation: args.reward.participation().address,
        nft: args.reward.participation().nftAddress,
        profile: !args.reward.isCurrency()
          ? getProfilePda(
              args.reward.participation().mission().pool().project().address,
              user.address,
              { __kind: "Wallet", key: args.wallet }
            )[0]
          : programId,
        currency: args.reward.isCurrency()
          ? args.reward.currency().address
          : programId,
        mint: args.reward.isCurrency()
          ? args.reward.currency().mint.address
          : programId,
        vaultHolderAccount: vaultHolderAccount || programId,
        vaultTokenAccount: vaultTokenAccount || programId,
        holderAccount: holderAccount || programId,
        tokenAccount: tokenAccount || programId,
        wallet: args.wallet,
        vault: VAULT,
        hiveControlProgram: HIVECONTROL_PROGRAM_ID,
        currencyManagerProgram: CURRENCY_MANAGER_PROGRAM_ID,
        compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
        logWrapper: SPL_NOOP_PROGRAM_ID,
        rentSysvar: SYSVAR_RENT_PUBKEY,
        instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
        tokenProgram: TOKEN_PROGRAM_ID,
        clock: SYSVAR_CLOCK_PUBKEY,
      },
      programId
    ),
  ];

  return {
    operation: new Operation(honeycomb, instructions),
  };
}

/**
 * Represents the arguments needed to create a recall operation.
 * @category Types
 */
type CreateRecallOperationnArgs = {
  /**
   * The NectarMissionParticipation to recall rewards from.
   */
  participation: NectarMissionParticipation;
  /**
   * (Optional) The program ID associated with the recall operation.
   * If not provided, the default PROGRAM_ID will be used.
   */
  programId?: PublicKey;
};

/**
 * Creates a new recall operation to retrieve uncollected rewards from a participation.
 * @category Operation Builder
 * @param honeycomb - An instance of the Honeycomb class.
 * @param args - The arguments for recalling rewards.
 * @returns An object containing the recall operation.
 * @example
 * const honeycomb = new Honeycomb(...); // Initialize Honeycomb instance
 * const participation = await honeycomb.mission(missionAddress).participations(walletAddress);
 * const createRecallArgs: CreateRecallOperationnArgs = {
 *   participation: participation[0], // Assuming there is at least one participation
 *   programId: myCustomProgramId, // (Optional) Provide a custom program ID if needed
 * };
 * const { operations } = createRecallOperation(honeycomb, createRecallArgs);
 * // Execute the recall transactions
 * for (const operation of operations) {
 *   await operation.send(confirmOptions);
 * }
 */
export async function creatRecallOperation(
  honeycomb: Honeycomb,
  args: CreateRecallOperationnArgs
) {
  const programId = args.programId || PROGRAM_ID;

  const operations: Operation[] = [];

  const holderAccounts: { [key: string]: boolean } = {};
  for (let i = 0; i < args.participation.rewards.length; i++) {
    const reward = args.participation.rewards[i];
    if (reward.collected) continue;

    if (
      reward.isCurrency() &&
      !holderAccounts[reward.currency().address.toString()]
    ) {
      try {
        await reward
          .currency()
          .fetch()
          .holderAccount(honeycomb.identity().address);
      } catch {
        operations.push(
          await createCreateHolderAccountOperation(honeycomb, {
            currency: reward.currency(),
            owner: honeycomb.identity().address,
          }).then(({ operation }) => operation)
        );
      }
      holderAccounts[reward.currency().address.toString()] = true;
    }

    operations.push(
      await createCollectRewardsOperation(honeycomb, {
        reward,
        wallet: honeycomb.identity().address,
        programId: args.programId,
      }).then(({ operation }) => operation)
    );
  }

  operations.push(
    new Operation(honeycomb, [
      createRecallInstruction(
        {
          project: args.participation.mission().pool().project().address,
          missionPool: args.participation.mission().pool().address,
          mission: args.participation.mission().address,
          participation: args.participation.address,
          wallet: honeycomb.identity().address,
          vault: VAULT,
          clock: SYSVAR_CLOCK_PUBKEY,
          logWrapper: SPL_NOOP_PROGRAM_ID,
        },
        programId
      ),
    ])
  );

  return {
    operations,
  };
}
