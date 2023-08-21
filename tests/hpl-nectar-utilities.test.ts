import * as web3 from "@solana/web3.js";
import { Metaplex, Nft, keypairIdentity } from "@metaplex-foundation/js";
import { TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import {
  Honeycomb,
  HoneycombProject,
  identityModule,
} from "@honeycomb-protocol/hive-control";
import {
  PermissionedCurrencyKind,
  HplCurrency,
  findProjectCurrencies,
  HplHolderAccount,
} from "@honeycomb-protocol/currency-manager";
import {
  LockType,
  NectarStaking,
  findProjectStakingPools,
} from "../packages/hpl-nectar-staking";
import {
  createNewTree,
  mintOneCNFT,
  prepare,
  tryKeyOrGenerate,
  wait,
} from "./prepare";
import {
  NectarMissions,
  findProjectMissionPools,
} from "../packages/hpl-nectar-missions";

jest.setTimeout(2000000);

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

describe("Nectar Utilities", () => {
  const totalNfts = 0;
  const totalcNfts = 1;

  let honeycomb: Honeycomb;
  let metaplex: Metaplex;
  let collection: Nft;
  let nfts: Nft[] = [];
  // let cNfts: Metadata[];
  // let factionsArray: { faction: string; mint: web3.PublicKey }[] = [];
  // let factionsMerkleTree: MerkleTree;
  let mainVault: HplHolderAccount;

  it("Temp", async () => {
    const connection = new web3.Connection(
      "https://rpc.helius.xyz/?api-key=1f580922-6600-4db7-bf2d-94363b0b5626"
      // "https://lingering-newest-sheet.solana-devnet.quiknode.pro/fb6e6465df3955a06fd5ddec2e5b003896f56adb/"
    );
    const honeycomb = new Honeycomb(connection, { env: "main" }).use(
      await HoneycombProject.fromAddress(
        connection,
        new web3.PublicKey("7CKTHsJ3EZqChNf3XGt9ytdZXvSzDFWmrQJL3BCe4Ppw")
        // new web3.PublicKey("B73zK97zv3WQfvF1o4tZF23oWo7rBGqj5kd9k51mMhdk")
      )
    );
    console.log(honeycomb.project().authority.toString());
    // let a: any = "";
    // if (!a) return;
    honeycomb.use(identityModule(tryKeyOrGenerate()[0]));

    console.log(honeycomb.identity().address.toString());

    // const balance = await honeycomb
    //   .rpc()
    //   .getBalance(honeycomb.identity().address);

    // console.log(
    //   "address",
    //   honeycomb.identity().address.toString(),
    //   balance.toString(),
    //   honeycomb.connection.rpcEndpoint
    // );

    await findProjectCurrencies(honeycomb.project());
    console.log("Currencies", Object.values(honeycomb._currencies).length);

    let bail = Object.values(honeycomb._currencies).find(
      (c) =>
        !Object.values((c as any)._metadata).length ||
        c.name.toLocaleLowerCase() === "bail"
    );
    if (!bail) throw new Error("Bail not found");

    let bounty = Object.values(honeycomb._currencies).find(
      (c) =>
        Object.values((c as any)._metadata).length &&
        c.name.toLocaleLowerCase() === "bounty"
    );
    if (!bounty) throw new Error("Bounty not found");

    let ammo = Object.values(honeycomb._currencies).find(
      (c) =>
        Object.values((c as any)._metadata).length &&
        c.name.toLocaleLowerCase() === "ammo"
    );
    if (!ammo) throw new Error("Ammo not found");

    let food = Object.values(honeycomb._currencies).find(
      (c) =>
        Object.values((c as any)._metadata).length &&
        c.name.toLocaleLowerCase() === "food"
    );
    if (!food) throw new Error("food not found");

    let gems = Object.values(honeycomb._currencies).find(
      (c) =>
        Object.values((c as any)._metadata).length &&
        c.name.toLocaleLowerCase() === "gems"
    );
    if (!gems) throw new Error("gems not found");
    await findProjectStakingPools(honeycomb.project());
    const staking = honeycomb.staking() as unknown as NectarStaking;
    console.log("Staking", staking.address);
    await findProjectMissionPools(honeycomb.project());
    const hcMissions = honeycomb.missions() as unknown as NectarMissions;
    console.log("Staking", hcMissions.address);

    const missions = {
      "Quick Patrol": {
        skip: false,
        costAmount: 1,
        minXp: 0,
        duration: 15 * 60,
        ammo: { skip: false, min: 1, max: 1 },
        food: { skip: false, min: 1, max: 1 },
      },
      "Casino Heist": {
        skip: false,
        costAmount: 0,
        minXp: 0,
        duration: 1 * 3600,
        ammo: { skip: false, min: 1, max: 1 },
      },
      "Night Patrol": {
        skip: false,
        costAmount: 0,
        minXp: 0,
        duration: 3 * 3600,
        ammo: { skip: false, min: 1, max: 1 },
        food: { skip: false, min: 1, max: 1 },
      },
      Investigate: {
        skip: false,
        costAmount: 3,
        minXp: 0,
        duration: 12 * 3600,
        ammo: { skip: false, min: 2, max: 2 },
        food: { skip: false, min: 5, max: 5 },
      },
      Arrest: {
        skip: false,
        costAmount: 3,
        minXp: 0,
        duration: 12 * 3600,
        ammo: { skip: false, min: 3, max: 3 },
        food: { skip: false, min: 3, max: 3 },
      },
      Combat: {
        skip: false,
        costAmount: 10,
        minXp: 0,
        duration: 48 * 3600,
        gems: { skip: false, min: 1, max: 1 },
      },
    };
    for (let mission of await hcMissions.missions()) {
      const config = missions[mission.name];

      if (config.skip) continue;

      const coins = {
        bail: bail,
        bounty: bounty,
        ammo: ammo,
        food: food,
        gems: gems,
      };

      await mission.update({
        name: null,
        minXp: config.minXp,
        cost: {
          address: bounty.address,
          amount: config.costAmount * 10 ** bounty.mint.decimals,
        },
        duration: config.duration,
        addRewards: Object.entries(coins)
          .map(
            ([name, coin]) =>
              config[name] && {
                rewardType: {
                  __kind: "Currency",
                  address: coin.address,
                } as RewardType,
                min: config[name].min * 10 ** coin.mint.decimals,
                max: config[name].max * 10 ** coin.mint.decimals,
              }
          )
          .filter((a) => a),
        removeRewardIndices: null,
        removeAllRewards: true,
      });

      console.log(mission.name, "Rewards", mission.rewards.length);
    }
  });

  it.skip("Prepare", async () => {
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

    // // const publicInfo = await honeycomb.publicInfo();
    // // let authDriver = publicInfo.get("auth_driver_offchain");
    // honeycomb.use(
    //   lutModule(async (accounts) => {
    //     const lookupTable = await createLookupTable(honeycomb, accounts);

    //     if (!lookupTable) throw new Error("Lookuptale noinsfoiasdoiahjsod");

    //     console.log("Lookup Table", lookupTable.key.toString());

    //     return {
    //       lookupTableAddress: lookupTable.key,
    //       addresses: lookupTable.state.addresses,
    //     };

    //     // const response = await fetch(`${authDriver}/lut/create`, {
    //     //   method: "POST",
    //     //   headers: {
    //     //     "Content-Type": "application/json",
    //     //     Authorization:
    //     //       "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2FkZHJlc3MiOiJGb0dEdXR6WnlVaVVjS3FNdG1WRlNQN3Fzd1B0dEZURzJvQlpDV00xMm43dCIsImlhdCI6MTY5MjE3NDg2NiwiZXhwIjoxNjkyMjYxMjY2fQ.vgRPlcjvrZGlh4s4opv27pPUwRO_yJBFgIyDKYU6khQ",
    //     //   },
    //     //   body: JSON.stringify({ accounts }),
    //     // }).then((x) => x.json());
    //     // console.log("Resposne", response);
    //     // const { addresses, key } = response.data;
    //     // return {
    //     //   lookupTableAddress: new web3.PublicKey(key),
    //     //   addresses: addresses.map((a) => new web3.PublicKey(a)),
    //     // };
    //   })
    // );

    // Set up Metaplex to mint some NFTs for testing
    metaplex = new Metaplex(honeycomb.connection);
    metaplex.use(keypairIdentity(tryKeyOrGenerate()[0]));
  });

  it.skip("Setup", async () => {
    // Mint Collection
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
      .then((x) => x.nft);

    // Mint Nfts
    for (let i = 1; i <= totalNfts; i++) {
      nfts.push(
        await metaplex
          .nfts()
          .create({
            name: `NFT #${i}`,
            symbol: `TEST`,
            sellerFeeBasisPoints: 100,
            uri: "https://arweave.net/WhyRt90kgI7f0EG9GPfB8TIBTIBgX3X12QaF9ObFerE",
            collection: collection.mint.address,
            collectionAuthority: metaplex.identity(),
            tokenStandard: TokenStandard.NonFungible,
          })
          .then((x) => x.nft)
      );
    }

    // Create Merkle tree for cNFTs
    const [treeKeypair] = await createNewTree(honeycomb);

    // Mint cNFTs
    for (let i = 1; i <= totalcNfts; i++) {
      await mintOneCNFT(honeycomb, {
        dropWalletKey: honeycomb.identity().address.toString(),
        name: `cNFT #${i}`,
        symbol: "TEST",
        uri: "https://arweave.net/WhyRt90kgI7f0EG9GPfB8TIBTIBgX3X12QaF9ObFerE",
        tree: treeKeypair,
        collection: collection.mint.address,
      });
    }

    // cNfts = await fetchCNfts({
    //   walletAddress: honeycomb.identity().address,
    //   collectionAddress: collection.mint.address,
    // });

    // factionsArray = nfts.map((nft) => ({
    //   faction: "faction",
    //   mint: nft.mint.address,
    // }));
    // factionsMerkleTree = new MerkleTree(
    //   factionsArray.map(({ faction, mint }) =>
    //     Buffer.from([...Buffer.from(faction), ...mint.toBuffer()])
    //   )
    // );

    // console.log(
    //   "FactionsTree",
    //   factionsArray.map((x) => ({ ...x, mint: x.mint.toString() }))
    // );

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
        name: "BAIL",
        symbol: "BAIL",
        kind: PermissionedCurrencyKind.NonCustodial,
        decimals: 9,
        uri: "https://arweave.net/QPC6FYdUn-3V8ytFNuoCS85S2tHAuiDblh6u3CIZLsw",
      })
    );
    mainVault = await honeycomb
      .currency()
      .create()
      .holderAccount(honeycomb.identity().address);
    await mainVault.mint(10_000 * 1_000_000_000);

    console.log(
      "Project",
      honeycomb.project().address.toString(),
      honeycomb.currency().address.toString()
    );
  });

  it.skip("Load Project", async () => {
    honeycomb.use(
      await HoneycombProject.fromAddress(
        honeycomb.connection,
        new web3.PublicKey("rwDU4NWfAfvrVquzmCeKw8ghZ2ebWpsQyjyhv7Dpfc2")
      )
    );
    await findProjectCurrencies(honeycomb.project());
  });

  it.skip("Load/Create Staking Pool", async () => {
    await findProjectStakingPools(honeycomb.project());

    if (!honeycomb.staking) {
      // Create staking pool
      honeycomb.use(
        await NectarStaking.new(honeycomb, {
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
    }

    (honeycomb.staking() as unknown as NectarStaking).helius_rpc =
      "https://devnet.helius-rpc.com/?api-key=014b4690-ef6d-4cab-b9e9-d3ec73610d52";
    // Fund Staking pool vault
    const stakingVault = await honeycomb
      .currency()
      .fetch()
      .holderAccount(honeycomb.staking().address)
      .catch(() =>
        honeycomb.currency().create().holderAccount(honeycomb.staking().address)
      );
    await stakingVault.mint(1_000 * 1_000_000_000);
    console.log(
      "Stakinng",
      honeycomb.staking().address.toString(),
      stakingVault.tokenAccount.toString()
    );
  });

  it.skip("Load/Create Mission Pool", async () => {
    await findProjectMissionPools(honeycomb.project());

    if (!honeycomb.missions) {
      honeycomb.use(
        await NectarMissions.new(honeycomb, {
          args: {
            name: "Missions2.0",
            factionsMerkleRoot: new Array(32).fill(0),
            collections: [collection.mint.address],
          },
        })
      );
    }

    const missionsVault = await honeycomb
      .currency()
      .fetch()
      .holderAccount(honeycomb.missions().address)
      .catch(() =>
        honeycomb
          .currency()
          .create()
          .holderAccount(honeycomb.missions().address)
      );
    await missionsVault.mint(1_000_000 * 1_000_000_000);
    console.log(
      "Missions",
      honeycomb.missions().address.toString(),
      missionsVault.tokenAccount.toString()
    );
  });

  it.skip("Load/Create Mission", async () => {
    const missions = await honeycomb.missions().missions();

    if (!missions.length) {
      await honeycomb
        .missions()
        .create()
        .mission({
          name: "Quick Patrol",
          cost: {
            address: honeycomb.currency().address,
            amount: 10 * 1_000_000_000,
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
              min: 0 * 1_000_000_000,
              max: 20 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: honeycomb.currency().address,
              },
            },
          ],
        });
    }
  });

  it.skip("Fetch or Create user/profile", async () => {
    await honeycomb
      .identity()
      .user()
      .catch((_) =>
        honeycomb.identity().create().user(
          {
            username: "MissionTest6",
            name: "MissionTest",
            bio: "This account is used for testing",
            pfp: "https://ottxzxktsovtp7hzlcgxu7ti42ukppp5pzavhy6rkj7v4neiblyq.arweave.net/dOd83VOTqzf8-ViNen5o5qinvf1-QVPj0VJ_XjSICvE?ext=png",
          },
          { skipPreflight: true }
        )
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

  it.skip("Stake NFTs", async () => {
    const availableNfts = await honeycomb.staking().fetch().availableNfts();
    console.log("AvailaleNFTs", availableNfts);
    expect(availableNfts.length).toBe(totalNfts + totalcNfts);
    await honeycomb.staking().stake(availableNfts, { skipPreflight: true });
    const stakedNfts = await honeycomb.staking().fetch().stakedNfts();
    expect(stakedNfts.length).toBe(totalNfts + totalcNfts);
  });

  it.skip("Participate on Mission", async () => {
    const stakedNfts = await honeycomb.staking().fetch().stakedNfts();
    console.log("StakedNfts", stakedNfts);
    expect(stakedNfts.length).toBe(totalNfts + totalcNfts);

    const participations = await honeycomb.missions().fetch().participations();
    console.log("Participations", participations.length);

    const nfts = stakedNfts.filter(
      (nft) => !participations.find((p) => p.nft.mint.equals(nft.mint))
    );

    if (nfts.length) {
      const mission = await honeycomb.missions().mission("Quick Patrol");
      await mission.participate(
        nfts.map((x) => ({
          ...x,
          args: {
            faction: null,
            merkleProof: null,
          },
        }))
      );
    }
  });

  it.skip("Recall from missions", async () => {
    await wait(1);
    const participations = await honeycomb.missions().participations();
    expect(participations.length).toBeGreaterThan(0);
    const mission = await honeycomb.missions().mission("Quick Patrol");
    await mission.recall(participations);
  });

  it.skip("Unstake NFTs", async () => {
    const stakedNfts = await honeycomb.staking().fetch().stakedNfts();
    expect(stakedNfts.length).toBe(totalNfts + totalcNfts);
    await honeycomb.staking().unstake(stakedNfts);
    const availableNfts = await honeycomb.staking().fetch().availableNfts();
    expect(availableNfts.length).toBe(totalNfts + totalcNfts);
  });
});
