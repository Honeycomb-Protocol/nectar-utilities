import {
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  HPL_HIVE_CONTROL_PROGRAM,
  Honeycomb,
  IdentityClient,
  Operation,
  VAULT,
} from "@honeycomb-protocol/hive-control";
import {
  PROGRAM_ID as CURRENCY_MANAGER_PROGRAM_ID,
  createCreateHolderAccountOperation,
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
import { SPL_ACCOUNT_COMPRESSION_PROGRAM_ID } from "@solana/spl-account-compression";
import {
  HPL_NECTAR_STAKING_PROGRAM,
  getNftPda,
} from "@honeycomb-protocol/nectar-staking";
import { HPL_EVENTS_PROGRAM } from "@honeycomb-protocol/events";

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

  isFirst?: boolean;

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
  const project = args.reward
    .participation()
    .mission()
    .pool()
    .project().address;
  const projectAuthority = args.reward
    .participation()
    .mission()
    .pool()
    .project().authority;
  const missionPool = args.reward.participation().mission().pool().address;
  const mission = args.reward.participation().mission().address;

  let holderAccount: PublicKey = programId,
    tokenAccount: PublicKey = programId,
    missionPoolDelegate: PublicKey = programId;
  if (args.reward.isCurrency()) {
    const user = honeycomb
      .pda()
      .currencyManager()
      .holderAccountWithTokenAccount(
        args.wallet,
        args.reward.currency().mint.address,
        args.reward.currency().kind
      );
    holderAccount = user.holderAccount;
    tokenAccount = user.tokenAccount;

    missionPoolDelegate = honeycomb
      .pda()
      .hiveControl()
      .delegateAuthority(project, projectAuthority, missionPool)[0];
  }

  const user = await honeycomb
    .profiles()
    .userFromIdentityClient(honeycomb.identity() as IdentityClient);

  const instructions = [
    createCollectRewardsInstruction(
      {
        project,
        missionPool,
        mission,
        missionPoolDelegate,
        participation: args.reward.participation().address,
        nft: args.reward.participation().nftAddress,
        profile: !args.reward.isCurrency()
          ? honeycomb
              .pda()
              .hiveControl()
              .profile(
                args.reward.participation().mission().pool().project().address,
                user.address
              )[0]
          : programId,
        currency: args.reward.isCurrency()
          ? args.reward.currency().address
          : programId,
        mint: args.reward.isCurrency()
          ? args.reward.currency().mint.address
          : programId,
        holderAccount: holderAccount,
        tokenAccount: tokenAccount,
        wallet: args.wallet,
        vault: VAULT,
        hiveControl: HPL_HIVE_CONTROL_PROGRAM,
        currencyManagerProgram: CURRENCY_MANAGER_PROGRAM_ID,
        compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
        hplEvents: HPL_EVENTS_PROGRAM,
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
  args: CreateRecallOperationnArgs,
  luts: AddressLookupTableAccount[] = []
) {
  const programId = args.programId || PROGRAM_ID;
  const operation = new Operation(honeycomb, [
    ComputeBudgetProgram.setComputeUnitLimit({
      units: 250_000,
    }),
  ]);
  if (luts.length > 0) operation.add_lut(...luts);

  const holderAccounts: { [key: string]: boolean } = {};
  let units = 100_000;
  const preOperation = new Operation(honeycomb, []);
  for (let i = 0; i < args.participation.rewards.length; i++) {
    const reward = args.participation.rewards[i];
    if (reward.collected) continue;

    units += 220_000;
    if (
      reward.isCurrency() &&
      !holderAccounts[reward.currency().address.toString()]
    ) {
      try {
        await reward.currency().holderAccount(honeycomb.identity().address);
      } catch {
        preOperation.add(
          ...(await createCreateHolderAccountOperation(honeycomb, {
            currency: reward.currency(),
            owner: honeycomb.identity().address,
          }).then(({ operation }) => operation.instructions))
        );
        units += 150_000;
      }
      holderAccounts[reward.currency().address.toString()] = true;
    }

    preOperation.add(
      ...(await createCollectRewardsOperation(honeycomb, {
        reward,
        wallet: honeycomb.identity().address,
        programId: args.programId,
      }).then(({ operation }) => operation.instructions))
    );
  }

  if (preOperation.items.length > 0) {
    preOperation.addToStart(
      ComputeBudgetProgram.setComputeUnitLimit({
        units,
      })
    );
    if (luts.length > 0) preOperation.add_lut(...luts);
    operation.addPreOperations(preOperation);
  }
  const [nft] = getNftPda(
    args.participation.nft.stakingPool,
    args.participation.nft.mint
  );

  operation.add(
    createRecallInstruction(
      {
        project: args.participation.mission().pool().project().address,
        stakingPool: args.participation.nft.stakingPool,
        missionPool: args.participation.mission().pool().address,
        nft,
        staker: args.participation.nft.staker,
        mission: args.participation.mission().address,
        participation: args.participation.address,
        wallet: honeycomb.identity().address,
        vault: VAULT,
        hiveControl: HPL_HIVE_CONTROL_PROGRAM,
        nectarStakingProgram: HPL_NECTAR_STAKING_PROGRAM,
        hplEvents: HPL_EVENTS_PROGRAM,
        clock: SYSVAR_CLOCK_PUBKEY,
        instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
      },
      programId
    )
  );

  return {
    operation,
  };
}
