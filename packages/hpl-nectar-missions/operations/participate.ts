import {
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  ConfirmedContext,
  Honeycomb,
  OperationCtx,
  VAULT,
  createCtx,
} from "@honeycomb-protocol/hive-control";
import {
  ParticipateArgs as ParticipateArgsSolita,
  PROGRAM_ID,
  createParticipateInstruction,
} from "../generated";
import { participationPda } from "../utils";
import { NectarMission } from "../NectarMissions";
import { StakedNft, getNftPda } from "packages/hpl-nectar-staking";

type CreateParticipateCtxArgs = {
  args: ParticipateArgsSolita;
  project: PublicKey;
  stakingPool: PublicKey;
  missionPool: PublicKey;
  mission: PublicKey;
  nft: PublicKey;
  staker: PublicKey;
  wallet: PublicKey;
  programId?: PublicKey;
};
export function createParticipateCtx(
  args: CreateParticipateCtxArgs
): OperationCtx {
  const programId = args.programId || PROGRAM_ID;

  const [participation] = participationPda(args.nft, programId);

  const instructions = [
    createParticipateInstruction(
      {
        project: args.project,
        stakingPool: args.stakingPool,
        missionPool: args.missionPool,
        mission: args.mission,
        nft: args.nft,
        staker: args.staker,
        participation,
        wallet: args.wallet,
        vault: VAULT,
        rentSysvar: SYSVAR_RENT_PUBKEY,
        clock: SYSVAR_CLOCK_PUBKEY,
      },
      {
        args: args.args,
      },
      programId
    ),
  ];

  return createCtx(instructions);
}

type ParticipateArgs = {
  args: ParticipateArgsSolita;
  mission: NectarMission;
  nfts: StakedNft[];
  programId?: PublicKey;
};
export async function participate(
  honeycomb: Honeycomb,
  args: ParticipateArgs
): Promise<ConfirmedContext[]> {
  const ctxs = args.nfts.map((nft) =>
    createParticipateCtx({
      args: args.args,
      project: args.mission.pool().project().address,
      stakingPool: nft.stakingPool,
      missionPool: args.mission.pool().address,
      mission: honeycomb.missions().address,
      nft: getNftPda(nft.stakingPool, nft.mint)[0],
      staker: nft.staker,
      wallet: honeycomb.identity().publicKey,
      programId: args.programId,
    })
  );

  return honeycomb.rpc().sendAndConfirmTransactionsInBatches(ctxs, {
    commitment: "processed",
    skipPreflight: true,
  });
}
