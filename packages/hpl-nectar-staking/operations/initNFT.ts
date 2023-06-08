import * as web3 from "@solana/web3.js";
import { createInitNftInstruction, PROGRAM_ID } from "../generated";
import { getMetadataAccount_, getNftPda } from "../pdas";
import { VAULT, Operation, Honeycomb } from "@honeycomb-protocol/hive-control";
import { NectarStaking } from "../NectarStaking";

type CreateInitNftOperationArgs = {
  stakingPool: NectarStaking;
  nftMint: web3.PublicKey;
  programId?: web3.PublicKey;
};

export async function createInitNFTOperation(
  honeycomb: Honeycomb,
  args: CreateInitNftOperationArgs
) {
  const programId = args.programId || PROGRAM_ID;
  const [nft] = getNftPda(args.stakingPool.address, args.nftMint, programId);
  const [nftMetadata] = getMetadataAccount_(args.nftMint);

  const instructions: web3.TransactionInstruction[] = [
    createInitNftInstruction(
      {
        project: args.stakingPool.project().address,
        vault: VAULT,
        stakingPool: args.stakingPool.address,
        nft,
        nftMetadata,
        nftMint: args.nftMint,
        wallet: honeycomb.identity().address,
        delegateAuthority:
          honeycomb.identity().delegateAuthority()?.address || programId,
      },
      programId
    ),
  ];

  return {
    operation: new Operation(honeycomb, instructions),
  };
}
