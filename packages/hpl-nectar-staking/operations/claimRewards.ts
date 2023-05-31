import * as web3 from "@solana/web3.js";
import { createClaimRewardsInstruction, PROGRAM_ID } from "../generated";
import { Honeycomb, createCtx } from "@honeycomb-protocol/hive-control";
import {
  PROGRAM_ID as HPL_CURRENCY_MANAGER_PROGRAM_ID,
  CurrencyKind,
  holderAccountPdas,
  createCreateHolderAccountCtx,
} from "@honeycomb-protocol/currency-manager";
import { getNftPda, getStakerPda } from "../pdas";
import { VAULT } from "@honeycomb-protocol/hive-control";
import { StakedNft } from "../types";
import { NectarStaking } from "../NectarStaking";

type CreateClaimRewardsInstructionArgs = {
  project: web3.PublicKey;
  stakingPool: web3.PublicKey;
  nftMint: web3.PublicKey;
  currency: web3.PublicKey;
  currencyKind: CurrencyKind;
  currencyMint: web3.PublicKey;
  wallet: web3.PublicKey;
  multipliers?: web3.PublicKey;
  programId?: web3.PublicKey;
};

function createClaimRewardsInstructionV2(
  args: CreateClaimRewardsInstructionArgs
) {
  const programId = args.programId || PROGRAM_ID;

  const [nft] = getNftPda(args.stakingPool, args.nftMint, programId);
  const [staker] = getStakerPda(args.stakingPool, args.wallet, programId);

  const { holderAccount: vaultHolderAccount, tokenAccount: vaultTokenAccount } =
    holderAccountPdas(args.stakingPool, args.currencyMint, args.currencyKind);

  const { holderAccount, tokenAccount } = holderAccountPdas(
    args.wallet,
    args.currencyMint,
    args.currencyKind
  );

  return createClaimRewardsInstruction(
    {
      project: args.project,
      vault: VAULT,
      stakingPool: args.stakingPool,
      multipliers: args.multipliers || programId,
      nft,
      currency: args.currency,
      mint: args.currencyMint,
      vaultHolderAccount,
      vaultTokenAccount,
      holderAccount,
      tokenAccount,
      staker,
      wallet: args.wallet,
      clock: web3.SYSVAR_CLOCK_PUBKEY,
      currencyManagerProgram: HPL_CURRENCY_MANAGER_PROGRAM_ID,
    },
    programId
  );
}

type CreateClaimRewardsCtxArgs = {
  connection: web3.Connection;
  project: web3.PublicKey;
  stakingPool: NectarStaking;
  nft: StakedNft;
  wallet: web3.PublicKey;
  multipliers?: web3.PublicKey;
  isFirst?: boolean;
  programId?: web3.PublicKey;
};

export async function createClaimRewardsCtx({
  connection,
  ...args
}: CreateClaimRewardsCtxArgs) {
  const instructions: web3.TransactionInstruction[] = [];

  if (args.isFirst) {
    try {
      await args.stakingPool.currency().fetch().holderAccount(args.wallet);
    } catch {
      instructions.push(
        ...createCreateHolderAccountCtx({
          currency: args.stakingPool.currency().address,
          currencyKind: args.stakingPool.currency().kind,
          mint: args.stakingPool.currency().mint,
          owner: args.wallet,
          payer: args.wallet,
        }).tx.instructions
      );
    }
  }

  instructions.push(
    createClaimRewardsInstructionV2({
      project: args.project,
      stakingPool: args.stakingPool.address,
      nftMint: args.nft.mintAddress,
      currency: args.stakingPool.currency().address,
      currencyKind: args.stakingPool.currency().kind,
      currencyMint: args.stakingPool.currency().mint,
      wallet: args.wallet,
      multipliers: args.multipliers,
      programId: args.programId,
    })
  );

  return createCtx(instructions);
}

type ClaimRewardsArgs = {
  staking?: NectarStaking;
  nfts: StakedNft[];
  programId?: web3.PublicKey;
};
export async function claimRewards(
  honeycomb: Honeycomb,
  args: ClaimRewardsArgs,
  confirmOptions?: web3.ConfirmOptions
) {
  const wallet = honeycomb.identity();
  const multipliers = await honeycomb
    .staking()
    .fetch()
    .multipliers()
    .catch((_) => undefined);
  const ctxs = await Promise.all(
    args.nfts.map((nft, i) =>
      createClaimRewardsCtx({
        connection: honeycomb.connection,
        project: (args.staking || honeycomb.staking()).project().address,
        stakingPool: args.staking || honeycomb.staking(),
        nft,
        wallet: wallet.publicKey,
        multipliers: multipliers?.address,
        isFirst: i === 0,
        programId: args.programId,
      })
    )
  );

  const preparedCtxs = await honeycomb.rpc().prepareTransactions(ctxs);

  const firstTxResponse = await honeycomb
    .rpc()
    .sendAndConfirmTransaction(preparedCtxs.shift(), {
      commitment: "processed",
      ...confirmOptions,
    });

  const responses = await honeycomb
    .rpc()
    .sendAndConfirmTransactionsInBatches(preparedCtxs, {
      commitment: "processed",
      ...confirmOptions,
    });

  return [firstTxResponse, ...responses];
}
