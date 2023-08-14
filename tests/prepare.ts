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
import {
  Honeycomb,
  Operation,
  identityModule,
} from "@honeycomb-protocol/hive-control";
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

export async function createNewTree(honeycomb: Honeycomb) {
  const merkleTree = Keypair.generate();

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

  const operation = new Operation(
    honeycomb,
    [
      SystemProgram.createAccount({
        newAccountPubkey: merkleTree.publicKey,
        fromPubkey: honeycomb.identity().address,
        space: space,
        lamports: await honeycomb.connection.getMinimumBalanceForRentExemption(
          space
        ),
        programId: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
      }),
      new Transaction().add(
        createCreateTreeInstruction(
          {
            merkleTree: merkleTree.publicKey,
            treeAuthority: treeAuthority,
            payer: honeycomb.identity().address,
            treeCreator: honeycomb.identity().address,
            compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
            logWrapper: SPL_NOOP_PROGRAM_ID,
            systemProgram: SYSTEM_PROGRAM_ID,
          },
          {
            maxDepth: depthSizePair.maxDepth,
            maxBufferSize: depthSizePair.maxBufferSize,
            public: false,
          }
        )
      ),
    ],
    [merkleTree]
  );

  const { signature, blockhashWithBlockHeight: latestBlockhash } =
    await operation.send();

  console.log(
    `Tree created with signature: ${signature} and blockhash: ${latestBlockhash.blockhash}`
  );
  return [merkleTree, signature] as [Keypair, string];
}

export async function mintOneCNFT(
  honeycomb: Honeycomb,
  {
    dropWalletKey,
    name,
    symbol,
    uri,
    tree,
    collection,
  }: {
    dropWalletKey: string;
    name: string;
    symbol: string;
    uri: string;
    tree: Keypair;
    collection: string | PublicKey;
  }
) {
  try {
    console.log(colors.yellow(`Minting CNFT ${name} for ${dropWalletKey}`));
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

    const operation = new Operation(honeycomb, [
      new Transaction().add(
        createMintToCollectionV1Instruction(
          {
            treeAuthority: treeAuthority,
            // leafOwner: honeycomb.identity().address,
            // leafDelegate: honeycomb.identity().address,
            leafOwner: new PublicKey(dropWalletKey),
            leafDelegate: new PublicKey(dropWalletKey),
            merkleTree: merkleTree,
            payer: honeycomb.identity().address,
            treeDelegate: honeycomb.identity().address,
            logWrapper: SPL_NOOP_PROGRAM_ID,
            compressionProgram: SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
            collectionAuthority: honeycomb.identity().address,
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
                  address: honeycomb.identity().address,
                  verified: false,
                  share: 100,
                },
              ],
              isMutable: true,
              name,
              primarySaleHappened: true,
              sellerFeeBasisPoints: 500,
              symbol,
              uri,
              uses: null,
              tokenStandard: null,
              editionNonce: null,
              tokenProgramVersion: TokenProgramVersion.Original,
            },
          }
        )
      ),
    ]);

    const { signature } = await operation.send();

    console.log(
      colors.green(
        `Successfully Minted CNFT ${name} for ${dropWalletKey}, Tx: ${signature}`
      )
    );
    return {
      txHash: signature,
      wallet: dropWalletKey,
      name,
      error: false,
      message: "Success",
    };
  } catch (e) {
    console.log(
      colors.red(`Minting CNFT ${name} for ${dropWalletKey} Failed: `),
      e
    );
    throw new Error(e);
    // return {
    //   txHash: null,
    //   wallet: dropWalletKey,
    //   name,
    //   error: true,
    //   message: "error" + e,
    // };
  }
}

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

export const getAssetProof = async (assetId: web3.PublicKey) => {
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
        id: assetId.toString(),
      },
    }),
  });
  const { result } = await response.json();
  console.log("Assets Proof: ", result);
};
