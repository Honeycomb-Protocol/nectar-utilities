import * as web3 from "@solana/web3.js";
import * as splToken from "@solana/spl-token";
import { createStakeInstruction, LockType, PROGRAM_ID } from "../generated";
import { AvailableNft } from "../types";
import { TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import {
  getMetadataAccount_,
  getDepositPda,
  getNftPda,
  getStakerPda,
  METADATA_PROGRAM_ID,
} from "../pdas";
import { VAULT, Honeycomb, Operation } from "@honeycomb-protocol/hive-control";
import { PROGRAM_ID as AUTHORIZATION_PROGRAM_ID } from "@metaplex-foundation/mpl-token-auth-rules";
import { NectarStaking } from "../NectarStaking";
import { createInitNFTOperation } from "./initNFT";
import { createInitStakerOperation } from "./initStaker";

type CreateStakeOperationArgs = {
  stakingPool: NectarStaking;
  nft: AvailableNft;
  isFirst?: boolean;
  programId?: web3.PublicKey;
};

export async function createStakeOperation(
  honeycomb: Honeycomb,
  args: CreateStakeOperationArgs
) {
  const programId = args.programId || PROGRAM_ID;

  const [nft] = getNftPda(args.stakingPool.address, args.nft.tokenMint);
  const nftAccount = splToken.getAssociatedTokenAddressSync(
    args.nft.tokenMint,
    honeycomb.identity().address
  );
  const [nftMetadata] = getMetadataAccount_(args.nft.tokenMint);
  const [nftEdition] = getMetadataAccount_(args.nft.tokenMint, {
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
    [depositAccount] = getDepositPda(nft);
  }

  if (args.nft.tokenStandard === TokenStandard.ProgrammableNonFungible) {
    [nftTokenRecord] = getMetadataAccount_(nft, {
      __kind: "token_record",
      tokenAccount: nftAccount,
    });
    if (depositAccount && args.stakingPool.lockType === LockType.Custoday) {
      [depositTokenRecord] = getMetadataAccount_(nft, {
        __kind: "token_record",
        tokenAccount: depositAccount,
      });
    }
  }

  const instructions = [
    createStakeInstruction(
      {
        project: args.stakingPool.project().address,
        vault: VAULT,
        stakingPool: args.stakingPool.address,
        nft,
        nftMint: args.nft.tokenMint,
        nftAccount,
        nftMetadata,
        nftEdition,
        nftTokenRecord: nftTokenRecord || programId,
        depositAccount: depositAccount || programId,
        depositTokenRecord: depositTokenRecord || programId,
        staker,
        wallet: honeycomb.identity().address,
        tokenProgram: splToken.TOKEN_2022_PROGRAM_ID,
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

  if (args.isFirst) {
    try {
      await args.stakingPool
        .fetch()
        .staker({ wallet: honeycomb.identity().address });
    } catch {
      createInitStakerOperation(honeycomb, {
        stakingPool: args.stakingPool,
        programId: args.programId,
      }).then(({ operation }) =>
        instructions.unshift(...operation.instructions)
      );
    }
  }

  try {
    const nft = await args.stakingPool.fetch().nft(args.nft.tokenMint).catch();
    if (!nft) throw new Error("NFT not initialized");
  } catch {
    await createInitNFTOperation(honeycomb, {
      stakingPool: args.stakingPool,
      nftMint: args.nft.tokenMint,
      programId: args.programId,
    }).then(({ operation }) => instructions.unshift(...operation.instructions));
  }

  return {
    operation: new Operation(honeycomb, instructions),
  };
}
