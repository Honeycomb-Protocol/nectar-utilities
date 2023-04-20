import * as web3 from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import {
  createStakeInstruction as createStakeInstructionGenerated,
  LockType,
  PROGRAM_ID,
} from "../generated";
import { AvailableNft } from "../types";
import { TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import {
  getMetadataAccount_,
  getDepositPda,
  getNftPda,
  getStakerPda,
  METADATA_PROGRAM_ID,
} from "../pdas";
import { createInitStakerCtx } from "./initStaker";
import { createInitNFTCtx } from "./initNFT";
import { VAULT, createCtx, Honeycomb } from "@honeycomb-protocol/hive-control";

type CreateStakeTransactionArgs = {
  project: web3.PublicKey;
  stakingPool: web3.PublicKey;
  nftMint: web3.PublicKey;
  wallet: web3.PublicKey;
  lockType?: LockType; // default: LockType.Freeze,
  tokenStandard?: TokenStandard; // default: TokenStandard.NonFungible,
  programId?: web3.PublicKey;
};

function createStakeInstruction(args: CreateStakeTransactionArgs) {
  const programId = args.programId || PROGRAM_ID;

  const [nft] = getNftPda(args.stakingPool, args.nftMint);
  const nftAccount = splToken.getAssociatedTokenAddressSync(
    args.nftMint,
    args.wallet
  );
  const [nftMetadata] = getMetadataAccount_(args.nftMint);
  const [nftEdition] = getMetadataAccount_(args.nftMint, { __kind: "edition" });
  const [staker] = getStakerPda(args.stakingPool, args.wallet);

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

  return createStakeInstructionGenerated(
    {
      project: args.project,
      vault: VAULT,
      stakingPool: args.stakingPool,
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

type CreateStakeCtxArgs = {
  nft: AvailableNft;
  isFirst?: boolean;
  programId?: web3.PublicKey;
};
export async function createStakeCtx(
  honeycomb: Honeycomb,
  args: CreateStakeCtxArgs
) {
  const instructions: web3.TransactionInstruction[] = [];
  const signers: web3.Signer[] = [];

  try {
    const nft = await honeycomb
      .staking()
      .fetch()
      .nft(args.nft.tokenMint)
      .catch();
    if (!nft) throw new Error("NFT not initialized");
  } catch {
    const initNftCtx = createInitNFTCtx({
      project: honeycomb.project().projectAddress,
      stakingPool: honeycomb.staking().poolAddress,
      nftMint: args.nft.tokenMint,
      wallet: honeycomb.identity().publicKey,
      programId: args.programId,
    });
    instructions.push(...initNftCtx.tx.instructions);
    signers.push(...initNftCtx.signers);
  }

  instructions.push(
    createStakeInstruction({
      project: honeycomb.project().projectAddress,
      stakingPool: honeycomb.staking().poolAddress,
      nftMint: args.nft.tokenMint,
      wallet: honeycomb.identity().publicKey,
      lockType: honeycomb.staking().lockType,
      tokenStandard: args.nft.tokenStandard,
      programId: args.programId,
    })
  );

  return createCtx(instructions, signers);
}

type StakeArgs = {
  nfts: AvailableNft[];
  programId?: web3.PublicKey;
};
export async function stake(honeycomb: Honeycomb, args: StakeArgs) {
  const wallet = honeycomb.identity();

  const ctxs = await Promise.all(
    args.nfts.map((nft, i) =>
      createStakeCtx(honeycomb, {
        nft,
        isFirst: i == 0,
        programId: args.programId,
      })
    )
  );

  try {
    await honeycomb.staking().fetch().staker();
  } catch {
    ctxs.unshift(
      createInitStakerCtx({
        project: honeycomb.project().projectAddress,
        stakingPool: honeycomb.staking().poolAddress,
        wallet: wallet.publicKey,
        programId: args.programId,
      })
    );
  }

  const preparedCtxs = await honeycomb.rpc().prepareTransactions(ctxs);

  const firstTxResponse = await honeycomb
    .rpc()
    .sendAndConfirmTransaction(preparedCtxs.shift(), {
      commitment: "processed",
      skipPreflight: true,
    });

  const responses = await honeycomb
    .rpc()
    .sendAndConfirmTransactionsInBatches(preparedCtxs, {
      commitment: "processed",
      skipPreflight: true,
    });

  return [firstTxResponse, ...responses];
}
