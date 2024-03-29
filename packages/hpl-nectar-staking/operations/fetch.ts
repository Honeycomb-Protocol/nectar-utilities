import * as web3 from "@solana/web3.js";
import {
  AssetProof,
  AvailableNft,
  HeluisAsset,
  Metadata,
  StakedNft,
} from "../types";
import { NFTv1, Staker } from "../generated";
import { getStakerPda } from "../pdas";
import { NectarStaking } from "../NectarStaking";

const parseHelius = (asset: HeluisAsset): Metadata => {
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
    isProgrammableNft:
      asset.interface === "Custom" && !asset.compression.compressed,
    programmableConfig: {
      ruleSet: new web3.PublicKey(
        "eBJLFYPxJmMGKuFwpDWkzxZeUrad92kZRC5BJLpzyT9"
      ),
    },
    isCompressed: asset.compression.compressed,
    frozen: asset.ownership.delegated,
    compression: !asset.compression.compressed
      ? null
      : {
          leafId: asset.compression.leaf_id,
          dataHash: new web3.PublicKey(asset.compression.data_hash),
          creatorHash: new web3.PublicKey(asset.compression.creator_hash),
          assetHash: new web3.PublicKey(asset.compression.asset_hash),
          tree: new web3.PublicKey(asset.compression.tree),
        },
    links: asset.content.links,
  };
};

const checkCollection = (nft: AvailableNft, staking: NectarStaking) =>
  nft.collection &&
  staking.collections.length &&
  nft.collection.verified &&
  !!staking.collections.find((x) => x.equals(nft.collection.address));

const checkCreator = (nft: AvailableNft, staking: NectarStaking) =>
  !!nft.creators.length &&
  !!staking.creators.length &&
  nft.creators.some(
    (creator) =>
      creator.verified &&
      staking.creators.find((x) => x.equals(creator.address))
  );

const checkMerkleTree = (nft: AvailableNft, staking: NectarStaking) =>
  nft.isCompressed &&
  staking.merkleTrees.length &&
  !!staking.merkleTrees.find((x) => x.equals(nft.compression.tree));

const checkCriteria = (nft: AvailableNft, staking: NectarStaking) =>
  checkCollection(nft, staking) ||
  checkCreator(nft, staking) ||
  checkMerkleTree(nft, staking);

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
export function fetchStaker(staking: NectarStaking, args: FetchStakerArgs) {
  const [staker] = getStakerPda(
    staking.poolAddress,
    args?.walletAddress || staking.honeycomb().identity().address,
    args?.programId
  );
  return Staker.fromAccountAddress(staking.honeycomb().connection, staker);
}

/**
 * Fetches the merkle proof of the cNFT
 *
 * @param args Arguements containing mint of cNFT
 * @returns A promise that resolves to AssetProof object
 *
 * @example
 * const assetProof = await getAssetProof(new web3.PulicKey(...));
 */
export async function fetchAssetProof(
  heliusRpc: string,
  mint: web3.PublicKey
): Promise<AssetProof> {
  const response = await fetch(heliusRpc as string, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "my-id",
      method: "getAssetProof",
      params: {
        id: mint.toString(),
      },
    }),
  });
  const { result } = await response.json();

  return {
    root: new web3.PublicKey(result.root),
    proof: result.proof.map((x: string) => new web3.PublicKey(x)),
    node_index: result.node_index,
    leaf: new web3.PublicKey(result.root),
    tree_id: new web3.PublicKey(result.root),
  };
}

/**
 * Fetches the merkle proof of the cNFTs
 *
 * @param args Arguements containing mints of cNFTs
 * @returns A promise that resolves to AssetProof objects
 *
 * @example
 * const assetProofs = await fetchAssetProofBatch(new web3.PulicKey(...));
 */
export async function fetchAssetProofBatch(
  heliusRpc: string,
  mints: web3.PublicKey[]
): Promise<{ [mint: string]: AssetProof }> {
  if (mints.length === 0) {
    return {};
  }

  const response = await fetch(heliusRpc, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "my-id",
      method: "getAssetProofBatch",
      params: {
        ids: mints.map((mint) => mint.toString()),
      },
    }),
  });

  const { result } = await response.json();

  const proofs: { [mint: string]: AssetProof } = {};

  for (const key in result) {
    if (result.hasOwnProperty(key)) {
      const entry = result[key];
      proofs[key] = {
        root: new web3.PublicKey(entry.root),
        proof: entry.proof.map((x: string) => new web3.PublicKey(x)),
        node_index: entry.node_index,
        leaf: new web3.PublicKey(entry.leaf),
        tree_id: new web3.PublicKey(entry.tree_id),
      };
    }
  }

  return proofs;
}

/**
 * Fetches compressed NFTs of the provided wallet & collection or asset list
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
export async function fetchHeliusAssets(
  heliusRpc: string,
  args:
    | {
        walletAddress: web3.PublicKey;
        collectionAddress: web3.PublicKey;
      }
    | { mintList: web3.PublicKey[] }
) {
  if ("mintList" in args) {
    try {
      return await fetch(heliusRpc, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "my-id",
          method: "getAssetBatch",
          params: {
            ids: args.mintList,
          },
        }),
      })
        .then((r) => r.json())
        .then(
          ({ result }) =>
            result.filter((x) => !!x).map(parseHelius) as Metadata[]
        );
    } catch (e) {
      console.error(e);
      console.error(e.response.data);
      return [];
    }
  }

  let page: number = 1;
  let assetList: any = [];
  while (page > 0) {
    try {
      const { result } = await fetch(heliusRpc, {
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
            page: page,
            limit: 1000,
          },
        }),
      }).then((r) => r.json());
      assetList.push(...result.items);
      if (result.total !== 1000) {
        page = 0;
      } else {
        page++;
      }
    } catch (e) {
      console.error(e);
      console.error(e.response.data);
      break;
    }
  }
  return assetList.map(parseHelius) as Metadata[];
}

/**
 * Represents the arguments for fetching staked NFTs.
 * @category Types
 */
type FetchStakedNftsArgs = {
  metadatas?: Metadata[];
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
  staking: NectarStaking,
  args?: FetchStakedNftsArgs
) {
  const nfts = await staking.fetch().nftsByWallet(args.walletAddress);
  if (!nfts.length) return [];

  const metadatas =
    args.metadatas ||
    (await fetchHeliusAssets(staking.helius_rpc, {
      mintList: nfts.map((x) => x.mint),
    }));

  let ownedNfts: StakedNft[] = metadatas.map((nft) => ({
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
  staking: NectarStaking,
  args?: FetchAvailableNfts
) {
  const wallet = args?.walletAddress || staking.honeycomb().identity().address;

  let ownedNfts: AvailableNft[] = [
    ...(await Promise.all(
      staking.collections.map((collection) =>
        fetchHeliusAssets(staking.helius_rpc, {
          walletAddress: wallet,
          collectionAddress: collection,
        })
      )
    ).then((x) => x.flat())),
  ];

  ownedNfts = ownedNfts.filter((x) => !!x && !x.frozen);

  // ownedNfts = await Promise.all(
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
  // )

  let filteredNfts: AvailableNft[] = [];

  if (staking.allowedMints) {
    const allowedMints: web3.PublicKey[] =
      args?.allowedMints ||
      (await NFTv1.gpaBuilder(args.programId)
        .addFilter("stakingPool", staking.poolAddress)
        .addFilter("staker", null)
        .run(staking.honeycomb().processedConnection)
        .then((nfts) =>
          nfts.map(({ account }) => NFTv1.fromAccountInfo(account)[0].mint)
        ));

    filteredNfts = [
      ...filteredNfts,
      ...ownedNfts.filter((nft) => nft.mint && allowedMints.includes(nft.mint)),
    ];
  }

  filteredNfts = [
    ...filteredNfts,
    ...ownedNfts.filter((nft) => checkCriteria(nft, staking)),
  ];

  let tempFilterSet = new Set();
  filteredNfts = filteredNfts.filter((nft, index, self) => {
    if (tempFilterSet.has(nft.mint)) return false;
    tempFilterSet.add(nft.mint);
    return true;
  });

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
