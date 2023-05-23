import * as web3 from "@solana/web3.js";
import { Metaplex, Nft, walletAdapterIdentity } from "@metaplex-foundation/js";
import { TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import { Honeycomb, HoneycombProject } from "@honeycomb-protocol/hive-control";
import {
  CurrencyType,
  HplCurrency,
} from "@honeycomb-protocol/currency-manager";
import { MerkleTree, NectarMissions } from "../packages/hpl-nectar-missions";
import { LockType, NectarStaking } from "../packages/hpl-nectar-staking";
import { prepare } from "./prepare";
jest.setTimeout(200000);

describe("Nectar Missions", () => {
  const totalNfts = 2;

  let honeycomb: Honeycomb;
  let metaplex: Metaplex;
  let collection: Nft;
  let nfts: Nft[] = [];
  let factionsArray: { faction: string; mint: web3.PublicKey }[] = [];
  let factionsMerkleTree: MerkleTree;

  it("Prepare", async () => {
    honeycomb = await prepare();
    metaplex = new Metaplex(honeycomb.connection);

    metaplex.use(walletAdapterIdentity(honeycomb.identity()));

    console.log(
      "address",
      honeycomb.identity().publicKey.toString(),
      honeycomb.connection.rpcEndpoint
    );
    const balance = await honeycomb
      .rpc()
      .getBalance(honeycomb.identity().publicKey);
    expect(balance).toBeGreaterThanOrEqual(web3.LAMPORTS_PER_SOL * 0.1);
  });

  it("Setup Collection, Project, InGameCurrency, StakingPool and MissionPool", async () => {
    let out = await metaplex.nfts().create({
      name: "Collection",
      symbol: "COL",
      sellerFeeBasisPoints: 0,
      uri: "https://api.eboy.dev/",
      isCollection: true,
      collectionIsSized: true,
    });
    collection = out.nft;

    for (let i = 1; i <= totalNfts; i++) {
      out = await metaplex.nfts().create({
        name: `NFT #${i}`,
        symbol: `TEMP`,
        sellerFeeBasisPoints: 100,
        uri: "https://arweave.net/HVD1kBCxlvkOMI17QwkFVXpDjtBjOfXa9aLmiFuxJ4w",
        collection: collection.mint.address,
        collectionAuthority: metaplex.identity(),
        tokenStandard: TokenStandard.NonFungible,
      });

      nfts.push(out.nft);
    }

    factionsArray = nfts.map((nft) => ({
      faction: "faction",
      mint: nft.mint.address,
    }));

    factionsMerkleTree = new MerkleTree(
      factionsArray.map((faction) =>
        Buffer.from([
          ...Buffer.from(faction.faction),
          ...faction.mint.toBuffer(),
        ])
      )
    );

    // Create project
    honeycomb.use(
      await HoneycombProject.new(honeycomb, {
        name: "TestProject",
        expectedMintAddresses: nfts.length,
        profileDataConfigs: [],
      })
    );
    expect(honeycomb.project().name).toBe("TestProject");

    await honeycomb.project().addCriteria({
      collection: collection.mint.address,
    });
    expect(honeycomb.project().collections.length).toBe(1);
    expect(honeycomb.project().collections[0].toString()).toBe(
      collection.mint.address.toString()
    );

    // Create InGameCurrency
    honeycomb.use(
      await HplCurrency.new(honeycomb, {
        name: "COIN",
        symbol: "CTC",
        currencyType: CurrencyType.NonCustodial,
        decimals: 9,
        uri: "https://arweave.net/QPC6FYdUn-3V8ytFNuoCS85S2tHAuiDblh6u3CIZLsw",
      })
    );
    const holderAccount = await honeycomb.currency().create().holderAccount();
    await holderAccount.mint(100_000_000_000);

    // Create staking pool
    honeycomb.use(
      await NectarStaking.new(honeycomb, {
        args: {
          name: "Test",
          rewardsPerDuration: 50 * 1000000000,
          rewardsDuration: 24 * 3600,
          maxRewardsDuration: null,
          minStakeDuration: null,
          cooldownDuration: null,
          resetStakeDuration: false,
          startTime: Date.now(),
          endTime: null,
          lockType: LockType.Freeze,
        },
        rewardMint: new web3.PublicKey(
          "DYMs37sUJz65KmYa31Wzj2TKcTe5M5rhvdkKgcKWiEAs"
        ),
        collections: [collection.mint.address],
        multipliersDecimals: 3,
      })
    );

    // Create Mision Pool
    honeycomb.use(
      await NectarMissions.new(honeycomb, {
        args: {
          name: "Test",
          factionsMerkleRoot: factionsMerkleTree.getRootArray(),
          collections: [collection.mint.address],
        },
      })
    );
  });

  it("Create Mission", async () => {
    await honeycomb
      .missions()
      .create()
      .mission({
        name: "QuickPost",
        cost: {
          address: honeycomb.currency().address,
          amount: 10,
        },
        duration: 1,
        minXp: 0,
        rewards: [
          {
            min: 100,
            max: 200,
            rewardType: {
              __kind: "Xp",
            },
          },
        ],
      });
  });

  it("Stake and participate while checking randomizer", async () => {
    const nfts = await honeycomb.staking().fetch().availableNfts();
    await honeycomb.staking().stake(...nfts);
    const stakedNfts = await honeycomb.staking().fetch().stakedNfts();
    await honeycomb
      .missions()
      .mission("QuickPost")
      .participate(
        ...stakedNfts.map((x) => ({
          ...x,
          serialize: x.serialize,
          pretty: x.pretty,
          faction: "faction",
          merkleProof: factionsMerkleTree.getProofArray(
            factionsArray.findIndex((y) => y.mint.equals(x.mint))
          ),
        }))
      );
    const participations = await honeycomb.missions().fetch().participations();

    expect(participations.length).toBe(2);
    expect(participations[0].rewards[0].amount).not.toBe(
      participations[1].rewards[0].amount
    );

    await honeycomb
      .missions()
      .mission("QuickPost")
      .recall(...participations);
  });
});
