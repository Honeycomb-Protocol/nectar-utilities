import * as web3 from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import {
  createUnstakeInstruction,
  LockType,
  MultipliersArgs,
  PROGRAM_ID,
} from "../generated";
import { StakedNft } from "../types";
import {
  getMetadataAccount_,
  getDepositPda,
  getNftPda,
  getStakerPda,
  METADATA_PROGRAM_ID,
} from "../pdas";
import { createClaimRewardsCtx } from "./claimRewards";
import { TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import { VAULT, createCtx, Honeycomb } from "@honeycomb-protocol/hive-control";
import { PROGRAM_ID as AUTHORIZATION_PROGRAM_ID } from "@metaplex-foundation/mpl-token-auth-rules";

type CreateUnstakeInstructionArgs = {
  project: web3.PublicKey;
  stakingPool: web3.PublicKey;
  nftMint: web3.PublicKey;
  wallet: web3.PublicKey;
  authRuleSet?: web3.PublicKey;
  lockType?: LockType; // default: LockType.Freeze,
  tokenStandard?: TokenStandard; // deafult: TokenStandard.NonFungible,
  programId?: web3.PublicKey;
};

function createUnstakeInstructionV2(args: CreateUnstakeInstructionArgs) {
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

  return createUnstakeInstruction(
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
      authorizationRulesProgram: args.authRuleSet
        ? AUTHORIZATION_PROGRAM_ID
        : programId,
      authorizationRules: args.authRuleSet || programId,
    },
    programId
  );
}

type CreateUnstakeCtxArgs = {
  nft: StakedNft;
  multipliers?: MultipliersArgs & {
    address: web3.PublicKey;
  };
  isFirst?: boolean;
  programId?: web3.PublicKey;
};
export async function createUnstakeCtx(
  honeycomb: Honeycomb,
  args: CreateUnstakeCtxArgs
) {
  const instructions: web3.TransactionInstruction[] = [];
  const signers: web3.Signer[] = [];

  const claimCtx = await createClaimRewardsCtx({
    wallet: honeycomb.identity().publicKey,
    connection: honeycomb.connection,
    project: honeycomb.project().projectAddress,
    stakingPool: honeycomb.staking().pool(),
    nft: args.nft,
    multipliers: args.multipliers?.address,
    isFirst: args.isFirst,
    programId: args.programId,
  });

  instructions.push(...claimCtx.tx.instructions);
  signers.push(...claimCtx.signers);

  const unstakeIx = createUnstakeInstructionV2({
    project: honeycomb.project().projectAddress,
    stakingPool: honeycomb.staking().poolAddress,
    nftMint: args.nft.mintAddress,
    wallet: honeycomb.identity().publicKey,
    authRuleSet: args.nft.programmableConfig?.ruleSet,
    lockType: honeycomb.staking().lockType,
    tokenStandard: args.nft.tokenStandard,
    programId: args.programId,
  });
  instructions.push(unstakeIx);

  return createCtx(instructions, signers);
}

type UnstakeArgs = {
  nfts: StakedNft[];
  programId?: web3.PublicKey;
};
export async function unstake(honeycomb: Honeycomb, args: UnstakeArgs) {
  const ctxs = await Promise.all(
    args.nfts.map((nft, i) =>
      createUnstakeCtx(honeycomb, {
        nft,
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
