import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import * as web3 from "@solana/web3.js";
import { Honeycomb, identityModule } from "@honeycomb-protocol/hive-control";

dotenv.config();

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

function tryKeyOrGenerate(keyPath = "../key.json"): [web3.Keypair, boolean] {
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
