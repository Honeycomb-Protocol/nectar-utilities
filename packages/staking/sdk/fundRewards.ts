import * as web3 from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import {
  createFundRewardsInstruction,
  Project,
  PROGRAM_ID,
} from "../generated";
import { TxSignersAccounts } from "../types";
import { Metaplex } from "@metaplex-foundation/js";
import { getVaultPda } from "../pdas";

export function createFundRewardsCtx(
  project: web3.PublicKey,
  rewardMint: web3.PublicKey,
  wallet: web3.PublicKey,
  amount: number,
  programId: web3.PublicKey = PROGRAM_ID
): TxSignersAccounts & { project: web3.PublicKey } {
  const [vault] = getVaultPda(project, rewardMint, programId);

  const tokenAccount = splToken.getAssociatedTokenAddressSync(
    rewardMint,
    wallet
  );

  const instructions: web3.TransactionInstruction[] = [
    createFundRewardsInstruction(
      {
        project,
        rewardMint,
        vault,
        tokenAccount,
        wallet,
      },
      {
        amount,
      },
      programId
    ),
  ];

  return {
    tx: new web3.Transaction().add(...instructions),
    signers: [],
    accounts: instructions.flatMap((i) => i.keys.map((k) => k.pubkey)),
    project,
  };
}

type FundRewardsArgs = {
  metaplex: Metaplex;
  project: web3.PublicKey;
  amount: number;
  programId?: web3.PublicKey;
};

export async function fundRewards({ metaplex: mx, ...args }: FundRewardsArgs) {
  const projectAccount = await Project.fromAccountAddress(
    mx.connection,
    args.project
  );

  const wallet = mx.identity();
  const ctx = createFundRewardsCtx(
    args.project,
    projectAccount.rewardMint,
    wallet.publicKey,
    args.amount,
    args.programId
  );

  const blockhash = await mx.connection.getLatestBlockhash();

  ctx.tx.recentBlockhash = blockhash.blockhash;

  const response = await mx
    .rpc()
    .sendAndConfirmTransaction(ctx.tx, { skipPreflight: true }, ctx.signers);

  return {
    response,
    project: ctx.project,
  };
}
