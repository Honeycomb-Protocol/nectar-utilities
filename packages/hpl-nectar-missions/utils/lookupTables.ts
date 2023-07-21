import { Honeycomb } from "@honeycomb-protocol/hive-control";
import * as web3 from "@solana/web3.js";
export const METADATA_PROGRAM_ID = new web3.PublicKey(
  "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s"
);

export const createV0Tx = (
  payerKey: web3.PublicKey,
  latestBlockhash: string,
  ...txInstructions: web3.TransactionInstruction[]
) => {
  return new web3.VersionedTransaction(
    new web3.TransactionMessage({
      payerKey,
      recentBlockhash: latestBlockhash,
      instructions: txInstructions,
    }).compileToV0Message()
  );
};
export const createV0TxWithLUTDumb = ({
  lookupTable,
  ...msgArgs
}: {
  payerKey: web3.PublicKey;
  lookupTable: web3.AddressLookupTableAccount;
  instructions: web3.TransactionInstruction[];
  recentBlockhash: web3.Blockhash;
}) => {
  return new web3.VersionedTransaction(
    new web3.TransactionMessage(msgArgs).compileToV0Message([lookupTable])
  );
};
export const createV0TxWithLUT = async (
  connection: web3.Connection,
  payerKey: web3.PublicKey,
  lookupTableAddress: web3.PublicKey | web3.AddressLookupTableAccount,
  txInstructions: web3.TransactionInstruction[],
  latestBlockhash?: web3.BlockhashWithExpiryBlockHeight
) => {
  if (!latestBlockhash) latestBlockhash = await connection.getLatestBlockhash();
  const lookupTable = await getOrFetchLoockupTable(
    connection,
    lookupTableAddress
  );
  if (!lookupTable) throw new Error("Lookup table not found");
  return createV0TxWithLUTDumb({
    payerKey,
    recentBlockhash: latestBlockhash.blockhash,
    instructions: txInstructions,
    lookupTable,
  });
};
export const getOrFetchLoockupTable = async (
  connection: web3.Connection,
  lookupTableAddress: web3.PublicKey | web3.AddressLookupTableAccount
): Promise<web3.AddressLookupTableAccount | null> => {
  return "state" in lookupTableAddress
    ? lookupTableAddress
    : (
        await connection.getAddressLookupTable(lookupTableAddress, {
          commitment: "processed",
        })
      ).value;
};
export const makeFakeLookupTable = async (
  connection: web3.Connection,
  lookupTableAddress: web3.PublicKey | web3.AddressLookupTableAccount,
  addresses: web3.PublicKey[]
): Promise<web3.AddressLookupTableAccount | null> => {
  const lookupTable = await getOrFetchLoockupTable(
    connection,
    lookupTableAddress
  );
  if (lookupTable && lookupTable.state?.addresses?.length != addresses.length) {
    lookupTable.state.addresses = addresses;
  }
  return lookupTable;
};
export const createLookupTable = async (
  honeycomb: Honeycomb,
  addresses: web3.PublicKey[]
) => {
  if (
    !honeycomb.identity().address ||
    !honeycomb.identity().signAllTransactions
  )
    return;
  const [lookupTableIx, lookupTableAddress] =
    web3.AddressLookupTableProgram.createLookupTable({
      authority: honeycomb.identity().address,
      payer: honeycomb.identity().address,
      recentSlot: await honeycomb.connection.getSlot(),
    });
  const latestBlockhash = await honeycomb.connection.getLatestBlockhash();
  let creationTx = createV0Tx(
    honeycomb.identity().address,
    latestBlockhash.blockhash,
    lookupTableIx
  );
  let transactions: web3.VersionedTransaction[] = [];
  const batchSize = 30;
  for (let i = 0; i < addresses.length; i += batchSize) {
    transactions.push(
      createV0Tx(
        honeycomb.identity().address,
        latestBlockhash.blockhash,
        web3.AddressLookupTableProgram.extendLookupTable({
          payer: honeycomb.identity().address,
          authority: honeycomb.identity().address,
          lookupTable: lookupTableAddress,
          addresses: addresses.slice(i, i + batchSize),
        })
      )
    );
  }
  [creationTx, ...transactions] = await honeycomb
    .identity()
    .signAllTransactions([creationTx, ...transactions]);
  const createTxSignature = await honeycomb.connection.sendTransaction(
    creationTx,
    {
      skipPreflight: true,
    }
  );
  const createTxConfirmation = await honeycomb.connection.confirmTransaction(
    createTxSignature,
    "confirmed"
  );
  if (createTxConfirmation.value.err) {
    throw new Error(
      "Lookup table creation error " + createTxConfirmation.value.err.toString()
    );
  }
  for (let index = 0; index < transactions.length; index++) {
    const transaction = transactions[index];
    const signature = await honeycomb.connection.sendTransaction(
      // @ts-ignore
      transaction,
      {
        // @ts-ignore
        skipPreflight: true,
      },
      {
        skipPreflight: true,
      }
    );
    await honeycomb.connection.confirmTransaction(
      signature,
      index == transactions.length - 1 ? "confirmed" : "processed"
    );
  }
  return makeFakeLookupTable(
    honeycomb.connection,
    lookupTableAddress,
    addresses
  );
};
