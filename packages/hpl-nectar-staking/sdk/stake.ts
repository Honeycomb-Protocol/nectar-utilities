import * as web3 from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import {
  createStakeInstruction,
  LockType,
  PROGRAM_ID,
  StakingProject,
} from "../generated";
import { AvailableNft, Context } from "../types";
import { Metaplex } from "@metaplex-foundation/js";
import { TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import {
  getMetadataAccount_,
  getDepositPda,
  getNftPda,
  getStakerPda,
  getStakingProjectPda,
  METADATA_PROGRAM_ID,
} from "../pdas";
import { createCtx, getOrFetchNft, getOrFetchStaker } from "../utils";
import { createInitStakerCtx } from "./initStaker";
import { createInitNFTCtx } from "./initNFT";
import { VAULT } from "@honeycomb-protocol/hive-control";

type CreateStakeCtxArgs = {
  metaplex: Metaplex;
  stakingProject: StakingProject;
  nft: AvailableNft;
  isFirst?: boolean;
  programId?: web3.PublicKey;
};

type CreateStakeTransactionArgs = {
  project: web3.PublicKey;
  stakingProject: web3.PublicKey;
  nftMint: web3.PublicKey;
  wallet: web3.PublicKey;
  lockType?: LockType; // default: LockType.Freeze,
  tokenStandard?: TokenStandard; // default: TokenStandard.NonFungible,
  programId?: web3.PublicKey;
};

export function createStakeInstructionV2(args: CreateStakeTransactionArgs) {
  const programId = args.programId || PROGRAM_ID;

  const [nft] = getNftPda(args.stakingProject, args.nftMint);
  const nftAccount = splToken.getAssociatedTokenAddressSync(
    args.nftMint,
    args.wallet
  );
  const [nftMetadata] = getMetadataAccount_(args.nftMint);
  const [nftEdition] = getMetadataAccount_(args.nftMint, { __kind: "edition" });
  const [staker] = getStakerPda(args.stakingProject, args.wallet);

  let nftTokenRecord: web3.PublicKey | undefined,
    depositAccount: web3.PublicKey | undefined,
    depositTokenRecord: web3.PublicKey | undefined;

  if (args.lockType === LockType.Custoday) {
    [depositAccount] = getDepositPda(args.nftMint);
  }

  if (args.tokenStandard === TokenStandard.ProgrammableNonFungible) {
    [nftTokenRecord] = getMetadataAccount_(args.nftMint, {
      __kind: "token_record",
      tokenAccount: nftAccount,
    });
    if (depositAccount && args.lockType === LockType.Custoday) {
      [depositTokenRecord] = getMetadataAccount_(args.nftMint, {
        __kind: "token_record",
        tokenAccount: depositAccount,
      });
    }
  }

  return createStakeInstruction(
    {
      project: args.project,
      vault: VAULT,
      stakingProject: args.stakingProject,
      nft,
      nftMint: args.nftMint,
      nftAccount,
      nftMetadata,
      nftEdition,
      nftTokenRecord: nftTokenRecord || programId,
      depositAccount: depositAccount || programId,
      depositTokenRecord: depositTokenRecord || programId,
      staker,
      wallet: args.wallet,
      associatedTokenProgram: splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
      tokenMetadataProgram: METADATA_PROGRAM_ID,
      clock: web3.SYSVAR_CLOCK_PUBKEY,
      sysvarInstructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
    },
    programId
  );
}

export async function createStakeCtx({
  metaplex: mx,
  ...args
}: CreateStakeCtxArgs) {
  const instructions: web3.TransactionInstruction[] = [];
  const signers: web3.Signer[] = [];

  const wallet = mx.identity();
  const [stakingProjectAddress] = getStakingProjectPda(
    args.stakingProject.project,
    args.stakingProject.key,
    args.programId
  );

  if (args.isFirst) {
    const staker = await getOrFetchStaker(
      mx.connection,
      wallet.publicKey,
      stakingProjectAddress,
      args.programId
    );
    if (!staker) {
      const initStakerCtx = createInitStakerCtx({
        project: args.stakingProject.project,
        stakingProject: stakingProjectAddress,
        wallet: wallet.publicKey,
        programId: args.programId,
      });
      instructions.push(...initStakerCtx.tx.instructions);
      signers.push(...initStakerCtx.signers);
    }
  }

  const nft = await getOrFetchNft(
    mx.connection,
    args.nft.tokenMint,
    stakingProjectAddress,
    args.programId
  );
  if (!nft) {
    const initNftCtx = createInitNFTCtx({
      project: args.stakingProject.project,
      stakingProject: stakingProjectAddress,
      nftMint: args.nft.tokenMint,
      wallet: wallet.publicKey,
      programId: args.programId,
    });
    instructions.push(...initNftCtx.tx.instructions);
    signers.push(...initNftCtx.signers);
  }

  instructions.push(
    createStakeInstructionV2({
      project: args.stakingProject.project,
      stakingProject: stakingProjectAddress,
      nftMint: args.nft.tokenMint,
      wallet: wallet.publicKey,
      lockType: args.stakingProject.lockType,
      tokenStandard: args.nft.tokenStandard,
      programId: args.programId,
    })
  );

  return createCtx(instructions, signers);
}

export async function stake(
  metaplex: Metaplex,
  stakingProject: StakingProject,
  ...nfts: AvailableNft[]
) {
  const wallet = metaplex.identity();
  const txs = await Promise.all(
    nfts.map((nft, i) =>
      createStakeCtx({
        metaplex,
        stakingProject,
        nft,
        isFirst: i == 0,
      })
    )
  );

  if (!!!txs.length) return [];

  const recentBlockhash = await metaplex.connection.getLatestBlockhash();
  const txns: web3.Transaction[] = [];
  for (let tx of txs) {
    tx.tx.recentBlockhash = recentBlockhash.blockhash;
    tx.tx.feePayer = wallet.publicKey;
    tx.signers.length && tx.tx.partialSign(...tx.signers);
    txns.push(tx.tx);
  }
  const signedTxs = await wallet.signAllTransactions(txns);

  const firstTx = signedTxs.shift();

  if (!firstTx) return [];

  const firstResponse = await metaplex
    .rpc()
    .sendAndConfirmTransaction(firstTx, {
      commitment: "processed",
    });
  const responses = await Promise.all(
    signedTxs.map((t) =>
      metaplex.rpc().sendAndConfirmTransaction(t, { commitment: "processed" })
    )
  );

  return [firstResponse, ...responses];
}
