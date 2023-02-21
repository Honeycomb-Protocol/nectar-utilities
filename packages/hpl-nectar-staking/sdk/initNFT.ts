import * as web3 from "@solana/web3.js";
import { createInitNftInstruction, PROGRAM_ID } from "../generated";
import { Metaplex } from "@metaplex-foundation/js";
import { getMetadataAccount_, getNftPda } from "../pdas";
import { VAULT } from "@honeycomb-protocol/hive-control";
import { createCtx } from "../utils";

type InitNFTArgs = {
  metaplex: Metaplex;
  project: web3.PublicKey;
  stakingProject: web3.PublicKey;
  nftMint: web3.PublicKey;
  delegateAuthority?: web3.PublicKey;
  programId?: web3.PublicKey;
};

type CreateInitNftCtxArgs = {
  project: web3.PublicKey;
  stakingProject: web3.PublicKey;
  nftMint: web3.PublicKey;
  wallet: web3.PublicKey;
  delegateAuthority?: web3.PublicKey;
  programId?: web3.PublicKey;
};

export function createInitNFTCtx(args: CreateInitNftCtxArgs) {
  const programId = args.programId || PROGRAM_ID;
  const [nft] = getNftPda(args.stakingProject, args.nftMint, programId);
  const [nftMetadata] = getMetadataAccount_(args.nftMint);

  const instructions: web3.TransactionInstruction[] = [
    createInitNftInstruction(
      {
        project: args.project,
        vault: VAULT,
        stakingProject: args.stakingProject,
        nft,
        nftMetadata,
        nftMint: args.nftMint,
        wallet: args.wallet,
        delegateAuthority: args.delegateAuthority || programId,
      },
      programId
    ),
  ];

  return createCtx(instructions);
}

export async function initNft({ metaplex: mx, ...args }: InitNFTArgs) {
  const wallet = mx.identity();
  const ctx = createInitNFTCtx({
    project: args.project,
    stakingProject: args.stakingProject,
    nftMint: args.nftMint,
    wallet: wallet.publicKey,
    delegateAuthority: args.delegateAuthority,
    programId: args.programId,
  });

  ctx.tx.recentBlockhash = await mx.connection
    .getLatestBlockhash()
    .then((x) => x.blockhash);
  return {
    response: await mx
      .rpc()
      .sendAndConfirmTransaction(ctx.tx, { skipPreflight: true }, ctx.signers),
  };
}
