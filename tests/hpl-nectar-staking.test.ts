import * as web3 from "@solana/web3.js";
import { Metaplex, keypairIdentity } from "@metaplex-foundation/js";
import { TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import {
  Honeycomb,
  HoneycombProject,
  createLookupTable,
  getOrFetchLoockupTable,
  lutModule,
} from "@honeycomb-protocol/hive-control";
import {
  PermissionedCurrencyKind,
  HplCurrency,
  findProjectCurrencies,
} from "@honeycomb-protocol/currency-manager";
import {
  LockType,
  NectarStaking,
  findProjectStakingPools,
} from "../packages/hpl-nectar-staking";
import getHoneycombs from "../scripts/prepare";
import { createNewTree, mintOneCNFT } from "./helpers";
import {
  HplCharacter,
  HplCharacterModel,
  createCreateNewCharactersTreeOperation,
  createNewCharacterModelOperation,
  createWrapAssetOperation,
  fetchHeliusAssets,
} from "@honeycomb-protocol/character-manager";

jest.setTimeout(2000000);

const wait = (seconds: number) =>
  new Promise((resolve) => setTimeout(resolve, seconds * 1000));

export function bytesOf(input: any): number {
  if (Array.isArray(input)) {
    return input.reduce((acc, curr) => acc + bytesOf(curr), 0);
  }

  switch (typeof input) {
    case "boolean":
      return 4;
    case "number":
      return 8;
    case "string":
      return 2 * input.length;
    case "object":
      return Object.entries(input).reduce(
        (total, [key, item]): number => total + bytesOf(key) + bytesOf(item),
        0
      );
    default:
      return 0;
  }
}

describe("Nectar Staking", () => {
  const totalNfts = 1;
  const totalcNfts = 0;

  let adminHC: Honeycomb;
  let userHC: Honeycomb;
  let metaplex: Metaplex;
  let collection: web3.PublicKey;
  let merkleTree: web3.PublicKey;
  let universalLut: web3.AddressLookupTableAccount;
  let characterModel: HplCharacterModel;
  let character: HplCharacter;

  it("Prepare", async () => {
    const temp = getHoneycombs();

    adminHC = temp.adminHC;
    userHC = temp.userHC;

    console.log(
      "Admin",
      adminHC.identity().address.toString(),
      "User",
      userHC.identity().address.toString()
    );

    // Set up Metaplex to mint some NFTs for testing
    metaplex = new Metaplex(adminHC.connection);
    metaplex.use(keypairIdentity(temp.admin));

    adminHC.use(
      lutModule(async (accounts) => {
        const lookupTable = await createLookupTable(userHC, accounts);
        if (!lookupTable) throw new Error("Lookuptale noinsfoiasdoiahjsod");
        console.log("Lookup Table", lookupTable.key.toString());
        return lookupTable;
      })
    );

    userHC.use(
      lutModule(async (accounts) => {
        throw new Error("Should not be called");
      })
    );
  });

  it("Setup", async () => {
    // Mint Collection
    if (!collection) {
      collection = await metaplex
        .nfts()
        .create({
          name: "Collection",
          symbol: "COL",
          sellerFeeBasisPoints: 0,
          uri: "https://api.eboy.dev/",
          isCollection: true,
          collectionIsSized: true,
        })
        .then((x) => x.nft.mint.address);
    }

    // Mint Nfts
    for (let i = 1; i <= totalNfts; i++) {
      await metaplex
        .nfts()
        .create({
          name: `NFT #${i}`,
          symbol: `NFT`,
          sellerFeeBasisPoints: 100,
          uri: "https://arweave.net/WhyRt90kgI7f0EG9GPfB8TIBTIBgX3X12QaF9ObFerE",
          collection,
          collectionAuthority: metaplex.identity(),
          tokenStandard: TokenStandard.NonFungible,
          tokenOwner: userHC.identity().address,
        })
        .then((x) => x.nft);
    }

    let treeKeypair: web3.Keypair = web3.Keypair.generate();
    // Mint cNFTs
    for (let i = 1; i <= totalcNfts; i++) {
      if (i === 1) {
        treeKeypair = (await createNewTree(adminHC))[0];
        merkleTree = treeKeypair.publicKey;
      }

      await mintOneCNFT(adminHC, {
        dropWalletKey: userHC.identity().address.toString(),
        name: `cNFT #${i}`,
        symbol: "cNFT",
        uri: "https://arweave.net/WhyRt90kgI7f0EG9GPfB8TIBTIBgX3X12QaF9ObFerE",
        tree: treeKeypair,
        collection,
      });
    }

    // Create Project
    adminHC.use(
      await HoneycombProject.new(adminHC, {
        name: "Project",
        expectedMintAddresses: 0,
        profileDataConfigs: [],
        collections: collection ? [collection] : [],
        merkleTrees: merkleTree ? [merkleTree] : [],
      })
    );
    expect(adminHC.project().name).toBe("Project");

    // Create Character model
    const {
      operation: characterModelOperation,
      characterModel: characterModelAddress,
    } = await createNewCharacterModelOperation(adminHC, {
      args: {
        config: {
          __kind: "Wrapped",
          fields: [
            [
              {
                __kind: "Collection",
                fields: [collection],
              },
              ...(merkleTree
                ? [
                    {
                      __kind: "MerkleTree" as "MerkleTree",
                      fields: [merkleTree] as [web3.PublicKey],
                    },
                  ]
                : []),
            ],
          ],
        },
        attributes: {
          __kind: "Null",
        },
      },
      project: adminHC.project().address,
    });
    await characterModelOperation.send();

    // Create Characters tree
    await (
      await createCreateNewCharactersTreeOperation(adminHC, {
        project: adminHC.project().address,
        characterModel: characterModelAddress,
        depthSizePair: {
          maxDepth: 3,
          maxBufferSize: 8,
        },
      })
    ).operation.send();

    characterModel = await HplCharacterModel.fromAddress(
      adminHC.connection,
      characterModelAddress,
      "processed"
    );

    // Create Currency
    adminHC.use(
      await HplCurrency.new(adminHC, {
        name: "BAIL",
        symbol: "BAIL",
        kind: PermissionedCurrencyKind.NonCustodial,
        decimals: 9,
        uri: "https://arweave.net/1VxSzPEOwYlTo3lU5XSQWj-9Ldt3dB68cynDDjzeF-c",
      })
    );

    await adminHC
      .currency()
      .newHolderAccount(userHC.identity().address)
      .then((hA) => hA.mint(10_000 * 1_000_000_000));
  });

  it.skip("Load Project", async () => {
    // const address = new web3.PublicKey(
    //   "GWZwbVCxjzkLgnqtvAGV2LNB26g4XJhNotCDhSrS893C"
    // );
    const address = new web3.PublicKey(
      "6nb9735fAnr9Aa3y2wWGf7j9AJjtQq7JfGVHAKd4K8uz"
    );
    adminHC.use(await HoneycombProject.fromAddress(adminHC, address));
    await findProjectCurrencies(adminHC.project());

    // universalLut = (await getOrFetchLoockupTable(
    //   userHC.connection,
    //   new web3.PublicKey("3DZqC35xcK9Yaww63Tn1Qsmkd4Wkn7eGWaMPhf7ChKXb")
    // ))!;

    universalLut = (await getOrFetchLoockupTable(
      userHC.connection,
      new web3.PublicKey("7W3Z84qEKgFSfgKNWPK5nWNV8jAfbszECcrYCWUwsD9L")
    ))!;

    console.log(
      "Project",
      adminHC.project().address.toString(),
      "Currency",
      adminHC.currency().address.toString()
    );
  });

  it("Load/Create Staking Pool", async () => {
    await findProjectStakingPools(adminHC.project());

    if (!adminHC.staking) {
      // Create staking pool
      adminHC.use(
        await NectarStaking.new(adminHC, {
          args: {
            name: "Staking3.0",
            rewardsPerDuration: 1 * 1_000_000_000,
            rewardsDuration: 1,
            maxRewardsDuration: null,
            minStakeDuration: null,
            cooldownDuration: null,
            resetStakeDuration: false,
            startTime: Date.now(),
            endTime: null,
            lockType: LockType.Freeze,
          },
          project: adminHC.project().address,
          currency: adminHC.currency().address,
          collections: [collection],
          merkleTrees: [merkleTree],
          multipliersDecimals: 3,
          multipliers: [
            {
              multiplierType: {
                __kind: "NFTCount",
                minCount: 3,
              },
              value: 1400,
            },
            {
              multiplierType: {
                __kind: "NFTCount",
                minCount: 5,
              },
              value: 1800,
            },
          ],
        })
      );
    }

    (adminHC.staking() as unknown as NectarStaking).helius_rpc =
      "https://devnet.helius-rpc.com/?api-key=b5676a53-d02f-4c59-9b5d-91bcdd9f4f54";

    console.log("Staking", adminHC.staking().address.toString());
  });

  it("Fetch for user", async () => {
    userHC.use(
      await HoneycombProject.fromAddress(userHC, adminHC.project().address)
    );
    await findProjectCurrencies(userHC.project());
    await findProjectStakingPools(userHC.project());

    // const temp = await userHC
    //   .lut()
    //   .getOrFetch(
    //     userHC.processedConnection,
    //     new web3.PublicKey("86HuZxzdh1ErDpjTBsnyyg76rwusNDquNjDGPRT3Uuau")
    //   );
    // if (temp) universalLut = temp;

    // Wrap asset to character
    const nfts = await fetchHeliusAssets(userHC.rpcEndpoint, {
      walletAddress: userHC.identity().address,
      collectionAddress: collection,
    }).then((nfts) => nfts.filter((n) => !n.frozen && !n.isCompressed));

    if (!nfts.length) throw new Error("No Nfts to wrap");

    (
      await createWrapAssetOperation(userHC, {
        asset: nfts[0],
        characterModel,
      })
    ).operation.send();

    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Fetch character for user
    character = (
      await HplCharacter.fetchWithWallet(
        userHC.rpcEndpoint,
        userHC.identity().address
      )
    ).at(-1)!;
  });

  it("Stake Character", async () => {
    const staking = userHC.staking() as unknown as NectarStaking;
    await staking.stake(characterModel, [character]);
  });

  it("Unstake Character", async () => {
    const staking = userHC.staking() as unknown as NectarStaking;
    await staking.unstake(characterModel, [character]);
  });
});
