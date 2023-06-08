import {
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
  createCreateProfileOperation,
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

type CreateCollectRewardsOperationArgs = {
  reward: ParticipationReward;
  wallet: PublicKey;
  programId?: PublicKey;
};
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
      args.reward.currency().mint,
      args.reward.currency().kind,
      TOKEN_PROGRAM_ID
    );
    vaultHolderAccount = vault.holderAccount;
    vaultTokenAccount = vault.tokenAccount;

    const user = holderAccountPdas(
      args.wallet,
      args.reward.currency().mint,
      args.reward.currency().kind,
      TOKEN_PROGRAM_ID
    );
    holderAccount = user.holderAccount;
    tokenAccount = user.tokenAccount;
  }

  const user = await honeycomb.identity().user();

  const instructions = [
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
          ? args.reward.currency().mint
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

type CreateRecallOperationnArgs = {
  participation: NectarMissionParticipation;
  isFirst?: boolean;
  programId?: PublicKey;
};
export async function creatRecallOperation(
  honeycomb: Honeycomb,
  args: CreateRecallOperationnArgs
) {
  const programId = args.programId || PROGRAM_ID;

  const operations: Operation[] = [];

  if (
    !!args.participation.rewards.find((r) => !r.isCurrency()) &&
    args.isFirst !== false
  ) {
    try {
      await args.participation
        .mission()
        .pool()
        .honeycomb()
        .identity()
        .profile(
          args.participation.mission().pool().project().address,
          honeycomb.identity().address
        );
    } catch {
      await createCreateProfileOperation(honeycomb, {
        project: args.participation.mission().pool().project(),
        identity: { __kind: "Wallet", key: honeycomb.identity().address },
      }).then(({ operations }) => operations.push(...operations));
    }
  }

  for (let i = 0; i < args.participation.rewards.length; i++) {
    const reward = args.participation.rewards[i];
    if (reward.collected) continue;

    if (reward.isCurrency() && args.isFirst !== false) {
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
        },
        programId
      ),
    ])
  );

  return {
    operation: Operation.concat(operations),
  };
}
