import { Metadata, Metaplex } from "@metaplex-foundation/js";
import {
  TokenStandard,
  TokenRecord,
  TokenState,
} from "@metaplex-foundation/mpl-token-metadata";
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import * as web3 from "@solana/web3.js";
import { AvailableNft, StakedNft, TokenAccountInfo } from "../types";
import { NFT, Staker } from "../generated";
import { getMetadataAccount_, getStakerPda } from "../pdas";
import { Honeycomb } from "@honeycomb-protocol/hive-control";
import { NectarStaking } from "../NectarStaking";

/**
 * Represents the arguments for fetching a staker.
 * @category Types
 */
type FetchStakerArgs = {
  walletAddress?: web3.PublicKey;
  programId?: web3.PublicKey;
};

/**
 * Fetches a staker from the staking pool based on the provided `walletAddress`.
 * If no `walletAddress` is provided, it uses the `identity().address` from the Honeycomb instance.
 *
 * @category Helpers
 * @param honeycomb The Honeycomb instance used for fetching staker data.
 * @param args Optional arguments for fetching the staker.
 * @returns A promise that resolves to the Staker instance representing the staker data.
 *
 * @example
 * const honeycomb = new Honeycomb(...);
 * const staker = await fetchStaker(honeycomb, {
 *   walletAddress: 'YOUR_WALLET_ADDRESS',
 *   programId: 'YOUR_PROGRAM_ID',
 * });
 */
export function fetchStaker(honeycomb: Honeycomb, args: FetchStakerArgs) {
  const [staker] = getStakerPda(
    honeycomb.staking().poolAddress,
    args?.walletAddress || honeycomb.identity().address,
    args?.programId
  );
  return Staker.fromAccountAddress(honeycomb.connection, staker);
}

/**
 * Represents the arguments for fetching staked NFTs.
 * @category Types
 */
type FetchStakedNftsArgs = {
  walletAddress?: web3.PublicKey;
  programId?: web3.PublicKey;
};

/**
 * Fetches staked NFTs for a given `walletAddress` from the staking pool.
 *
 * @category Helpers
 * @param honeycomb The Honeycomb instance used for fetching staked NFTs.
 * @param args Optional arguments for fetching staked NFTs.
 * @returns A promise that resolves to an array of StakedNft instances representing the staked NFTs.
 *
 * @example
 * const honeycomb = new Honeycomb(...);
 * const stakedNFTs = await fetchStakedNfts(honeycomb, {
 *   walletAddress: 'YOUR_WALLET_ADDRESS',
 *   programId: 'YOUR_PROGRAM_ID',
 * });
 */
export async function fetchStakedNfts(
  honeycomb: Honeycomb,
  args?: FetchStakedNftsArgs
) {
  const nfts = await honeycomb
    .staking()
    .fetch()
    .nftsByWallet(args.walletAddress);
  const mx = new Metaplex(honeycomb.connection);
  const metaplexOut: StakedNft[] = await mx
    .nfts()
    .findAllByMintList({ mints: nfts.map((x) => x.mint) })
    .then((metaplexNfts) => {
      return (
        metaplexNfts.filter((x) => x.model == "metadata") as Metadata[]
      ).map(
        (nft) =>
          ({
            ...nft,
            ...nfts.find((x) => x.mint.equals(nft.mintAddress)),
          } as StakedNft)
      );
    });

  return metaplexOut;
}

/**
 * Represents the arguments for fetching available NFTs.
 * @category Types
 */
type FetchAvailableNfts = {
  walletAddress?: web3.PublicKey;
  allowedMints?: web3.PublicKey[];
  programId?: web3.PublicKey;
};

/**
 * Fetches available NFTs for a given `walletAddress`.
 *
 * @category Helpers
 * @param honeycomb The Honeycomb instance used for fetching available NFTs.
 * @param args Optional arguments for fetching available NFTs.
 * @returns A promise that resolves to an array of AvailableNft instances representing the available NFTs.
 *
 * @example
 * const honeycomb = new Honeycomb(...);
 * const availableNFTs = await fetchAvailableNfts(honeycomb, {
 *   walletAddress: 'YOUR_WALLET_ADDRESS',
 *   allowedMints: ['MINT_ADDRESS_1', 'MINT_ADDRESS_2'],
 *   programId: 'YOUR_PROGRAM_ID',
 * });
 */
export async function fetchAvailableNfts(
  honeycomb: Honeycomb,
  args?: FetchAvailableNfts
) {
  const wallet = args?.walletAddress || honeycomb.identity().address;
  const ownedTokenAccounts: TokenAccountInfo[] = await honeycomb.connection
    .getParsedTokenAccountsByOwner(wallet, {
      programId: TOKEN_PROGRAM_ID,
    })
    .then((x) =>
      x.value
        .map((x) => ({
          ...x.account.data.parsed.info,
          tokenMint: new web3.PublicKey(x.account.data.parsed.info.mint),
        }))
        .filter((x) => x.tokenAmount.uiAmount > 0)
    );

  const mx = new Metaplex(honeycomb.connection);
  let ownedNfts = await mx
    .nfts()
    .findAllByMintList({
      mints: ownedTokenAccounts.map((x) => x.tokenMint),
    })
    .then((nfts) =>
      (nfts.filter((x) => x?.model == "metadata") as Metadata[]).map((x) => {
        return {
          ...x,
          ...ownedTokenAccounts.find(
            (y) => y.tokenMint.toString() === x.mintAddress.toString()
          ),
        } as AvailableNft;
      })
    );

  ownedNfts = await Promise.all(
    ownedNfts.map(async (nft) => {
      if (nft.tokenStandard === TokenStandard.ProgrammableNonFungible) {
        const tokenAccount = getAssociatedTokenAddressSync(
          nft.mintAddress,
          wallet
        );
        const [tokenRecord] = getMetadataAccount_(nft.mintAddress, {
          __kind: "token_record",
          tokenAccount,
        });
        nft.tokenRecord = await TokenRecord.fromAccountAddress(
          honeycomb.connection,
          tokenRecord
        );
      }
      return nft;
    })
  );

  ownedNfts = ownedNfts.filter((x) => {
    if (
      x.tokenStandard &&
      x.tokenStandard === TokenStandard.ProgrammableNonFungible
    ) {
      return x.tokenRecord && x.tokenRecord.state === TokenState.Unlocked;
    }
    return x.state !== "frozen";
  });

  let filteredNfts: AvailableNft[] = [];

  if (honeycomb.staking().allowedMints) {
    const allowedMints: web3.PublicKey[] =
      args?.allowedMints ||
      (await NFT.gpaBuilder(args.programId)
        .addFilter("stakingPool", honeycomb.staking().poolAddress)
        .addFilter("staker", web3.PublicKey.default)
        .run(honeycomb.connection)
        .then((nfts) =>
          nfts.map(({ account }) => NFT.fromAccountInfo(account)[0].mint)
        ));

    filteredNfts = [
      ...filteredNfts,
      ...ownedNfts.filter(
        (nft) => nft.tokenMint && allowedMints.includes(nft.tokenMint)
      ),
    ];
  }

  const validCollections = !!honeycomb.staking().collections.length
    ? honeycomb
        .project()
        .collections.filter((_, i) =>
          honeycomb.staking().collections.includes(i)
        )
    : [];
  const validCreators = !!honeycomb.staking().creators
    ? honeycomb
        .project()
        .creators.filter((_, i) => honeycomb.staking().creators.includes(i))
    : [];

  filteredNfts = [
    ...filteredNfts,
    ...ownedNfts.filter(
      (nft) =>
        (nft.collection &&
          validCollections.length &&
          nft.collection.verified &&
          !!validCollections.find((x) => x.equals(nft.collection.address))) ||
        (!!nft.creators.length &&
          !!validCreators.length &&
          nft.creators.some(
            (creator) =>
              creator.verified &&
              validCreators.find((x) => x.equals(creator.address))
          ))
    ),
  ];

  filteredNfts = filteredNfts.filter(
    (nft, index, self) =>
      self.findIndex((t) => t.address.equals(nft.address)) === index
  );

  // filteredNfts = await Promise.all(
  //   filteredNfts.map(async (nft) => {
  //     const newNft = { ...nft };
  //     if (!newNft.jsonLoaded) {
  //       if (!newNft.json) {
  //         newNft.json = await fetch(newNft.uri, {
  //           method: "GET",
  //           redirect: "follow",
  //         })
  //           .then((x) => x.json())
  //           .catch();
  //       }
  //       newNft.jsonLoaded = !!newNft.json;
  //     }
  //     return newNft;
  //   })
  // );

  return filteredNfts;
}

/**
 * Represents the arguments for fetching rewards for a staker's NFT.
 * @category Types
 */
type FetchRewardsArgs = {
  staker: Staker;
  nft: StakedNft;
  till?: Date;
};

/**
 * Fetches the rewards and multipliers for a given staker's NFT.
 *
 * @category Helpers
 * @param staking The NectarStaking instance used for fetching rewards and multipliers.
 * @param args Arguments for fetching rewards for a staker's NFT.
 * @returns A promise that resolves to an object containing the rewards and multipliers for the NFT.
 *
 * @example
 * const staking = new NectarStaking(...);
 * const staker = ... // Get the staker instance
 * const nft = ... // Get the staked NFT instance
 * const rewards = await fetchRewards(staking, { staker, nft });
 */
export async function fetchRewards(
  staking: NectarStaking,
  args: FetchRewardsArgs
) {
  const end: number = (args.till?.getTime() || Date.now()) / 1000;
  let secondsElapsed = end - Number(args.nft.lastClaim);
  // if (secondsElapsed < Number(staking.rewardsDuration)) {
  //   return { rewards: 0, multipliers: 0 };
  // }

  const maxRewardsDuration =
    staking.maxRewardsDuration && Number(staking.maxRewardsDuration);
  if (maxRewardsDuration && maxRewardsDuration < secondsElapsed) {
    secondsElapsed = maxRewardsDuration;
  }

  const rewardsPerSecond =
    Number(staking.rewardsPerDuration) / Number(staking.rewardsDuration);
  let rewardsAmount = rewardsPerSecond * secondsElapsed;

  let multipliersDecimals = 1;
  let totalMultipliers = multipliersDecimals;

  const multipliers = await staking.multipliers();
  if (multipliers) {
    multipliersDecimals = 10 ** multipliers.decimals;
    totalMultipliers = multipliersDecimals;

    let durationMultiplier = multipliersDecimals;
    for (const multiplier of multipliers.durationMultipliers) {
      if (
        multiplier.multiplierType.__kind === "StakeDuration" &&
        secondsElapsed < Number(multiplier.multiplierType.minDuration)
      ) {
        durationMultiplier = Number(multiplier.value);
      } else {
        break;
      }
    }
    durationMultiplier -= multipliersDecimals;
    totalMultipliers += durationMultiplier;

    let countMultiplier = multipliersDecimals;
    for (const multiplier of multipliers.countMultipliers) {
      if (
        multiplier.multiplierType.__kind === "NFTCount" &&
        Number(multiplier.multiplierType.minCount) <=
          Number(args.staker.totalStaked)
      ) {
        countMultiplier = Number(multiplier.value);
      } else {
        break;
      }
    }
    countMultiplier -= multipliersDecimals;
    totalMultipliers += countMultiplier;

    let creatorMultiplier = multipliersDecimals;
    for (const multiplier of multipliers.creatorMultipliers) {
      if (
        multiplier.multiplierType.__kind === "Creator" &&
        args.nft.creator === multiplier.multiplierType.creator
      ) {
        creatorMultiplier = Number(multiplier.value);
        break;
      }
    }
    creatorMultiplier -= multipliersDecimals;
    totalMultipliers += creatorMultiplier;

    let collectionMultiplier = multipliersDecimals;
    for (const multiplier of multipliers.collectionMultipliers) {
      if (
        multiplier.multiplierType.__kind === "Collection" &&
        args.nft.collection === multiplier.multiplierType.collection
      ) {
        collectionMultiplier = Number(multiplier.value);
        break;
      }
    }
    collectionMultiplier -= multipliersDecimals;
    totalMultipliers += collectionMultiplier;
  }

  rewardsAmount = (rewardsAmount * totalMultipliers) / multipliersDecimals;
  return {
    rewards: rewardsAmount,
    multipliers: totalMultipliers / multipliersDecimals,
  };
}
