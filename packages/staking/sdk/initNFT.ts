import * as web3 from "@solana/web3.js";
import { createInitNftInstruction, PROGRAM_ID } from "../generated";
import { TxSignersAccounts } from "../types";
import { Metaplex } from "@metaplex-foundation/js";
import { getMetadataAccount_, getNftPda, METADATA_PROGRAM_ID } from "../pdas";

export function createInitNFTCtx(
  project: web3.PublicKey,
  nftMint: web3.PublicKey,
  wallet: web3.PublicKey,
  programId: web3.PublicKey = PROGRAM_ID
): TxSignersAccounts {
  const [nft] = getNftPda(project, nftMint, programId);
  const [nftMetadata] = getMetadataAccount_(nftMint);

  const instructions: web3.TransactionInstruction[] = [
    createInitNftInstruction(
      {
        project,
        nft,
        nftMetadata,
        nftMint,
        wallet,
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

type InitNFTArgs = {
  metaplex: Metaplex;
  project: web3.PublicKey;
  nftMint: web3.PublicKey;
  programId?: web3.PublicKey;
};

export async function initNft({ metaplex: mx, ...args }: InitNFTArgs) {
  const wallet = mx.identity();
  const ctx = createInitNFTCtx(args.project, args.nftMint, wallet.publicKey);

  const blockhash = await mx.connection.getLatestBlockhash();

  ctx.tx.recentBlockhash = blockhash.blockhash;

  const response = await mx
    .rpc()
    .sendAndConfirmTransaction(ctx.tx, { skipPreflight: true }, ctx.signers);

  return {
    response,
  };
}
