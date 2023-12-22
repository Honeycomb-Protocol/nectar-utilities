import { PublicKey } from "@solana/web3.js";
import type { AssetProof, Metadata } from "../types";
import { parseHeliusAsset } from "./misc";

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
  mint: PublicKey
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
    root: new PublicKey(result.root),
    proof: result.proof.map((x: string) => new PublicKey(x)),
    node_index: result.node_index,
    leaf: new PublicKey(result.root),
    tree_id: new PublicKey(result.root),
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
  mints: PublicKey[]
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
        root: new PublicKey(entry.root),
        proof: entry.proof.map((x: string) => new PublicKey(x)),
        node_index: entry.node_index,
        leaf: new PublicKey(entry.leaf),
        tree_id: new PublicKey(entry.tree_id),
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
        walletAddress: PublicKey;
        collectionAddress: PublicKey;
      }
    | { mintList: PublicKey[] }
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
            result.filter((x) => !!x).map(parseHeliusAsset) as Metadata[]
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
  return assetList.map(parseHeliusAsset) as Metadata[];
}
