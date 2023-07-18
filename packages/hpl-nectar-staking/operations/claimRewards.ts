import * as web3 from "@solana/web3.js";
import { createClaimRewardsInstruction, PROGRAM_ID } from "../generated";
import { Honeycomb, Operation, VAULT } from "@honeycomb-protocol/hive-control";
import {
  PROGRAM_ID as HPL_CURRENCY_MANAGER_PROGRAM_ID,
  holderAccountPdas,
  createCreateHolderAccountOperation,
} from "@honeycomb-protocol/currency-manager";
import { getNftPda, getStakerPda } from "../pdas";
import { StakedNft } from "../types";
import { NectarStaking } from "../NectarStaking";

type CreateClaimRewardsOperationArgs = {
  stakingPool: NectarStaking;
  nft: StakedNft;
  isFirst?: boolean;
  programId?: web3.PublicKey;
};

export async function createClaimRewardsOperation(
  honeycomb: Honeycomb,
  args: CreateClaimRewardsOperationArgs
) {
  const programId = args.programId || PROGRAM_ID;

  const [nft] = getNftPda(args.stakingPool.address, args.nft.mint, programId);
  const [staker] = getStakerPda(
    args.stakingPool.address,
    honeycomb.identity().address,
    programId
  );

  const { holderAccount: vaultHolderAccount, tokenAccount: vaultTokenAccount } =
    holderAccountPdas(
      args.stakingPool.address,
      args.stakingPool.currency().mint.address,
      args.stakingPool.currency().kind
    );

  const { holderAccount, tokenAccount } = holderAccountPdas(
    honeycomb.identity().address,
    args.stakingPool.currency().mint.address,
    args.stakingPool.currency().kind
  );

  const instructions = [
    web3.ComputeBudgetProgram.setComputeUnitLimit({
      units: 400_000,
    }),
    createClaimRewardsInstruction(
      {
        project: args.stakingPool.project().address,
        vault: VAULT,
        stakingPool: args.stakingPool.address,
        multipliers:
          (await args.stakingPool.multipliers()).address || programId,
        nft,
        currency: args.stakingPool.currency().address,
        mint: args.stakingPool.currency().mint.address,
        vaultHolderAccount,
        vaultTokenAccount,
        holderAccount,
        tokenAccount,
        staker,
        wallet: honeycomb.identity().address,
        clock: web3.SYSVAR_CLOCK_PUBKEY,
        currencyManagerProgram: HPL_CURRENCY_MANAGER_PROGRAM_ID,
        instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      },
      programId
    ),
  ];

  if (args.isFirst) {
    try {
      await args.stakingPool
        .currency()
        .fetch()
        .holderAccount(honeycomb.identity().address);
    } catch {
      instructions.unshift(
        ...(
          await createCreateHolderAccountOperation(honeycomb, {
            currency: args.stakingPool.currency(),
            owner: honeycomb.identity().address,
          })
        ).operation.instructions
      );
    }
  }

  return {
    operation: new Operation(honeycomb, instructions),
  };
}
