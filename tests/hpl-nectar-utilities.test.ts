import * as web3 from "@solana/web3.js";
import { Metaplex, Nft, keypairIdentity } from "@metaplex-foundation/js";
import { TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import {
  HPL_HIVE_CONTROL_PROGRAM,
  Honeycomb,
  HoneycombProject,
  ProfileDataType,
  VAULT,
  lutModule,
} from "@honeycomb-protocol/hive-control";
import {
  PermissionedCurrencyKind,
  HplCurrency,
  findProjectCurrencies,
  HPL_CURRENCY_MANAGER_PROGRAM,
  METADATA_PROGRAM_ID,
} from "@honeycomb-protocol/currency-manager";
import {
  HPL_NECTAR_STAKING_PROGRAM,
  LockType,
  NectarStaking,
  findProjectStakingPools,
} from "../packages/hpl-nectar-staking";
import getHoneycombs from "../scripts/prepare";
import { createNewTree, mintOneCNFT } from "./helpers";
import {
  HPL_NECTAR_MISSIONS_PROGRAM,
  NectarMissions,
  createLookupTable,
  findProjectMissionPools,
  getOrFetchLoockupTable,
} from "../packages/hpl-nectar-missions";
import { HPL_EVENTS_PROGRAM } from "@honeycomb-protocol/events";
import {
  SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
  SPL_NOOP_PROGRAM_ID,
} from "@solana/spl-account-compression";
import { TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { PROGRAM_ID as BUBBLEGUM_PROGRAM_ID } from "@metaplex-foundation/mpl-bubblegum";
import { PROGRAM_ID as AUTHORIZATION_PROGRAM_ID } from "@metaplex-foundation/mpl-token-auth-rules";
import {
  BuzzGuildKit,
  GuildVisibility,
  JoiningCriteria,
  conditionNull,
  findProjectGuildKits,
} from "@honeycomb-protocol/buzz-guild";

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

describe("Nectar Utilities", () => {
  const totalNfts = 1;
  const totalcNfts = 1;

  let adminHC: Honeycomb;
  let userHC: Honeycomb;
  let metaplex: Metaplex;
  let collection: Nft;
  let merkleTree: web3.PublicKey;
  let nfts: Nft[] = [];
  let universalLut: web3.AddressLookupTableAccount;

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
      const nft = await metaplex
        .nfts()
        .create({
          name: `NFT #${i}`,
          symbol: `NFT`,
          sellerFeeBasisPoints: 100,
          uri: "https://arweave.net/WhyRt90kgI7f0EG9GPfB8TIBTIBgX3X12QaF9ObFerE",
          collection: collection.mint.address,
          collectionAuthority: metaplex.identity(),
          tokenStandard: TokenStandard.NonFungible,
          tokenOwner: userHC.identity().address,
        })
        .then((x) => x.nft);
      nfts.push(nft);
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
    adminHC.use(
      await HoneycombProject.new(adminHC, {
        name: "TestProject",
        expectedMintAddresses: nfts.length,
        collections: [collection.mint.address],
        merkleTrees: merkleTree ? [merkleTree] : [],
        profileDataConfigs: [
          {
            label: "nectar_missions_xp",
            dataType: ProfileDataType.SingleValue,
          },
        ],
      })
    );

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

    console.log(
      "Project",
      adminHC.project().address.toString(),
      "Currency",
      adminHC.currency().address.toString()
    );
  });

  it("Load Project", async () => {
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
          collections: [collection.mint.address],
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

  it.skip("Load/Create Guild Kit", async () => {
    await findProjectGuildKits(adminHC.project());

    if (!adminHC.guildKit) {
      // Create staking pool
      adminHC.use(
        await BuzzGuildKit.new(
          adminHC,
          {
            args: {
              payment: conditionNull(),
            },
          },
          {
            commitment: "processed",
            preflightCommitment: "processed",
          }
        )
      );
    }

    console.log("GuildKit", adminHC.guildKit().address.toString());
  });

  it("Load/Create Mission Pool", async () => {
    await findProjectMissionPools(adminHC.project());

    if (!adminHC.missions) {
      adminHC.use(
        await NectarMissions.new(adminHC, {
          args: {
            name: "Missions2.0",
            factionsMerkleRoot: new Array(32).fill(0),
            stakingPools: [adminHC.staking().address],
          },
          project: adminHC.project().address,
        })
      );
    }

    console.log("Missions", adminHC.missions().address.toString());
  });

  it("Load/Create Mission", async () => {
    const missions = await adminHC.missions().missions();

    if (!missions.length) {
      await adminHC.missions().add({
        name: "Quick Patrol",
        cost: {
          address: adminHC.currency().address,
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
              address: adminHC.currency().address,
            },
          },
        ],
      });
    }
  });

  it("Fetch for user", async () => {
    userHC.use(
      await HoneycombProject.fromAddress(userHC, adminHC.project().address)
    );
    await findProjectCurrencies(userHC.project());
    await findProjectStakingPools(userHC.project());
    await findProjectMissionPools(userHC.project());
    await findProjectGuildKits(userHC.project());
    await userHC.missions().missions();

    // const temp = await userHC
    //   .lut()
    //   .getOrFetch(
    //     userHC.processedConnection,
    //     new web3.PublicKey("86HuZxzdh1ErDpjTBsnyyg76rwusNDquNjDGPRT3Uuau")
    //   );
    // if (temp) universalLut = temp;

    userHC.staking().helius_rpc =
      "https://devnet.helius-rpc.com/?api-key=ccca5bb2-58dc-4b94-838b-664df478cf45";
  });

  it("Create and Load Lookup Table", async () => {
    if (!universalLut) {
      const addresses = [
        HPL_EVENTS_PROGRAM,
        HPL_HIVE_CONTROL_PROGRAM,
        HPL_CURRENCY_MANAGER_PROGRAM,
        HPL_NECTAR_STAKING_PROGRAM,
        HPL_NECTAR_MISSIONS_PROGRAM,
        VAULT,
        web3.SystemProgram.programId,
        TOKEN_PROGRAM_ID,
        TOKEN_2022_PROGRAM_ID,
        METADATA_PROGRAM_ID,
        BUBBLEGUM_PROGRAM_ID,
        AUTHORIZATION_PROGRAM_ID,

        SPL_ACCOUNT_COMPRESSION_PROGRAM_ID,
        SPL_NOOP_PROGRAM_ID,
        web3.SYSVAR_CLOCK_PUBKEY,
        web3.SYSVAR_RENT_PUBKEY,
        web3.SYSVAR_INSTRUCTIONS_PUBKEY,
      ];

      Object.values(adminHC._projects).forEach((project) => {
        addresses.push(project.address);
        addresses.push(...project.collections);
        addresses.push(...project.creators);
        addresses.push(...project.merkleTrees);
      });

      Object.values(adminHC._currencies).forEach((currency) => {
        addresses.push(currency.address);
        addresses.push(currency.mint.address);
      });

      await Promise.all(
        Object.values(adminHC._stakings).map(async (staking) => {
          addresses.push(staking.address);
          await staking
            .multipliers()
            .then(
              (multipliers) =>
                multipliers && addresses.push(multipliers.address)
            );
        })
      );

      await Promise.all(
        Object.values(adminHC._missions).map(async (missions) => {
          addresses.push(missions.address);
          await missions
            .missions()
            .then(
              (missions) =>
                missions && addresses.push(...missions.map((m) => m.address))
            );
        })
      );

      universalLut = await adminHC.lut().create(addresses);
      console.log("New universal LUT", universalLut.key.toString());
    }

    await userHC
      .staking()
      .loadLuts(
        new Map()
          .set("stake", [universalLut])
          .set("claim", [universalLut])
          .set("unstake", [universalLut])
      );
    await userHC
      .missions()
      .loadLuts(
        new Map()
          .set("recall", [universalLut])
          .set("participate", [universalLut])
      );
  });

  it("Fetch or Create user/profile", async () => {
    const user = await userHC
      .profiles()
      .userFromUsername("Test2")
      .catch((e) =>
        userHC.profiles().newUser({
          username: "Test2",
          name: "Test User",
          bio: "This user account is used for testing",
          pfp: "https://lh3.googleusercontent.com/yTzqJcgQ4VNQuq5BXjEefj88NvmY6uqmq9UEM6nGUF9Vs68LPsTYocXR9vJ4yhvl-LlXeXgdXkm5Y5lz9p3LQqbEifbKHV5xtLc",
        })
      );

    await user.profile(userHC.project().address).catch(() =>
      user.newProfile(
        {
          pfp: "https://lh3.googleusercontent.com/UjE0kuudxuDzQ0QezywU99TzM49_QbNKHvmE8A8rC9o76W84YU1TmT0M78WJZz5bcu1VMud5RfYSoYZuv5Pa52PpO_bchLkiQQ",
        },
        userHC.project().address
      )
    );
  });

  it.skip("Stake NFTs", async () => {
    const staking = userHC.staking() as unknown as NectarStaking;
    const availableNfts = await staking.availableNfts();

    if (availableNfts.length) {
      await staking.stake(availableNfts);
    }

    const stakedNfts = await staking.stakedNfts();
    console.log("Staked Nfts", stakedNfts.length);
    expect(stakedNfts.length).toBe(totalNfts + totalcNfts);
  });

  it.skip("Create Guild", async () => {
    const staking = userHC.staking();
    const nfts = await staking.stakedNfts();
    const guildKit = userHC.guildKit();

    const guild = await guildKit.createAndJoinGuild(
      {
        chiefNft: nfts[0],
        name: "Guild 1",
        visibility: GuildVisibility.Private,
        joiningCriteria: JoiningCriteria.SingleUser,
        stakingPool: staking,
        // memberNfts: nfts.slice(1).map((nft, i) => ({
        //   order: i + 2,
        //   nft,
        // })),
      },
      {
        skipPreflight: true,
        commitment: "processed",
        preflightCommitment: "processed",
      }
    );
    console.log("guild", guild.address.toString());
  });

  it.skip("Participate on Mission with Nft", async () => {
    const staking = userHC.staking() as unknown as NectarStaking;

    const usableNfts = await staking.usableNfts();

    console.log("usable Nfts", usableNfts.length);
    if (usableNfts.length) {
      const mission = await userHC.missions().mission("Quick Patrol");
      await mission.participate(
        usableNfts.map((x) => ({
          ...x,
          args: {
            faction: null,
            merkleProof: null,
          },
        }))
      );
    }

    const participations = await userHC.missions().participations();
    console.log("Participations", participations.length);
    expect(participations.length).toBe(usableNfts.length);
  });

  it.skip("Participate on Mission with Guild", async () => {
    await wait(10);
    const guilds = await userHC.guildKit().myGuilds();
    console.log("guilds", guilds.length);
    const participations = await userHC.missions().participations();
    console.log("Participations", participations.length);

    if (guilds.length) {
      const mission = await userHC.missions().mission("Quick Patrol");
      await mission.participate(guilds);
    }
  });

  it.skip("Recall Nfts from missions", async () => {
    await wait(1);
    const participations = await userHC.missions().participations();
    expect(participations.length).toBeGreaterThan(0);
    await userHC.missions().recall(participations);
  });

  it.skip("Disband Guilds", async () => {
    const staking = userHC.staking() as unknown as NectarStaking;
    const guilds = await userHC.guildKit().myGuilds();

    await Promise.all(
      guilds.map((guild) =>
        guild?.disbandSingleUser(
          {
            stakingPool: staking,
            shouldUnstakeAfterLeave: true,
          },
          {
            skipPreflight: false,
            commitment: "processed",
            preflightCommitment: "processed",
          }
        )
      )
    );
    console.log("Successfully left guild & unstaked nfts");
  });

  it.skip("Unstake NFTs", async () => {
    const staking = userHC.staking() as unknown as NectarStaking;

    const stakedNfts = await staking.stakedNfts();
    expect(stakedNfts.length).toBe(totalNfts + totalcNfts);
    await staking.unstake(stakedNfts);
    const availableNfts = await staking.availableNfts();
    expect(availableNfts.length).toBe(totalNfts + totalcNfts);
  });
});
