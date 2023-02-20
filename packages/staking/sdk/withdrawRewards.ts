import * as web3 from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import {
  createWithdrawRewardsInstruction,
  Project,
  PROGRAM_ID,
} from "../generated";
import { TxSignersAccounts } from "../types";
import { Metaplex } from "@metaplex-foundation/js";
import { getVaultPda } from "../pdas";

export function createWithdrawRewardsCtx(
  project: web3.PublicKey,
  rewardMint: web3.PublicKey,
  authority: web3.PublicKey,
  amount: number,
  programId: web3.PublicKey = PROGRAM_ID
): TxSignersAccounts {
  const [vault] = getVaultPda(project, rewardMint, programId);

  const tokenAccount = splToken.getAssociatedTokenAddressSync(
    rewardMint,
    authority
  );

  const instructions: web3.TransactionInstruction[] = [
    createWithdrawRewardsInstruction(
      {
        project,
        rewardMint,
        vault,
        tokenAccount,
        authority,
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
  };
}

type WithdrawRewardsArgs = {
  metaplex: Metaplex;
  project: web3.PublicKey;
  amount: number;
  programId?: web3.PublicKey;
};

export async function withdrawRewards({
  metaplex: mx,
  ...args
}: WithdrawRewardsArgs) {
  const projectAccount = await Project.fromAccountAddress(
    mx.connection,
    args.project
  );

  const wallet = mx.identity();
  const ctx = createWithdrawRewardsCtx(
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
  };
}
