import {
  Metaplex,
  Metadata as MetaplexMetadata,
} from "@metaplex-foundation/js";
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
import { AvailableNft, Metadata, StakedNft, TokenAccountInfo } from "../types";
import { NFT, Staker } from "../generated";
import { getMetadataAccount_, getStakerPda } from "../pdas";
import { Honeycomb } from "@honeycomb-protocol/hive-control";
import { NectarStaking } from "../NectarStaking";

const HELIUS_RPC_URL =
  "https://devnet.helius-rpc.com/?api-key=014b4690-ef6d-4cab-b9e9-d3ec73610d52";

const parseAsset = (asset: any): Metadata => {
  let collection: any = null;
  const foundCollection = asset.grouping.find(
    (g) => g.group_key === "collection"
  );
  if (foundCollection) {
    collection = {
      verified: true,
      address: new web3.PublicKey(
        asset.grouping.find((g) => g.group_key === "collection").group_value
      ),
    };
  }
  return {
    mint: new web3.PublicKey(asset.id),
    json: null,
    jsonLoaded: false,
    name: asset.content.metadata.name,
    symbol: asset.content.metadata.symbol,
    uri: asset.content.json_uri,
    creators: asset.creators.map((creator) => ({
      ...creator,
      address: new web3.PublicKey(creator.address),
    })),
    collection,
    merkleTree: new web3.PublicKey(asset.compression.tree),
    isCompressed: true,
    frozen: false,
  };
};

const parseMetaplexMetadata = (metadata: MetaplexMetadata): Metadata => {
  return {
    mint: metadata.mintAddress,
    json: metadata.json,
    jsonLoaded: metadata.jsonLoaded,
    name: metadata.name,
    symbol: metadata.symbol,
    uri: metadata.uri,
    creators: metadata.creators,
    collection: metadata.collection,
    isCompressed: false,
    frozen: false,
  };
};

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
 * Fetches compressed NFTs of the provided wallet and collection
 *
 * @param args Arguements containing wallet address and collection address
 * @returns A promise that resolves to metadata objects of cNFTs
 *
 * @example
 * const cnfts = await fetchCNfts({
 *   walletAddress: 'YOUR_WALLET_ADDRESS',
 *   collectionAddress: 'COLLECTION_ADDRESS',
 * });
 */
export async function fetchCNfts(
  honeycomb: Honeycomb,
  args:
    | {
        walletAddress: web3.PublicKey;
        collectionAddress: web3.PublicKey;
      }
    | { assetList: web3.PublicKey[] }
) {
  if ("assetList" in args) {
    let batch = args.assetList.map((e, i) => ({
      jsonrpc: "2.0",
      id: `my-id-${i}`,
      method: "getAsset",
      params: {
        id: e.toString(),
      },
    }));
    try {
      const response = await honeycomb
        .http()
        .request(
          "https://devnet.helius-rpc.com/?api-key=014b4690-ef6d-4cab-b9e9-d3ec73610d52",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(batch),
          }
        );
      return response
        .json()
        .then(
          (r) => r.map(({ result }) => result).map(parseAsset) as Metadata[]
        );
    } catch {
      return [];
    }
  }

  let page: number = 1;
  let assetList: any = [];
  while (page > 0) {
    try {
      const response = await honeycomb
        .http()
        .request(HELIUS_RPC_URL as string, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            jsonrpc: "2.0",
            id: Math.random().toString(36).substring(7),
            method: "searchAssets",
            params: {
              ownerAddress: args.walletAddress.toString(),
              grouping: ["collection", args.collectionAddress.toString()],
              compressed: true,
              page: page,
              limit: 1000,
            },
          }),
        });
      const { result } = await response.json();
      assetList.push(...result.items);
      if (result.total !== 1000) {
        page = 0;
      } else {
        page++;
      }
    } catch {
      break;
    }
  }
  return assetList.map(parseAsset) as Metadata[];
}

export async function fetchNftsByMintList(
  honeycomb: Honeycomb,
  mints: web3.PublicKey[]
) {
  const mx = new Metaplex(honeycomb.connection);
  return mx
    .nfts()
    .findAllByMintList({ mints })
    .then(
      (nfts) => nfts.filter((x) => x.model === "metadata") as MetaplexMetadata[]
    )
    .then((nfts) => nfts.map(parseMetaplexMetadata));
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

  let ownedNfts: StakedNft[] = [
    ...(await fetchNftsByMintList(
      honeycomb,
      nfts.filter((n) => !n.isCompressed).map((x) => x.mint)
    )),
    ...(await fetchCNfts(honeycomb, {
      assetList: nfts.filter((n) => n.isCompressed).map((x) => x.mint),
    })),
  ].map((nft) => ({
    ...nft,
    ...nfts.find((x) => x.mint.equals(nft.mint)),
  }));

  // await Promise.all(
  //   ownedNfts.map(async (nft) => {
  //     if (!nft.jsonLoaded) {
  //       if (!nft.json) {
  //         nft.json = await honeycomb
  //           .http()
  //           .request(nft.uri, {
  //             method: "GET",
  //             redirect: "follow",
  //             maxRedirects: 2,
  //           })
  //           .catch();
  //       }
  //       nft.jsonLoaded = !!nft.json;
  //     }

  //     return nft;
  //   })
  // );

  return ownedNfts;
}

/**
 * Represents the arguments for fetching available NFTs.
 * @category Types
 */
type FetchAvailableNfts = {
  project?: web3.PublicKey;
  stakingPool?: web3.PublicKey;
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

  let ownedNfts: AvailableNft[] = [
    ...(await fetchNftsByMintList(
      honeycomb,
      ownedTokenAccounts.map((x) => x.tokenMint)
    )),
    ...(await Promise.all(
      (args.stakingPool
        ? honeycomb.staking(args.stakingPool).collections
        : args.project
        ? honeycomb.project(args.project).collections
        : []
      ).map((collection) =>
        fetchCNfts(honeycomb, {
          walletAddress: wallet,
          collectionAddress: collection,
        })
      )
    ).then((x) => x.flat())),
  ];

  ownedNfts = await Promise.all(
    ownedNfts.map(async (nft) => {
      const tokenAccount = ownedTokenAccounts.find((tokenAccount) =>
        tokenAccount.tokenMint.equals(nft.mint)
      );
      if (tokenAccount) {
        nft.frozen = tokenAccount.state === "frozen";
      }

      if (nft.tokenStandard === TokenStandard.ProgrammableNonFungible) {
        const tokenAccount = getAssociatedTokenAddressSync(nft.mint, wallet);
        const [tokenRecord] = getMetadataAccount_(nft.mint, {
          __kind: "token_record",
          tokenAccount,
        });
        nft.tokenRecord = await TokenRecord.fromAccountAddress(
          honeycomb.connection,
          tokenRecord
        );

        if (nft.tokenRecord && nft.tokenRecord.state !== TokenState.Unlocked) {
          return null;
        }
      } else {
        if (nft.frozen) return null;
      }

      // if (!nft.jsonLoaded) {
      //   if (!nft.json) {
      //     nft.json = await honeycomb
      //       .http()
      //       .request(nft.uri, {
      //         method: "GET",
      //         redirect: "follow",
      //         maxRedirects: 2,
      //       })
      //       .catch();
      //   }
      //   nft.jsonLoaded = !!nft.json;
      // }

      return nft;
    })
  ).then((nfts) => nfts.filter((x) => !!x));

  let filteredNfts: AvailableNft[] = [];

  if (honeycomb.staking().allowedMints) {
    const allowedMints: web3.PublicKey[] =
      args?.allowedMints ||
      (await NFT.gpaBuilder(args.programId)
        .addFilter("stakingPool", honeycomb.staking().poolAddress)
        .addFilter("staker", null)
        .run(honeycomb.connection)
        .then((nfts) =>
          nfts.map(({ account }) => NFT.fromAccountInfo(account)[0].mint)
        ));

    filteredNfts = [
      ...filteredNfts,
      ...ownedNfts.filter((nft) => nft.mint && allowedMints.includes(nft.mint)),
    ];
  }

  filteredNfts = [
    ...filteredNfts,
    ...ownedNfts.filter(
      (nft) =>
        (nft.collection &&
          honeycomb.staking().collections.length &&
          nft.collection.verified &&
          !!honeycomb
            .staking()
            .collections.find((x) => x.equals(nft.collection.address))) ||
        (!!nft.creators.length &&
          !!honeycomb.staking().creators.length &&
          nft.creators.some(
            (creator) =>
              creator.verified &&
              honeycomb
                .staking()
                .creators.find((x) => x.equals(creator.address))
          )) ||
        (nft.merkleTree &&
          honeycomb.staking().merkleTrees.length &&
          !!honeycomb
            .staking()
            .merkleTrees.find((x) => x.equals(nft.merkleTree)))
    ),
  ];

  filteredNfts = filteredNfts.filter(
    (nft, index, self) =>
      self.findIndex((t) => t.mint.equals(nft.mint)) === index
  );

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
        args.nft.criteria.__kind === "Creator" &&
        args.nft.criteria.address.equals(multiplier.multiplierType.creator)
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
        args.nft.criteria.__kind === "Collection" &&
        args.nft.criteria.address.equals(multiplier.multiplierType.collection)
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
