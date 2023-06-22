import * as web3 from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import { createUnstakeInstruction, LockType, PROGRAM_ID } from "../generated";
import { StakedNft } from "../types";
import {
  getMetadataAccount_,
  getDepositPda,
  getNftPda,
  getStakerPda,
  METADATA_PROGRAM_ID,
} from "../pdas";
import { TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import { VAULT, Honeycomb, Operation } from "@honeycomb-protocol/hive-control";
import { PROGRAM_ID as AUTHORIZATION_PROGRAM_ID } from "@metaplex-foundation/mpl-token-auth-rules";
import { NectarStaking } from "../NectarStaking";
import { createClaimRewardsOperation } from "./claimRewards";

type CreateUnstakeOperationArgs = {
  stakingPool: NectarStaking;
  nft: StakedNft;
  isFirst?: boolean;
  programId?: web3.PublicKey;
};

export async function createUnstakeOperation(
  honeycomb: Honeycomb,
  args: CreateUnstakeOperationArgs
) {
  const programId = args.programId || PROGRAM_ID;

  const [nft] = getNftPda(args.stakingPool.address, args.nft.mint);
  const nftAccount = splToken.getAssociatedTokenAddressSync(
    args.nft.mint,
    honeycomb.identity().address
  );
  const [nftMetadata] = getMetadataAccount_(args.nft.mint);
  const [nftEdition] = getMetadataAccount_(args.nft.mint, {
    __kind: "edition",
  });
  const [staker] = getStakerPda(
    args.stakingPool.address,
    honeycomb.identity().address
  );

  let nftTokenRecord: web3.PublicKey | undefined,
    depositAccount: web3.PublicKey | undefined,
    depositTokenRecord: web3.PublicKey | undefined;

  if (args.stakingPool.lockType === LockType.Custoday) {
    [depositAccount] = getDepositPda(args.nft.mint);
  }

  if (args.nft.tokenStandard === TokenStandard.ProgrammableNonFungible) {
    [nftTokenRecord] = getMetadataAccount_(args.nft.mint, {
      __kind: "token_record",
      tokenAccount: nftAccount,
    });
    if (depositAccount && args.stakingPool.lockType === LockType.Custoday) {
      [depositTokenRecord] = getMetadataAccount_(args.nft.mint, {
        __kind: "token_record",
        tokenAccount: depositAccount,
      });
    }
  }

  const instructions = [
    ...(await createClaimRewardsOperation(honeycomb, {
      stakingPool: honeycomb.staking(),
      nft: args.nft,
      isFirst: args.isFirst,
      programId: args.programId,
    }).then(({ operation }) => operation.instructions)),
    createUnstakeInstruction(
      {
        project: args.stakingPool.project().address,
        vault: VAULT,
        stakingPool: args.stakingPool.address,
        nft,
        nftMint: args.nft.mint,
        nftAccount,
        nftMetadata,
        nftEdition,
        nftTokenRecord: nftTokenRecord || programId,
        depositAccount: depositAccount || programId,
        depositTokenRecord: depositTokenRecord || programId,
        staker,
        wallet: honeycomb.identity().address,
        associatedTokenProgram: splToken.ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadataProgram: METADATA_PROGRAM_ID,
        clock: web3.SYSVAR_CLOCK_PUBKEY,
        sysvarInstructions: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
        authorizationRulesProgram: args.nft.programmableConfig?.ruleSet
          ? AUTHORIZATION_PROGRAM_ID
          : programId,
        authorizationRules: args.nft.programmableConfig?.ruleSet || programId,
      },
      programId
    ),
  ];

  return {
    operation: new Operation(honeycomb, instructions),
  };
}
