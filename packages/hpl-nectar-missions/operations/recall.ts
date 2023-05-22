import { PublicKey, SYSVAR_CLOCK_PUBKEY } from "@solana/web3.js";
import {
  ConfirmedContext,
  Honeycomb,
  OperationCtx,
  VAULT,
  createCtx,
} from "@honeycomb-protocol/hive-control";
import {
  PROGRAM_ID as CURRENCY_MANAGER_PROGRAM_ID,
  CurrencyType,
  holderAccountPdas,
} from "@honeycomb-protocol/currency-manager";
import {
  PROGRAM_ID,
  createCollectRewardsInstruction,
  createRecallInstruction,
} from "../generated";
import { NectarMissionParticipation } from "../NectarMissions";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

type CreateCollectRewardsCtxArgs = {
  project: PublicKey;
  missionPool: PublicKey;
  mission: PublicKey;
  participation: PublicKey;
  nft: PublicKey;
  currency?: PublicKey;
  currencyType?: CurrencyType;
  mint?: PublicKey;
  wallet: PublicKey;
  programId?: PublicKey;
};
export function createCollectRewardsCtx(
  args: CreateCollectRewardsCtxArgs
): OperationCtx {
  const programId = args.programId || PROGRAM_ID;

  const { holderAccount: vaultHolderAccount, tokenAccount: vaultTokenAccount } =
    holderAccountPdas(
      args.missionPool,
      args.mint,
      args.currencyType,
      TOKEN_PROGRAM_ID,
      programId
    );
  const { holderAccount, tokenAccount } = holderAccountPdas(
    args.wallet,
    args.mint,
    args.currencyType,
    TOKEN_PROGRAM_ID,
    programId
  );

  const instructions = [
    createCollectRewardsInstruction(
      {
        project: args.project,
        missionPool: args.missionPool,
        mission: args.mission,
        participation: args.participation,
        nft: args.nft,
        currency: args.currency || programId,
        mint: args.mint || programId,
        vaultHolderAccount: !!args.currency ? vaultHolderAccount : programId,
        vaultTokenAccount: !!args.currency ? vaultTokenAccount : programId,
        holderAccount: !!args.currency ? holderAccount : programId,
        tokenAccount: !!args.currency ? tokenAccount : programId,
        wallet: args.wallet,
        vault: VAULT,
        currencyManagerProgram: CURRENCY_MANAGER_PROGRAM_ID,
        tokenProgram: TOKEN_PROGRAM_ID,
        clock: SYSVAR_CLOCK_PUBKEY,
      },
      programId
    ),
  ];

  return createCtx(instructions);
}

type CreateRecallCtxArgs = {
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
export function createRecallCtx(args: CreateRecallCtxArgs): OperationCtx {
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

type RecallArgs = {
  participations: NectarMissionParticipation[];
  programId?: PublicKey;
};
export async function recall(
  honeycomb: Honeycomb,
  args: RecallArgs
): Promise<ConfirmedContext[]> {
  const ctxs = args.participations.flatMap((participation) => [
    ...participation.rewards
      .filter((r) => !r.collected)
      .map((reward) =>
        createCollectRewardsCtx({
          project: participation.mission().pool().project().address,
          missionPool: participation.mission().pool().address,
          mission: participation.mission().address,
          participation: participation.address,
          nft: participation.nftAddress,
          currency: reward.isCurrency() && reward.currency().address,
          currencyType: reward.isCurrency() && reward.currency().currencyType, 
          mint: reward.isCurrency() && reward.currency().mint,
          wallet: honeycomb.identity().publicKey,
          programId: args.programId,
        })
      ),
    createRecallCtx({
      project: participation.mission().pool().project().address,
      stakingPool: participation.nft.stakingPool,
      missionPool: participation.mission().pool().address,
      mission: participation.mission().address,
      nft: participation.nftAddress,
      staker: participation.nft.staker,
      participation: participation.address,
      wallet: honeycomb.identity().publicKey,
      programId: args.programId,
    }),
  ]);

  return honeycomb.rpc().sendAndConfirmTransactionsInBatches(ctxs, {
    commitment: "processed",
    skipPreflight: true,
  });
}