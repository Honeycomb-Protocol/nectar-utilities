import { PublicKey } from "@solana/web3.js";
import type { AvailableNft, HeluisAsset, Metadata } from "../types";
import { NectarStaking } from "../NectarStaking";

export const parseHeliusAsset = (asset: HeluisAsset): Metadata => {
  let collection: any = null;
  const foundCollection = asset.grouping.find(
    (g) => g.group_key === "collection"
  );
  if (foundCollection) {
    collection = {
      verified: true,
      address: new PublicKey(
        asset.grouping.find((g) => g.group_key === "collection").group_value
      ),
    };
  }
  return {
    mint: new PublicKey(asset.id),
    json: null,
    jsonLoaded: false,
    name: asset.content.metadata.name,
    symbol: asset.content.metadata.symbol,
    uri: asset.content.json_uri,
    creators: asset.creators.map((creator) => ({
      ...creator,
      address: new PublicKey(creator.address),
    })),
    collection,
    isProgrammableNft:
      asset.content?.metadata?.token_standard == "ProgrammableNonFungible" ||
      asset.interface === "ProgrammableNFT",
    programmableConfig: {
      ruleSet: new PublicKey("eBJLFYPxJmMGKuFwpDWkzxZeUrad92kZRC5BJLpzyT9"),
    },
    isCompressed: asset.compression.compressed,
    frozen: asset.ownership.delegated || !!asset.ownership.delegate,
    compression: !asset.compression.compressed
      ? null
      : {
          leafId: asset.compression.leaf_id,
          dataHash: new PublicKey(asset.compression.data_hash),
          creatorHash: new PublicKey(asset.compression.creator_hash),
          assetHash: new PublicKey(asset.compression.asset_hash),
          tree: new PublicKey(asset.compression.tree),
        },
    links: asset.content.links,
  };
};

export const checkCollection = (nft: AvailableNft, staking: NectarStaking) =>
  nft.collection &&
  staking.collections.length &&
  nft.collection.verified &&
  !!staking.collections.find((x) => x.equals(nft.collection.address));

export const checkCreator = (nft: AvailableNft, staking: NectarStaking) =>
  !!nft.creators.length &&
  !!staking.creators.length &&
  nft.creators.some(
    (creator) =>
      creator.verified &&
      staking.creators.find((x) => x.equals(creator.address))
  );

export const checkMerkleTree = (nft: AvailableNft, staking: NectarStaking) =>
  nft.isCompressed &&
  staking.merkleTrees.length &&
  !!staking.merkleTrees.find((x) => x.equals(nft.compression.tree));

export const checkCriteria = (nft: AvailableNft, staking: NectarStaking) =>
  checkCollection(nft, staking) ||
  checkCreator(nft, staking) ||
  checkMerkleTree(nft, staking);
