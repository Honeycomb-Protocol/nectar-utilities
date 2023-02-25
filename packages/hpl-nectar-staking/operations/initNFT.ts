import * as web3 from "@solana/web3.js";
import { createInitNftInstruction, PROGRAM_ID } from "../generated";
import { getMetadataAccount_, getNftPda } from "../pdas";
import { VAULT, createCtx, Honeycomb } from "@honeycomb-protocol/hive-control";

type CreateInitNftCtxArgs = {
  project: web3.PublicKey;
  stakingPool: web3.PublicKey;
  nftMint: web3.PublicKey;
  wallet: web3.PublicKey;
  delegateAuthority?: web3.PublicKey;
  programId?: web3.PublicKey;
};

export function createInitNFTCtx(args: CreateInitNftCtxArgs) {
  const programId = args.programId || PROGRAM_ID;
  const [nft] = getNftPda(args.stakingPool, args.nftMint, programId);
  const [nftMetadata] = getMetadataAccount_(args.nftMint);

  const instructions: web3.TransactionInstruction[] = [
    createInitNftInstruction(
      {
        project: args.project,
        vault: VAULT,
        stakingPool: args.stakingPool,
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

type InitNFTArgs = {
  nftMint: web3.PublicKey;
  programId?: web3.PublicKey;
};

export async function initNft(honeycomb: Honeycomb, args: InitNFTArgs) {
  const wallet = honeycomb.identity();
  const ctx = createInitNFTCtx({
    project: honeycomb.projectAddress,
    stakingPool: honeycomb.staking().poolAddress,
    nftMint: args.nftMint,
    wallet: wallet.publicKey,
    delegateAuthority: wallet.getDelegateAuthority().delegateAuthorityAddress,
    programId: args.programId,
  });

  return honeycomb
    .rpc()
    .sendAndConfirmTransaction(ctx, { skipPreflight: true });
}
