import {
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  ConfirmedContext,
  HIVECONTROL_PROGRAM_ID,
  Honeycomb,
  OperationCtx,
  VAULT,
  createCreateProfileCtx,
  createCtx,
  getProfilePda,
  mergeOpertionCtxs,
} from "@honeycomb-protocol/hive-control";
import {
  PROGRAM_ID as CURRENCY_MANAGER_PROGRAM_ID,
  CurrencyKind,
  createCreateHolderAccountCtx,
  holderAccountPdas,
} from "@honeycomb-protocol/currency-manager";
import {
  PROGRAM_ID,
  createCollectRewardsInstruction,
  createRecallInstruction,
} from "../generated";
import { NectarMissionParticipation } from "../NectarMissions";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import {
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
} from "@solana/spl-account-compression";

type CreateCollectRewardsCtxArgs = {
  project: PublicKey;
  missionPool: PublicKey;
  mission: PublicKey;
  participation: PublicKey;
  nft: PublicKey;
  profile?: PublicKey;
  currency?: PublicKey;
  currencyKind?: CurrencyKind;
  mint?: PublicKey;
  wallet: PublicKey;
  programId?: PublicKey;
};
export function createCollectRewardsCtx(
  args: CreateCollectRewardsCtxArgs
): OperationCtx {
  const programId = args.programId || PROGRAM_ID;

  let vaultHolderAccount: PublicKey | undefined = undefined,
    vaultTokenAccount: PublicKey | undefined = undefined,
    holderAccount: PublicKey | undefined = undefined,
    tokenAccount: PublicKey | undefined = undefined;
  if (args.currency) {
    const vault = holderAccountPdas(
      args.missionPool,
      args.mint,
      args.currencyKind,
      TOKEN_PROGRAM_ID
    );
    vaultHolderAccount = vault.holderAccount;
    vaultTokenAccount = vault.tokenAccount;

    const user = holderAccountPdas(
      args.wallet,
      args.mint,
      args.currencyKind,
      TOKEN_PROGRAM_ID
    );
    holderAccount = user.holderAccount;
    tokenAccount = user.tokenAccount;
  }

  const instructions = [
    createCollectRewardsInstruction(
      {
        project: args.project,
        missionPool: args.missionPool,
        mission: args.mission,
        participation: args.participation,
        nft: args.nft,
        profile: args.profile || programId,
        currency: args.currency || programId,
        mint: args.mint || programId,
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
        tokenProgram: TOKEN_PROGRAM_ID,
        clock: SYSVAR_CLOCK_PUBKEY,
      },
      programId
    ),
  ];

  return createCtx(instructions);
}

type CreatePartialRecallCtxArgs = {
  project: PublicKey;
  stakingPool: PublicKey;
  missionPool: PublicKey;
  mission: PublicKey;
  nft: PublicKey;
  staker: PublicKey;
  participation: PublicKey;
  wallet: PublicKey;
  programId?: PublicKey;
};
export function createPartialRecallCtx(
  args: CreatePartialRecallCtxArgs
): OperationCtx {
  const programId = args.programId || PROGRAM_ID;

  const instructions = [
    createRecallInstruction(
      {
        project: args.project,
        missionPool: args.missionPool,
        mission: args.mission,
        participation: args.participation,
        wallet: args.wallet,
        vault: VAULT,
        clock: SYSVAR_CLOCK_PUBKEY,
      },
      programId
    ),
  ];

  return createCtx(instructions);
}

type CreateRecallCtxArgs = {
  participation: NectarMissionParticipation;
  wallet: PublicKey;
  user: PublicKey;
  isFirst?: boolean;
  programId?: PublicKey;
};
export async function createRecallCtxs(args: CreateRecallCtxArgs) {
  const ctxs: OperationCtx[] = [];

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
          args.wallet
        );
    } catch {
      ctxs.push(
        createCreateProfileCtx({
          project: args.participation.mission().pool().project().address,
          identity: { __kind: "Wallet", key: args.wallet },
          user: (
            await args.participation
              .mission()
              .pool()
              .honeycomb()
              .identity()
              .user()
          ).address,
          wallet: args.wallet,
        })
      );
    }
  }

  const ctxs2: OperationCtx[] = [];

  for (let i = 0; i < args.participation.rewards.length; i++) {
    const reward = args.participation.rewards[i];
    if (reward.collected) continue;

    if (reward.isCurrency()) {
      try {
        await reward.currency().fetch().holderAccount(args.wallet);
      } catch {
        ctxs2.push(
          createCreateHolderAccountCtx({
            currency: reward.currency().address,
            currencyKind: reward.currency().kind,
            mint: reward.currency().mint,
            owner: args.wallet,
            payer: args.wallet,
          })
        );
      }
    }

    ctxs2.push(
      createCollectRewardsCtx({
        project: args.participation.mission().pool().project().address,
        missionPool: args.participation.mission().pool().address,
        mission: args.participation.mission().address,
        participation: args.participation.address,
        nft: args.participation.nftAddress,
        profile:
          !reward.isCurrency() &&
          getProfilePda(
            args.participation.mission().pool().project().address,
            args.user,
            { __kind: "Wallet", key: args.wallet }
          )[0],
        currency: reward.isCurrency() && reward.currency().address,
        currencyKind: reward.isCurrency() && reward.currency().kind,
        mint: reward.isCurrency() && reward.currency().mint,
        wallet: args.wallet,
        programId: args.programId,
      })
    );
  }

  ctxs.push(
    mergeOpertionCtxs(
      ...ctxs2,
      createPartialRecallCtx({
        project: args.participation.mission().pool().project().address,
        stakingPool: args.participation.nft.stakingPool,
        missionPool: args.participation.mission().pool().address,
        mission: args.participation.mission().address,
        nft: args.participation.nftAddress,
        staker: args.participation.nft.staker,
        participation: args.participation.address,
        wallet: args.wallet,
        programId: args.programId,
      })
    )
  );

  return ctxs;
}

type RecallArgs = {
  participations: NectarMissionParticipation[];
  programId?: PublicKey;
};
export async function recall(
  honeycomb: Honeycomb,
  args: RecallArgs
): Promise<ConfirmedContext[]> {
  const user = await honeycomb.identity().user();
  const ctxs = await Promise.all(
    args.participations.map((participation, i) =>
      createRecallCtxs({
        participation,
        wallet: honeycomb.identity().address,
        user: user.address,
        isFirst: i === 0,
        programId: args.programId,
      })
    )
  );

  return honeycomb.rpc().sendAndConfirmTransactionsInBatches(ctxs.flat(), {
    commitment: "processed",
  });
}
