import {
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import {
  Honeycomb,
  Operation,
  VAULT,
} from "@honeycomb-protocol/hive-control";
import {
  ParticipateArgs,
  PROGRAM_ID,
  createParticipateInstruction,
} from "../generated";
import { participationPda } from "../utils";
import {  NectarMissions } from "../NectarMissions";
import { NectarStaking } from "../../hpl-nectar-staking/NectarStaking";
import { StakedNft, Staker } from "@honeycomb-protocol/nectar-staking";

type CreateParticipateCtxArgs = {
  args: ParticipateArgs;
  stakingPool: NectarStaking;
  missionPool: NectarMissions;
  mission: PublicKey;
  nft: StakedNft;
  staker: Staker;
  programId?: PublicKey;
};
export async function createParticipateOperation(honeycomb:Honeycomb,
  args: CreateParticipateCtxArgs
) {
  const programId = args.programId || PROGRAM_ID;

  const [participation] = participationPda(args.nft, programId);

  const instructions = [
    createParticipateInstruction(
      {
        project: args.missionPool.project().address,
        stakingPool: args.stakingPool.address,
        missionPool: args.missionPool.address,
        mission: args.mission,
        nft: args.nft,
        staker: args.staker,
        participation,
        wallet: honeycomb.identity().address,
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

  return {
    operation: new Operation(honeycomb, instructions),
  };
}

