import * as web3 from "@solana/web3.js";
import { Metaplex, Nft, walletAdapterIdentity } from "@metaplex-foundation/js";
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
import { prepare } from "./prepare";
import { MerkleTree, NectarMissions } from "../packages/hpl-nectar-missions";
jest.setTimeout(2000000);

describe("Nectar Utilities", () => {
  const totalNfts = 2;

  let honeycomb: Honeycomb;
  let metaplex: Metaplex;
  let collection: Nft;
  let nfts: Nft[] = [];
  let factionsArray: { faction: string; mint: web3.PublicKey }[] = [];
  let factionsMerkleTree: MerkleTree;
  let mainVault: HplHolderAccount;

  it("Temp", async () => {
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

  it.skip("Prepare and Setup", async () => {
    honeycomb = await prepare();
    const balance = await honeycomb
      .rpc()
      .getBalance(honeycomb.identity().publicKey);

    console.log(
      "address",
      honeycomb.identity().publicKey.toString(),
      balance.toString(),
      honeycomb.connection.rpcEndpoint
    );

    expect(balance).toBeGreaterThanOrEqual(web3.LAMPORTS_PER_SOL * 0.1);

    metaplex = new Metaplex(honeycomb.connection);
    metaplex.use(walletAdapterIdentity(honeycomb.identity()));

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
    mainVault = await honeycomb.currency().create().holderAccount();
    await mainVault.mint(100_000 * 1_000_000_000);
  });

  it.skip("Create Staking Pool", async () => {
    // Create staking pool
    honeycomb.use(
      await NectarStaking.new(honeycomb, {
        args: {
          name: "Staking3.0",
          rewardsPerDuration: 1 * 1_000_000_000,
          rewardsDuration: 10,
          maxRewardsDuration: 10,
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

    // Fund Staking pool vault
    const stakingVault = await honeycomb
      .currency()
      .create()
      .holderAccount(honeycomb.staking().address);
    await mainVault.transfer(10_000_000_000_000, stakingVault);
  });

  it.skip("Create Mission Pool", async () => {
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
    await mainVault.transfer(10_000_000_000_000, missionsVault);
    console.log(
      "Missions",
      honeycomb.missions().address.toString(),
      mainVault.tokenAccount.toString()
    );
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
          {
            min: 10_000_000_000,
            max: 20_000_000_000,
            rewardType: {
              __kind: "Currency",
              address: honeycomb.currency().address,
            },
          },
        ],
      });
  });

  it.skip("Fetch or Create user/profile", async () => {
    await honeycomb
      .identity()
      .user()
      .catch((_) =>
        honeycomb.identity().create().user({
          username: "MissionTest7",
          name: "MissionTest",
          bio: "This account is used for testing",
          pfp: "https://ottxzxktsovtp7hzlcgxu7ti42ukppp5pzavhy6rkj7v4neiblyq.arweave.net/dOd83VOTqzf8-ViNen5o5qinvf1-QVPj0VJ_XjSICvE?ext=png",
        })
      );

    await honeycomb
      .identity()
      .profile(honeycomb.project().address, honeycomb.identity().publicKey)
      .catch((_) =>
        honeycomb
          .identity()
          .create()
          .profile(honeycomb.project().address, honeycomb.identity().publicKey)
      );

    // console.log("User", user.address.toString(), profile.address.toString());
  });

  it.skip("Stake NFTs", async () => {
    const availableNfts = await honeycomb.staking().fetch().availableNfts();
    expect(availableNfts.length).toBe(totalNfts);
    await honeycomb.staking().stake(availableNfts);
    const stakedNfts = await honeycomb.staking().fetch().stakedNfts();
    expect(stakedNfts.length).toBe(totalNfts);
  });

  it.skip("Participate on Mission", async () => {
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

  it.skip("Recall from missions", async () => {
    const participations = await honeycomb.missions().fetch().participations();
    const mission = await honeycomb.missions().mission("QuickPost");
    await mission.recall(...participations);
  });

  it.skip("Unstake NFTs", async () => {
    const stakedNfts = await honeycomb.staking().fetch().stakedNfts();
    await honeycomb.staking().unstake(stakedNfts, {
      skipPreflight: true,
    });
    const availableNfts = await honeycomb.staking().fetch().availableNfts();
    expect(availableNfts.length).toBe(totalNfts);
  });
});
