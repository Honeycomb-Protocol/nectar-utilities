import * as web3 from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import {
  createClaimRewardsInstruction,
  Project,
  PROGRAM_ID,
} from "../generated";
import { TxSignersAccounts } from "../types";
import { Metaplex } from "@metaplex-foundation/js";
import { getOrFetchMultipliers } from "../utils";
import { getNftPda, getStakerPda, getVaultPda } from "../pdas";

export function createClaimRewardsCtx(
  project: web3.PublicKey,
  nftMint: web3.PublicKey,
  rewardMint: web3.PublicKey,
  wallet: web3.PublicKey,
  multipliers: web3.PublicKey | undefined,
  programId: web3.PublicKey = PROGRAM_ID
): TxSignersAccounts {
  const [nft] = getNftPda(project, nftMint, programId);
  const [vault] = getVaultPda(project, rewardMint, programId);
  const [staker] = getStakerPda(project, wallet, programId);

  const tokenAccount = splToken.getAssociatedTokenAddressSync(
    rewardMint,
    wallet
  );

  const instructions: web3.TransactionInstruction[] = [
    createClaimRewardsInstruction(
      {
        project,
        multipliers: multipliers || programId,
        nft,
        rewardMint,
        vault,
        tokenAccount,
        staker,
        wallet,
        clock: web3.SYSVAR_CLOCK_PUBKEY,
      },
      programId
    ),
  ];

  return {
    tx: new web3.Transaction().add(...instructions),
    signers: [],
    accounts: instructions.flatMap((i) => i.keys.map((k) => k.pubkey)),
  };
}

type ClaimRewardsArgs = {
  metaplex: Metaplex;
  project: web3.PublicKey;
  nftMint: web3.PublicKey;
  programId?: web3.PublicKey;
};

export async function claimRewards({
  metaplex: mx,
  ...args
}: ClaimRewardsArgs) {
  const projectAccount = await Project.fromAccountAddress(
    mx.connection,
    args.project
  );

  const multipliers = await getOrFetchMultipliers(mx.connection, args.project);
  const wallet = mx.identity();
  const ctx = createClaimRewardsCtx(
    args.project,
    args.nftMint,
    projectAccount.rewardMint,
    wallet.publicKey,
    multipliers?.address,
    args.programId
  );

  const blockhash = await mx.connection.getLatestBlockhash();

  ctx.tx.recentBlockhash = blockhash.blockhash;

  const response = await mx
    .rpc()
    .sendAndConfirmTransaction(ctx.tx, { skipPreflight: true }, ctx.signers);

  return {
    response,
  };
}
