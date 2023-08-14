import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import * as web3 from "@solana/web3.js";
import {
  Signer,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import { Honeycomb, identityModule } from "@honeycomb-protocol/hive-control";
import {
  createCreateTreeInstruction,
  PROGRAM_ID as BUBBLEGUM_PROGRAM_ID,
  createMintToCollectionV1Instruction,
  TokenProgramVersion,
} from "@metaplex-foundation/mpl-bubblegum";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import {
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
  ValidDepthSizePair,
  getConcurrentMerkleTreeAccountSize,
} from "@solana/spl-account-compression";
import { SYSTEM_PROGRAM_ID } from "@raydium-io/raydium-sdk";
import { PROGRAM_ID as TOKEN_METADATA_PROGRAM_ID } from "@metaplex-foundation/mpl-token-metadata";
import colors from "colors";

dotenv.config();

const isDevnet = process.env.prod === "true" ? false : true;
const HELIUS_RPC_URL = isDevnet
  ? process.env.HELIUS_DEVNET_RPC_URL
  : process.env.HELIUS_RPC_URL;

export const prepare = async (airdropCount = 0) => {
  const RPC_URL = process.env.SOLANA_RPC || "https://api.devnet.solana.com";

  // const [signer, found] = [web3.Keypair.generate(), false];
  const [signer, found] = [tryKeyOrGenerate()[0], true];
  const connection = new web3.Connection(RPC_URL, "processed");
  const honeycomb = new Honeycomb(connection);
  honeycomb.use(identityModule(signer));

  if (!found || airdropCount) {
    await airdrop(signer.publicKey, airdropCount || 1);
  }
  return honeycomb;
};

export function tryKeyOrGenerate(
  keyPath = "../key.json"
): [web3.Keypair, boolean] {
  try {
    return [
      web3.Keypair.fromSecretKey(
        Uint8Array.from(
          JSON.parse(fs.readFileSync(path.resolve(__dirname, keyPath), "utf8"))
        )
      ),
      true,
    ];
  } catch (e) {
    return [web3.Keypair.generate(), false];
  }
}

export function wait(seconds = 2): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, seconds * 1000);
  });
}

async function airdrop(
  address: web3.PublicKey,
  quantitiy = 1,
  eachSize = 2,
  connection: web3.Connection = new web3.Connection(
    "https://api.devnet.solana.com"
  )
): Promise<void> {
  for (let i = 0; i < quantitiy; i++) {
    // console.log(`Airdrop-${i + 1}: started`);
    await connection
      .requestAirdrop(address, 1e9 * eachSize)
      .then(() => {
        // console.log(`Airdrop-${i + 1}: completed`);
      })
      .catch((e) => {
        console.log(`Airdrop-${i + 1}: failed`);
        const [from] = tryKeyOrGenerate();
        // Add transfer instruction to transaction
        var transaction = new web3.Transaction().add(
          web3.SystemProgram.transfer({
            fromPubkey: from.publicKey,
            toPubkey: address,
            lamports: web3.LAMPORTS_PER_SOL * 1.5,
          })
        );
        // Sign transaction, broadcast, and confirm
        return web3.sendAndConfirmTransaction(connection, transaction, [from]);
      });
    // console.log(`Airdrop-${i + 1}: waiting...`);
    if (quantitiy > 1) await wait();
  }
}

export async function createTree(treeKeypair: Keypair) {
  const keypair = loadWalletKey("Key.json");
  const rpc =
    process.env.prod === "true"
      ? "https://rpc.hellomoon.io/b55ac723-2036-4a39-b49f-645107268a73"
      : "https://api.devnet.solana.com/";
  const connection = new Connection(rpc);
  const merkleTree = treeKeypair;

  const [treeAuthority, _bump] = PublicKey.findProgramAddressSync(
    [merkleTree.publicKey.toBuffer()],
    BUBBLEGUM_PROGRAM_ID
  );

  const depthSizePair: ValidDepthSizePair = {
    maxDepth: 14,
    maxBufferSize: 64,
  };
  const space = getConcurrentMerkleTreeAccountSize(
    depthSizePair.maxDepth,
    depthSizePair.maxBufferSize
  );

  const createAccountIx = await SystemProgram.createAccount({
    newAccountPubkey: merkleTree.publicKey,
    fromPubkey: keypair.publicKey,
    space: space,
    lamports: await connection.getMinimumBalanceForRentExemption(space),
    programId: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  });

  const createTreeIx = await createCreateTreeInstruction(
    {
      merkleTree: merkleTree.publicKey,
      treeAuthority: treeAuthority,
      payer: keypair.publicKey,
      treeCreator: keypair.publicKey,
      compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      logWrapper: SPL_NOOP_PROGRAM_ID,
      systemProgram: SYSTEM_PROGRAM_ID,
    },
    {
      maxDepth: depthSizePair.maxDepth,
      maxBufferSize: depthSizePair.maxBufferSize,
      public: false,
    }
  );
  const { signature, latestBlockhash } = await sendVersionedTx(
    connection,
    [createAccountIx, createTreeIx],
    keypair.publicKey,
    [keypair, merkleTree]
  );
  console.log(
    `Tree created with signature: ${signature} and blockhash: ${latestBlockhash.blockhash}`
  );
  return signature;
}

export async function mintOneCNFT({
  dropWalletKey,
  NftName,
  NftSymbol,
  metaDataUri,
  tree,
  collection,
}: {
  dropWalletKey: string;
  NftName: string;
  NftSymbol: string;
  metaDataUri: string;
  tree: Keypair;
  collection: string | PublicKey;
}) {
  try {
    console.log(colors.yellow(`Minting CNFT ${NftName} for ${dropWalletKey}`));
    const keypair = loadWalletKey("key.json");
    const rpc =
      process.env.prod === "true"
        ? "https://rpc.hellomoon.io/b55ac723-2036-4a39-b49f-645107268a73"
        : "https://api.devnet.solana.com/";
    const connection = new Connection(rpc);
    const merkleTree = tree.publicKey;

    const [treeAuthority, _bump] = PublicKey.findProgramAddressSync(
      [merkleTree.toBuffer()],
      BUBBLEGUM_PROGRAM_ID
    );

    const collectionMint = new PublicKey(collection);
    const [collectionMetadataAccount, _b1] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata", "utf8"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        collectionMint.toBuffer(),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [collectionEditionAccount, _b2] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("metadata", "utf8"),
        TOKEN_METADATA_PROGRAM_ID.toBuffer(),
        collectionMint.toBuffer(),
        Buffer.from("edition", "utf8"),
      ],
      TOKEN_METADATA_PROGRAM_ID
    );
    const [bgumSigner, __] = PublicKey.findProgramAddressSync(
      [Buffer.from("collection_cpi", "utf8")],
      BUBBLEGUM_PROGRAM_ID
    );
    const ix = await createMintToCollectionV1Instruction(
      {
        treeAuthority: treeAuthority,
        // leafOwner: keypair.publicKey,
        // leafDelegate: keypair.publicKey,
        leafOwner: new PublicKey(dropWalletKey),
        leafDelegate: new PublicKey(dropWalletKey),
        merkleTree: merkleTree,
        payer: keypair.publicKey,
        treeDelegate: keypair.publicKey,
        logWrapper: SPL_NOOP_PROGRAM_ID,
        compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
        collectionAuthority: keypair.publicKey,
        collectionAuthorityRecordPda: BUBBLEGUM_PROGRAM_ID,
        collectionMint: collectionMint,
        collectionMetadata: collectionMetadataAccount,
        editionAccount: collectionEditionAccount,
        bubblegumSigner: bgumSigner,
        tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
      },
      {
        metadataArgs: {
          collection: { key: collectionMint, verified: false },
          creators: [
            {
              address: new PublicKey(
                "4gETqgEwFLkXX9yk6qBszA6LMjC2kRyyERXsAr2rwhwf"
              ),
              verified: false,
              share: 100,
            },
          ],
          isMutable: true,
          name: NftName,
          primarySaleHappened: true,
          sellerFeeBasisPoints: 500,
          symbol: NftSymbol,
          uri: metaDataUri,
          uses: null,
          tokenStandard: null,
          editionNonce: null,
          tokenProgramVersion: TokenProgramVersion.Original,
        },
      }
    );

    const { signature } = await sendAndConfirmTransaction(
      connection,
      [ix],
      keypair.publicKey,
      [keypair]
    );
    console.log(
      colors.green(
        `Successfully Minted CNFT ${NftName} for ${dropWalletKey}, Tx: ${signature}`
      )
    );
    return {
      txHash: signature,
      wallet: dropWalletKey,
      NftName: NftName,
      error: false,
      message: "Success",
    };
  } catch (e) {
    console.log(
      colors.red(`Minting CNFT ${NftName} for ${dropWalletKey} Failed: `),
      e
    );
    return {
      txHash: null,
      wallet: dropWalletKey,
      NftName: NftName,
      error: true,
      message: "error" + e,
    };
  }
}

// mintOneCNFT({
//   dropWalletKey: "CNFTDFRQB8udixzRzrZX5nBnjJ5hJWuMv1Xp1RwQjU4E",
//   NftName: "Grain",
//   NftSymbol: "Grain",
//   metaDataUri: "https://arweave.net/3JGimR30l6moM-HwE7Dt9dgZr5MYZJPvfSn9QDlrjqo",
// });

export function loadWalletKey(keypairFile: string): Keypair {
  const fs = require("fs");
  return Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(fs.readFileSync(keypairFile).toString()))
  );
}

export async function sendVersionedTx(
  connection: Connection,
  instructions: TransactionInstruction[],
  payer: PublicKey,
  signers: Signer[]
) {
  let latestBlockhash = await connection.getLatestBlockhash();
  const messageLegacy = new TransactionMessage({
    payerKey: payer,
    recentBlockhash: latestBlockhash.blockhash,
    instructions,
  }).compileToLegacyMessage();
  const transation = new VersionedTransaction(messageLegacy);
  transation.sign(signers);
  const signature = await connection.sendTransaction(transation);
  return { signature, latestBlockhash };
}

export async function sendAndConfirmTransaction(
  connection: Connection,
  instructions: TransactionInstruction[],
  payer: PublicKey,
  signers: Signer[]
) {
  const latestBlockhash = await connection.getLatestBlockhash();
  const transation = new Transaction().add(...instructions);
  transation.recentBlockhash = latestBlockhash.blockhash;
  transation.feePayer = payer;
  transation.sign(...signers);
  const signature = await connection.sendRawTransaction(transation.serialize());
  await connection.confirmTransaction(
    {
      signature,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      blockhash: latestBlockhash.blockhash,
    },
    "processed"
  );
  return { signature, latestBlockhash };
}

export const fetchNftAssets = async (
  wallet: web3.PublicKey,
  options: {
    collectionId: web3.PublicKey;
    isCompressed?: boolean;
  }
) => {
  let page: number | boolean = 1;
  let assetList: any = [];
  while (page) {
    const response = await fetch(HELIUS_RPC_URL as string, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: Math.random().toString(36).substring(7),
        method: "searchAssets",
        params: {
          ownerAddress: wallet.toString(),
          grouping: ["collection", options.collectionId.toString()],
          compressed: options.isCompressed || false,
          page: page,
          limit: 1000,
        },
      }),
    });
    const { result } = await response.json();

    assetList.push(...result.items);
    if (result.total !== 1000) {
      page = false;
    } else {
      page++;
    }
  }
  const resultData = {
    totalResults: assetList.length,
    results: assetList,
  };
  return resultData.results;
};

export const getAssetProof = async (nftMint: web3.PublicKey) => {
  const response = await fetch(HELIUS_RPC_URL as string, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: "my-id",
      method: "getAssetProof",
      params: {
        id: nftMint.toString(),
      },
    }),
  });
  const { result } = await response.json();
  console.log("Assets Proof: ", result);
};
