import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import * as web3 from "@solana/web3.js";
import { Honeycomb, identityModule } from "@honeycomb-protocol/hive-control";

dotenv.config();

export default function () {
  // const RPC_URL = process.env.SOLANA_RPC || "https://api.devnet.solana.com";
  const RPC_URL = "http://localhost:9091";
  const connection = new web3.Connection(RPC_URL, "processed");

  const adminHC = new Honeycomb(connection);
  const admin = web3.Keypair.fromSecretKey(
    Uint8Array.from(
      JSON.parse(
        fs.readFileSync(
          path.resolve(__dirname, "..", "keys", "admin.json"),
          "utf8"
        )
      )
    )
  );
  adminHC.use(identityModule(admin));

  const driverHC = new Honeycomb(connection);
  const driver = web3.Keypair.fromSecretKey(
    Uint8Array.from(
      JSON.parse(
        fs.readFileSync(
          path.resolve(__dirname, "..", "keys", "driver.json"),
          "utf8"
        )
      )
    )
  );
  driverHC.use(identityModule(driver));

  const delegateHC = new Honeycomb(connection);
  const delegate = web3.Keypair.fromSecretKey(
    Uint8Array.from(
      JSON.parse(
        fs.readFileSync(
          path.resolve(__dirname, "..", "keys", "delegate.json"),
          "utf8"
        )
      )
    )
  );
  delegateHC.use(identityModule(delegate));

  const userHC = new Honeycomb(connection);
  const user = web3.Keypair.fromSecretKey(
    Uint8Array.from(
      JSON.parse(
        fs.readFileSync(
          path.resolve(__dirname, "..", "keys", "user.json"),
          "utf8"
        )
      )
    )
  );
  userHC.use(identityModule(user));

  return {
    admin,
    adminHC,
    driver,
    driverHC,
    delegate,
    delegateHC,
    user,
    userHC,
  };
}
