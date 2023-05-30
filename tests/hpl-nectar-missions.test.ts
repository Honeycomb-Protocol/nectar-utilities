import * as web3 from "@solana/web3.js";
import { Metaplex, Nft, walletAdapterIdentity } from "@metaplex-foundation/js";
import { TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import { Honeycomb, HoneycombProject } from "@honeycomb-protocol/hive-control";
import {
  PermissionedCurrencyKind,
  HplCurrency,
  findProjectCurrencies,
} from "@honeycomb-protocol/currency-manager";
import {
  MerkleTree,
  NectarMissions,
  nectarMissionsModule,
} from "../packages/hpl-nectar-missions";
import {
  LockType,
  NectarStaking,
  nectarStakingModule,
} from "../packages/hpl-nectar-staking";
import { prepare } from "./prepare";
jest.setTimeout(2000000);

describe("Nectar Missions", () => {
  const totalNfts = 10;

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

  it("Temp", async () => {
    honeycomb.use(
      await HoneycombProject.fromAddress(
        honeycomb.connection,
        new web3.PublicKey("bUUfXFjcF6Q1CBa5B6rnQzN4GLkViE4xmrGTsrrqpBs")
      )
    );
    await findProjectCurrencies(honeycomb.project());

    honeycomb.use(
      await nectarStakingModule(
        honeycomb,
        new web3.PublicKey("JBSv75CezWt5fYWgSnUJaQ1tDR18tGcW9eAhENXXZ8oV")
      )
    );
    honeycomb.use(
      await nectarMissionsModule(
        honeycomb,
        new web3.PublicKey("GHc2QoYyBJWXDFGo3TMggaD2hmV4FfP9MweuQ9GXc5pA")
      )
    );

    await honeycomb
      .missions()
      .fetch()
      .participations()
      .then(console.log)
      .catch(console.error);
  });

  it.skip("Setup Collection, Project, InGameCurrency, StakingPool and MissionPool", async () => {
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

    console.log(
      "FactionsTree",
      factionsArray.map((x) => ({ ...x, mint: x.mint.toString() }))
    );

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
    console.log("Project", honeycomb.project().address.toString());

    await honeycomb.project().addCriteria({
      collection: collection.mint.address,
    });
    expect(honeycomb.project().collections.length).toBe(1);
    expect(honeycomb.project().collections[0].toString()).toBe(
      collection.mint.address.toString()
    );

    console.log("Collection", collection.mint.address.toString());

    // Create InGameCurrency
    honeycomb.use(
      await HplCurrency.new(honeycomb, {
        name: "COIN",
        symbol: "CTC",
        kind: PermissionedCurrencyKind.NonCustodial,
        decimals: 9,
        uri: "https://arweave.net/QPC6FYdUn-3V8ytFNuoCS85S2tHAuiDblh6u3CIZLsw",
      })
    );
    const holderAccount = await honeycomb.currency().create().holderAccount();
    await holderAccount.mint(100_000_000_000);

    console.log("Currency", honeycomb.currency().address.toString());

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
        currency: honeycomb.currency().address,
        collections: [collection.mint.address],
        multipliersDecimals: 3,
      })
    );
    console.log("Staking", honeycomb.staking().address.toString());

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
    console.log("Missions", honeycomb.missions().address.toString());
  });

  it.skip("Create Mission", async () => {
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

  it.skip("Stake and participate while checking randomizer", async () => {
    const nfts = await honeycomb.staking().fetch().availableNfts();
    await honeycomb.staking().stake(...nfts);
    const stakedNfts = await honeycomb.staking().fetch().stakedNfts();
    const mission = await honeycomb.missions().mission("QuickPost");

    await mission.participate(
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
  });

  it.skip("Recall and unstake", async () => {
    const stakedNfts = await honeycomb.staking().fetch().stakedNfts();
    const participations = await honeycomb.missions().fetch().participations();

    expect(participations.length).toBe(totalNfts);
    expect(participations[0].rewards[0].amount).not.toBe(
      participations[1].rewards[0].amount
    );

    const mission = await honeycomb.missions().mission("QuickPost");
    await mission.recall(...participations);
    await honeycomb.staking().unstake(...stakedNfts);
  });
});
