import {
  PublicKey,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { Honeycomb, Operation, VAULT } from "@honeycomb-protocol/hive-control";
import {
  PROGRAM_ID as HPL_CURRENCY_MANAGER_PROGRAM,
  holderAccountPdas,
} from "@honeycomb-protocol/currency-manager";
import { StakedNft, getNftPda } from "@honeycomb-protocol/nectar-staking";
import {
  ParticipateArgs,
  PROGRAM_ID,
  createParticipateInstruction,
} from "../generated";
import { participationPda } from "../utils";
import { NectarMission } from "../NectarMissions";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

type CreateParticipateOperationArgs = {
  args: ParticipateArgs;
  mission: NectarMission;
  nft: StakedNft;
  programId?: PublicKey;
};
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
      args.mission.requirements.cost.currency().kind,
      TOKEN_PROGRAM_ID
    );

  const { holderAccount, tokenAccount } = holderAccountPdas(
    honeycomb.identity().address,
    args.mission.requirements.cost.currency().mint.address,
    args.mission.requirements.cost.currency().kind,
    TOKEN_PROGRAM_ID
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
