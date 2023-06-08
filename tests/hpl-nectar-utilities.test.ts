import * as web3 from "@solana/web3.js";
import { Metaplex, Nft, keypairIdentity } from "@metaplex-foundation/js";
import { TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import { Honeycomb, HoneycombProject } from "@honeycomb-protocol/hive-control";
import {
  PermissionedCurrencyKind,
  HplCurrency,
  HplHolderAccount,
} from "@honeycomb-protocol/currency-manager";
import {
  LockType,
  NectarStaking,
  nectarStakingModule,
} from "../packages/hpl-nectar-staking";
import { prepare, tryKeyOrGenerate } from "./prepare";
import { MerkleTree, NectarMissions } from "../packages/hpl-nectar-missions";
jest.setTimeout(2000000);

describe("Nectar Utilities", () => {
  const totalNfts = 10;

  let honeycomb: Honeycomb;
  let metaplex: Metaplex;
  let collection: Nft;
  let nfts: Nft[] = [];
  let factionsArray: { faction: string; mint: web3.PublicKey }[] = [];
  let factionsMerkleTree: MerkleTree;
  let mainVault: HplHolderAccount;

  it.skip("Temp", async () => {
    const connection = new web3.Connection(
      "https://side-damp-bird.solana-mainnet.quiknode.pro/11449a3f0f4fd38ce2441a9ac133ab8111ad652d/"
    );
    const honeycomb = new Honeycomb(connection, { env: "main" }).use(
      await HoneycombProject.fromAddress(
        connection,
        new web3.PublicKey("7CKTHsJ3EZqChNf3XGt9ytdZXvSzDFWmrQJL3BCe4Ppw")
      )
    );
    honeycomb.use(
      await nectarStakingModule(
        honeycomb,
        new web3.PublicKey("8gKSkodEmGHxsnHsj7N1XWGBKD6yHw89awbkzLViGdub")
      )
    );

    const stakedNfts = await honeycomb
      .staking()
      .fetch()
      .stakedNfts(
        new web3.PublicKey("232Z5QNvQ4wRyraGWFpC5i3HEbqozEWgBCV95eWASaG1")
      );
    const [{ rewards, multipliers }] = await honeycomb
      .staking()
      .fetch()
      .rewards(stakedNfts);
    console.log("rewards", rewards, multipliers);
  });

  it("Prepare and Setup", async () => {
    honeycomb = await prepare();
    const balance = await honeycomb
      .rpc()
      .getBalance(honeycomb.identity().address);

    console.log(
      "address",
      honeycomb.identity().address.toString(),
      balance.toString(),
      honeycomb.connection.rpcEndpoint
    );

    expect(balance).toBeGreaterThanOrEqual(web3.LAMPORTS_PER_SOL * 0.1);

    metaplex = new Metaplex(honeycomb.connection);
    metaplex.use(keypairIdentity(tryKeyOrGenerate()[0]));

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
      factionsArray.map(({ faction, mint }) =>
        Buffer.from([...Buffer.from(faction), ...mint.toBuffer()])
      )
    );

    console.log(
      "FactionsTree",
      factionsArray.map((x) => ({ ...x, mint: x.mint.toString() }))
    );

    // Create Project
    honeycomb.use(
      await HoneycombProject.new(honeycomb, {
        name: "TestProject",
        expectedMintAddresses: nfts.length,
        profileDataConfigs: [
          {
            label: "nectar_missions_xp",
            dataType: {
              __kind: "SingleValue",
            },
          },
        ],
      })
    );
    await honeycomb.project().addCriteria({
      collection: collection.mint.address,
    });

    honeycomb.use(
      await HplCurrency.new(honeycomb, {
        name: "COIN",
        symbol: "CTC",
        kind: PermissionedCurrencyKind.NonCustodial,
        decimals: 9,
        uri: "https://arweave.net/QPC6FYdUn-3V8ytFNuoCS85S2tHAuiDblh6u3CIZLsw",
      })
    );
    mainVault = await honeycomb
      .currency()
      .create()
      .holderAccount(honeycomb.identity().address);
    await mainVault.mint(100_000 * 1_000_000_000);

    console.log("Project", honeycomb.project().address.toString());
  });

  it("Create Staking Pool", async () => {
    // Create staking pool
    honeycomb.use(
      await NectarStaking.new(honeycomb, {
        args: {
          name: "Staking3.0",
          rewardsPerDuration: 50 * 1_000_000_000,
          rewardsDuration: 60,
          maxRewardsDuration: 10,
          minStakeDuration: null,
          cooldownDuration: null,
          resetStakeDuration: false,
          startTime: Date.now(),
          endTime: null,
          lockType: LockType.Freeze,
        },
        project: honeycomb.project(),
        currency: honeycomb.currency(),
        collections: [collection.mint.address],
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

    // Fund Staking pool vault
    const stakingVault = await honeycomb
      .currency()
      .create()
      .holderAccount(honeycomb.staking().address);
    await mainVault.transfer(50_000 * 1_000_000_000, stakingVault);
    console.log(
      "Stakinng",
      honeycomb.staking().address.toString(),
      stakingVault.tokenAccount.toString()
    );
  });

  it("Create Mission Pool", async () => {
    honeycomb.use(
      await NectarMissions.new(honeycomb, {
        args: {
          name: "Missions2.0",
          factionsMerkleRoot: factionsMerkleTree.getRootArray(),
          collections: [collection.mint.address],
        },
      })
    );

    const missionsVault = await honeycomb
      .currency()
      .create()
      .holderAccount(honeycomb.missions().address);
    await mainVault.transfer(50_000 * 1_000_000_000, missionsVault);
    console.log(
      "Missions",
      honeycomb.missions().address.toString(),
      missionsVault.tokenAccount.toString()
    );
  });

  it("Create Mission", async () => {
    const currentCurrency = honeycomb.currency();

    honeycomb.use(
      await HplCurrency.new(honeycomb, {
        name: "Food",
        symbol: "FOOD",
        kind: PermissionedCurrencyKind.NonCustodial,
        decimals: 9,
        uri: "https://storage.googleapis.com/nft-assets/items/FOOD.png",
      })
    );
    const foodVault = await honeycomb
      .currency()
      .create()
      .holderAccount(honeycomb.identity().address);
    await foodVault.mint(50_000 * 1_000_000_000);

    const missionsFoodVault = await honeycomb
      .currency()
      .create()
      .holderAccount(honeycomb.missions().address);
    await mainVault.transfer(50_000 * 1_000_000_000, missionsFoodVault);

    await honeycomb
      .missions()
      .create()
      .mission(
        {
          name: "QuickPost",
          cost: {
            address: currentCurrency.address,
            amount: 10,
          },
          duration: 60,
          minXp: 0,
          rewards: [
            {
              min: 100,
              max: 200,
              rewardType: {
                __kind: "Xp",
              },
            },
            {
              min: 10_000_000_000,
              max: 20_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: honeycomb.currency().address,
              },
            },
          ],
        },
        { skipPreflight: true }
      );

    honeycomb.use(currentCurrency);
  });

  it("Fetch or Create user/profile", async () => {
    await honeycomb
      .identity()
      .user()
      .catch((_) =>
        honeycomb.identity().create().user({
          username: "MissionTest1",
          name: "MissionTest",
          bio: "This account is used for testing",
          pfp: "https://ottxzxktsovtp7hzlcgxu7ti42ukppp5pzavhy6rkj7v4neiblyq.arweave.net/dOd83VOTqzf8-ViNen5o5qinvf1-QVPj0VJ_XjSICvE?ext=png",
        })
      );

    await honeycomb
      .identity()
      .profile(honeycomb.project().address, honeycomb.identity().address)
      .catch((_) =>
        honeycomb
          .identity()
          .create()
          .profile(honeycomb.project().address, honeycomb.identity().address)
      );

    // console.log("User", user.address.toString(), profile.address.toString());
  });

  it("Stake NFTs", async () => {
    const availableNfts = await honeycomb.staking().fetch().availableNfts();
    expect(availableNfts.length).toBe(totalNfts);
    await honeycomb.staking().stake(availableNfts);
    const stakedNfts = await honeycomb.staking().fetch().stakedNfts();
    expect(stakedNfts.length).toBe(totalNfts);
  });

  it("Participate on Mission", async () => {
    const stakedNfts = await honeycomb.staking().fetch().stakedNfts();
    const mission = await honeycomb.missions().mission("QuickPost");
    await mission.participate(
      stakedNfts.map((x) => ({
        ...x,
        serialize: x.serialize,
        pretty: x.pretty,
        args: {
          faction: "faction",
          merkleProof: factionsMerkleTree.getProofArray(
            factionsArray.findIndex((y) => y.mint.equals(x.mint))
          ),
        },
      }))
    );
  });

  it("Recall from missions", async () => {
    const participations = await honeycomb.missions().fetch().participations();
    const mission = await honeycomb.missions().mission("QuickPost");
    await mission.recall(participations);
  });

  it("Unstake NFTs", async () => {
    const stakedNfts = await honeycomb.staking().fetch().stakedNfts();
    await honeycomb.staking().unstake(stakedNfts, {
      skipPreflight: true,
    });
    const availableNfts = await honeycomb.staking().fetch().availableNfts();
    expect(availableNfts.length).toBe(totalNfts);
  });
});
