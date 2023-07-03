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
  HplHolderAccount,
  findProjectCurrencies,
} from "@honeycomb-protocol/currency-manager";
import {
  LockType,
  NectarStaking,
  findProjectStakingPools,
} from "../packages/hpl-nectar-staking";
import { prepare, tryKeyOrGenerate, wait } from "./prepare";
import {
  MerkleTree,
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
      // "https://lingering-newest-sheet.solana-devnet.quiknode.pro/fb6e6465df3955a06fd5ddec2e5b003896f56adb/"
    );
    const honeycomb = new Honeycomb(connection, { env: "main" }).use(
      await HoneycombProject.fromAddress(
        connection,
        new web3.PublicKey("7CKTHsJ3EZqChNf3XGt9ytdZXvSzDFWmrQJL3BCe4Ppw")
        // new web3.PublicKey("B73zK97zv3WQfvF1o4tZF23oWo7rBGqj5kd9k51mMhdk")
      )
    );
    honeycomb.use(identityModule(tryKeyOrGenerate()[0]));

    const balance = await honeycomb
      .rpc()
      .getBalance(honeycomb.identity().address);

    console.log(
      "address",
      honeycomb.identity().address.toString(),
      balance.toString(),
      honeycomb.connection.rpcEndpoint
    );

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
    if (!bounty) {
      const bundlr = await honeycomb.storage().bundlr();
      const uriMetadata = {
        name: "Bounty",
        symbol: "BTY",
        description: "Sol Patrol In-Game Currency",
        image: "https://solpatrol.io/_next/static/media/bounty.19dbf99b.png",
      };
      const cost = await honeycomb
        .storage()
        .getUploadPriceForBytes(bytesOf(uriMetadata));
      await bundlr.fund(cost.basisPoints.toNumber());
      const uri = await honeycomb.storage().uploadJson(uriMetadata);

      bounty = await HplCurrency.new(honeycomb, {
        ...uriMetadata,
        kind: PermissionedCurrencyKind.NonCustodial,
        decimals: 9,
        uri,
      });
      honeycomb.use(bounty);
    }

    let ammo = Object.values(honeycomb._currencies).find(
      (c) =>
        Object.values((c as any)._metadata).length &&
        c.name.toLocaleLowerCase() === "ammo"
    );
    if (!ammo) {
      const bundlr = await honeycomb.storage().bundlr();
      const uriMetadata = {
        name: "Ammo",
        symbol: "AMMO",
        description: "Sol Patrol In-Game Currency",
        image: "https://solpatrol.io/_next/static/media/ammo.5bf182ea.png",
      };
      const cost = await honeycomb
        .storage()
        .getUploadPriceForBytes(bytesOf(uriMetadata));
      await bundlr.fund(cost.basisPoints.toNumber());
      const uri = await honeycomb.storage().uploadJson(uriMetadata);

      ammo = await HplCurrency.new(honeycomb, {
        ...uriMetadata,
        kind: PermissionedCurrencyKind.NonCustodial,
        decimals: 9,
        uri,
      });
      honeycomb.use(ammo);
    }

    let food = Object.values(honeycomb._currencies).find(
      (c) =>
        Object.values((c as any)._metadata).length &&
        c.name.toLocaleLowerCase() === "food"
    );
    if (!food) {
      const bundlr = await honeycomb.storage().bundlr();
      const uriMetadata = {
        name: "Food",
        symbol: "FOOD",
        description: "Sol Patrol In-Game Currency",
        image: "https://solpatrol.io/_next/static/media/food.fedbb519.png",
      };
      const cost = await honeycomb
        .storage()
        .getUploadPriceForBytes(bytesOf(uriMetadata));
      await bundlr.fund(cost.basisPoints.toNumber());
      const uri = await honeycomb.storage().uploadJson(uriMetadata);

      food = await HplCurrency.new(honeycomb, {
        ...uriMetadata,
        kind: PermissionedCurrencyKind.NonCustodial,
        decimals: 9,
        uri,
      });
      honeycomb.use(food);
    }

    let gems = Object.values(honeycomb._currencies).find(
      (c) =>
        Object.values((c as any)._metadata).length &&
        c.name.toLocaleLowerCase() === "gems"
    );
    if (!gems) {
      const bundlr = await honeycomb.storage().bundlr();
      const uriMetadata = {
        name: "Gems",
        symbol: "GEMS",
        description: "Sol Patrol In-Game Currency",
        image: "https://solpatrol.io/_next/static/media/gems.27de6020.png",
      };
      const cost = await honeycomb
        .storage()
        .getUploadPriceForBytes(bytesOf(uriMetadata));
      await bundlr.fund(cost.basisPoints.toNumber());
      const uri = await honeycomb.storage().uploadJson(uriMetadata);

      gems = await HplCurrency.new(honeycomb, {
        ...uriMetadata,
        kind: PermissionedCurrencyKind.NonCustodial,
        decimals: 9,
        uri,
      });
      honeycomb.use(gems);
    }

    await findProjectStakingPools(honeycomb.project());
    const staking = honeycomb.staking();
    console.log("Staking", staking.totalStaked.toString());

    // staking.updatePool({
    //   args: {
    //     name: null,
    //     rewardsPerDuration: (25 * 1_000_000_000) / 86400,
    //     rewardsDuration: 1,
    //     maxRewardsDuration: null,
    //     minStakeDuration: null,
    //     cooldownDuration: null,
    //     resetStakeDuration: null,
    //     startTime: null,
    //     endTime: null,
    //   },
    // });

    // staking
    //   .staker({
    //     wallet: new web3.PublicKey(
    //       "232Z5QNvQ4wRyraGWFpC5i3HEbqozEWgBCV95eWASaG1"
    //     ),
    //   })
    //   .then((s) =>
    //     console.log("Staker", {
    //       ...s,
    //       totalStaked: s.totalStaked.toString(),
    //       wallet: s.wallet.toString(),
    //     })
    //   );

    // const availableNfts = await honeycomb
    //   .staking()
    //   .fetch()
    //   .availableNfts(
    //     new web3.PublicKey("232Z5QNvQ4wRyraGWFpC5i3HEbqozEWgBCV95eWASaG1")
    //   );
    // console.log("availableNfts", availableNfts.length);

    // const stakedNfts = await honeycomb
    //   .staking()
    //   .fetch()
    //   .stakedNfts(
    //     new web3.PublicKey("232Z5QNvQ4wRyraGWFpC5i3HEbqozEWgBCV95eWASaG1")
    //   );
    // console.log("stakedNfts", stakedNfts.length);
    // const [{ rewards, multipliers }] = await honeycomb
    //   .staking()
    //   .fetch()
    //   .rewards([stakedNfts[0]]);
    // console.log("rewards", rewards, multipliers);

    // // @ts-ignore
    // const mint: web3.PublicKey = staking._pool.currency;
    // console.log("mint", mint.toString());

    // const [rewardVault] = web3.PublicKey.findProgramAddressSync(
    //   [Buffer.from("vault"), staking.address.toBuffer(), mint.toBuffer()],
    //   staking.programId
    // );

    // const [currency] = currencyPda(mint);
    // const [vaultHolderAccount] = holderAccountPda(staking.address, mint);
    // const [vaultTokenAccount] = tokenAccountPda(staking.address, mint);

    // const operation = new Operation(honeycomb, [
    //   ...(await createCreateCurrencyOperation(honeycomb, {
    //     args: {
    //       mint,
    //     },
    //     project: staking.project(),
    //   }).then(({ operation }) => operation.instructions)),

    //   createCreateHolderAccountInstruction({
    //     project: staking.project().address,
    //     currency,
    //     holderAccount: vaultHolderAccount,
    //     mint,
    //     tokenAccount: vaultTokenAccount,
    //     owner: staking.address,
    //     payer: honeycomb.identity().address,
    //     vault: VAULT,
    //     instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
    //   }),

    //   createMigrateVaultInstruction({
    //     project: staking.project().address,
    //     stakingPool: staking.address,
    //     currency,
    //     mint,
    //     rewardVault,
    //     vaultHolderAccount,
    //     vaultTokenAccount,
    //     authority: honeycomb.identity().address,
    //     payer: honeycomb.identity().address,
    //     delegateAuthority: staking.programId,
    //     vault: VAULT,
    //     currencyManagerProgram: CURRENCY_PROGRAM_ID,
    //     instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
    //   }),
    // ]);

    // await operation.send({ skipPreflight: true });

    await findProjectMissionPools(honeycomb.project());
    if (!honeycomb._missions) {
      const collections = [];
      honeycomb.use(
        await NectarMissions.new(honeycomb, {
          args: {
            name: "Sol Patrol",
            factionsMerkleRoot: Array(32).fill(0),
            collections,
          },
        })
      );
    }

    // console.log("UPDATING MISSIONS");
    // await honeycomb.missions().update(
    //   {
    //     factionsMerkleRoot: Array(32).fill(0),
    //     collection: honeycomb.project().collections[staking.collections[0]],
    //   },
    //   { skipPreflight: true }
    // );

    console.log("StakingCollectionn", staking.collections, staking.creators);
    console.log(
      "MissionCollectionn",
      honeycomb.missions().collections,
      honeycomb.missions().creators
    );

    await bail
      .fetch()
      .holderAccount(honeycomb.missions().address)
      .catch((_) =>
        (bail as HplCurrency)
          .create()
          .holderAccount(honeycomb.missions().address)
      );

    await bounty
      .fetch()
      .holderAccount(honeycomb.missions().address)
      .catch((_) =>
        (bounty as HplCurrency)
          .create()
          .holderAccount(honeycomb.missions().address)
      )
      .then((hA) => hA.mint(10_000 * 1_000_000_000));

    await ammo
      .fetch()
      .holderAccount(honeycomb.missions().address)
      .catch((_) =>
        (ammo as HplCurrency)
          .create()
          .holderAccount(honeycomb.missions().address)
      )
      .then((hA) => hA.mint(10_000 * 1_000_000_000));

    await food
      .fetch()
      .holderAccount(honeycomb.missions().address)
      .catch((_) =>
        (food as HplCurrency)
          .create()
          .holderAccount(honeycomb.missions().address)
      )
      .then((hA) => hA.mint(10_000 * 1_000_000_000));

    await gems
      .fetch()
      .holderAccount(honeycomb.missions().address)
      .catch((_) =>
        (gems as HplCurrency)
          .create()
          .holderAccount(honeycomb.missions().address)
      )
      .then((hA) => hA.mint(10_000 * 1_000_000_000));

    const missions = await honeycomb.missions().missions();

    missions[0].rewards.map((r) =>
      console.log(r.isCurrency() ? r.currency().name : "Exprience Points")
    );

    // Night Patrol - 3 hr
    // Cost in $BAIL: Zero
    // Duration: 180 min
    // Bounty yield: 2
    // XP awarded: 1  point
    // Resource 1 (Ammo):  1
    // Resource 2 (Food): 1
    // Resource 3 (Gems): 0
    // $BAIL reward: 0 $BAIL
    if (!missions.find((m) => m.name === "Night Patrol")) {
      await honeycomb
        .missions()
        .create()
        .mission({
          name: "Night Patrol",
          cost: {
            address: bail.address,
            amount: 0 * 1_000_000_000,
          },
          duration: 3 * 3600,
          minXp: 0,
          rewards: [
            {
              min: 2 * 1_000_000_000,
              max: 2 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: bounty.address,
              },
            },
            {
              min: 1,
              max: 1,
              rewardType: {
                __kind: "Xp",
              },
            },
            {
              min: 1 * 1_000_000_000,
              max: 1 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: ammo.address,
              },
            },
            {
              min: 1 * 1_000_000_000,
              max: 1 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: food.address,
              },
            },
            {
              min: 0 * 1_000_000_000,
              max: 0 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: gems.address,
              },
            },
            {
              min: 0 * 1_000_000_000,
              max: 0 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: bail.address,
              },
            },
          ],
        });
    }

    // Investigate - 12 hours
    // Cost in $BAIL: 500 $BAIL
    // Duration: 12 hours
    // Bounty yield: 2.5 - 10
    // XP awarded: 6 - 10 points
    // Resource 1 (Ammo): 2
    // Resource 2 (Food): 5
    // Resource 3 (Gems): 0
    // $BAIL reward: 0 - 100 $BAIL
    if (!missions.find((m) => m.name === "Investigate")) {
      await honeycomb
        .missions()
        .create()
        .mission({
          name: "Investigate",
          cost: {
            address: bail.address,
            amount: 500 * 1_000_000_000,
          },
          duration: 12 * 3600,
          minXp: 0,
          rewards: [
            {
              min: 2.5 * 1_000_000_000,
              max: 10 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: bounty.address,
              },
            },
            {
              min: 6,
              max: 10,
              rewardType: {
                __kind: "Xp",
              },
            },
            {
              min: 2 * 1_000_000_000,
              max: 2 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: ammo.address,
              },
            },
            {
              min: 5 * 1_000_000_000,
              max: 5 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: food.address,
              },
            },
            {
              min: 0 * 1_000_000_000,
              max: 0 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: gems.address,
              },
            },
            {
              min: 0 * 1_000_000_000,
              max: 100 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: bail.address,
              },
            },
          ],
        });
    }

    // Arrest - 12 hours
    // Cost in $BAIL: 500 $BAIL
    // Duration: 12 hours
    // Bounty yield: 1 - 10
    // XP awarded: 10 - 16 points
    // Resource 1 (Ammo): 3
    // Resource 2 (Food): 3
    // Resource 3 (Gems): 0
    // $BAIL reward: 0 -  100 $BAIL
    if (!missions.find((m) => m.name === "Arrest")) {
      await honeycomb
        .missions()
        .create()
        .mission({
          name: "Arrest",
          cost: {
            address: bail.address,
            amount: 500 * 1_000_000_000,
          },
          duration: 12 * 3600,
          minXp: 0,
          rewards: [
            {
              min: 1 * 1_000_000_000,
              max: 10 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: bounty.address,
              },
            },
            {
              min: 10,
              max: 16,
              rewardType: {
                __kind: "Xp",
              },
            },
            {
              min: 3 * 1_000_000_000,
              max: 3 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: ammo.address,
              },
            },
            {
              min: 3 * 1_000_000_000,
              max: 3 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: food.address,
              },
            },
            {
              min: 0 * 1_000_000_000,
              max: 0 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: gems.address,
              },
            },
            {
              min: 0 * 1_000_000_000,
              max: 100 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: bail.address,
              },
            },
          ],
        });
    }

    // Combat - 2 Days (Level 3)
    // Cost in $BAIL: 1500 $BAIL
    // Duration: 48 hours
    // Bounty yield: 10 - 30
    // XP awarded: 25 - 50 points
    // Resource 1 (Ammo): 15
    // Resource 2 (Food): 25
    // Resource 3 (Gems): 1
    // $BAIL reward: 50 - 300 $BAIL
    if (!missions.find((m) => m.name === "Combat")) {
      await honeycomb
        .missions()
        .create()
        .mission({
          name: "Combat",
          cost: {
            address: bail.address,
            amount: 1500 * 1_000_000_000,
          },
          duration: 48 * 3600,
          minXp: 300,
          rewards: [
            {
              min: 10 * 1_000_000_000,
              max: 30 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: bounty.address,
              },
            },
            {
              min: 25,
              max: 50,
              rewardType: {
                __kind: "Xp",
              },
            },
            {
              min: 15 * 1_000_000_000,
              max: 15 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: ammo.address,
              },
            },
            {
              min: 25 * 1_000_000_000,
              max: 25 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: food.address,
              },
            },
            {
              min: 1 * 1_000_000_000,
              max: 1 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: gems.address,
              },
            },
            {
              min: 50 * 1_000_000_000,
              max: 300 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: bail.address,
              },
            },
          ],
        });
    }

    // Quick Patrol - 0.25 hr
    // Cost in $BAIL: 150
    // Duration: 15 min
    // Bounty yield: 1
    // XP awarded: 0  point
    // Resource 1 (Ammo):  1
    // Resource 2 (Food): 1
    // Resource 3 (Gems): 0
    // $BAIL reward: 0 $BAIL
    if (!missions.find((m) => m.name === "Quick Patrol")) {
      await honeycomb
        .missions()
        .create()
        .mission({
          name: "Quick Patrol",
          cost: {
            address: bail.address,
            amount: 150 * 1_000_000_000,
          },
          duration: 15 * 60,
          minXp: 0,
          rewards: [
            {
              min: 1 * 1_000_000_000,
              max: 1 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: bounty.address,
              },
            },
            {
              min: 0,
              max: 0,
              rewardType: {
                __kind: "Xp",
              },
            },
            {
              min: 1 * 1_000_000_000,
              max: 1 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: ammo.address,
              },
            },
            {
              min: 1 * 1_000_000_000,
              max: 1 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: food.address,
              },
            },
            {
              min: 0 * 1_000_000_000,
              max: 0 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: gems.address,
              },
            },
            {
              min: 0 * 1_000_000_000,
              max: 0 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: bail.address,
              },
            },
          ],
        });
    }

    // Casino Heist - 1 hr
    // Cost in $BAIL: 0
    // Duration: 60 min
    // Bounty yield: 0 - 1
    // XP awarded: 0  point
    // Resource 1 (Ammo):  1
    // Resource 2 (Food): 0
    // Resource 3 (Gems): 0
    // $BAIL reward: 0 $BAIL
    if (!missions.find((m) => m.name === "Casino Heist")) {
      await honeycomb
        .missions()
        .create()
        .mission({
          name: "Casino Heist",
          cost: {
            address: bail.address,
            amount: 0 * 1_000_000_000,
          },
          duration: 3600,
          minXp: 0,
          rewards: [
            {
              min: 0 * 1_000_000_000,
              max: 1 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: bounty.address,
              },
            },
            {
              min: 0,
              max: 0,
              rewardType: {
                __kind: "Xp",
              },
            },
            {
              min: 1 * 1_000_000_000,
              max: 1 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: ammo.address,
              },
            },
            {
              min: 0 * 1_000_000_000,
              max: 0 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: food.address,
              },
            },
            {
              min: 0 * 1_000_000_000,
              max: 0 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: gems.address,
              },
            },
            {
              min: 0 * 1_000_000_000,
              max: 0 * 1_000_000_000,
              rewardType: {
                __kind: "Currency",
                address: bail.address,
              },
            },
          ],
        });
    }
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
        uri: "https://arweave.net/WhyRt90kgI7f0EG9GPfB8TIBTIBgX3X12QaF9ObFerE",
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

    console.log("Project", honeycomb.project().address.toString());
  });

  it("Create Staking Pool", async () => {
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

    // Fund Staking pool vault
    const stakingVault = await honeycomb
      .currency()
      .create()
      .holderAccount(honeycomb.staking().address);
    await stakingVault.mint(10_000 * 1_000_000_000);
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
    await missionsVault.mint(10_000 * 1_000_000_000);
    console.log(
      "Missions",
      honeycomb.missions().address.toString(),
      missionsVault.tokenAccount.toString()
    );
  });

  it("Create Mission", async () => {
    const currentCurrency = honeycomb.currency();

    const bounty = await HplCurrency.new(honeycomb, {
      name: "Bounty",
      symbol: "BTY",
      kind: PermissionedCurrencyKind.NonCustodial,
      decimals: 9,
      uri: "https://storage.googleapis.com/nft-assets/items/FUEL.png",
    });
    honeycomb.use(bounty);
    const bountyVault = await honeycomb
      .currency()
      .create()
      .holderAccount(honeycomb.missions().address);
    await bountyVault.mint(10_000 * 1_000_000_000);

    const food = await HplCurrency.new(honeycomb, {
      name: "Food",
      symbol: "FOOD",
      kind: PermissionedCurrencyKind.NonCustodial,
      decimals: 9,
      uri: "https://storage.googleapis.com/nft-assets/items/FOOD.png",
    });
    honeycomb.use(food);
    const foodVault = await honeycomb
      .currency()
      .create()
      .holderAccount(honeycomb.missions().address);
    await foodVault.mint(10_000 * 1_000_000_000);

    const ammo = await HplCurrency.new(honeycomb, {
      name: "Ammo",
      symbol: "AMO",
      kind: PermissionedCurrencyKind.NonCustodial,
      decimals: 9,
      uri: "https://storage.googleapis.com/nft-assets/items/AMMO.png",
    });
    honeycomb.use(ammo);
    const ammoVault = await honeycomb
      .currency()
      .create()
      .holderAccount(honeycomb.missions().address);
    await ammoVault.mint(10_000 * 1_000_000_000);

    honeycomb.use(currentCurrency);

    await honeycomb
      .missions()
      .create()
      .mission({
        name: "Quick Patrol",
        cost: {
          address: currentCurrency.address,
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
            min: 100 * 1_000_000_000,
            max: 1000 * 1_000_000_000,
            rewardType: {
              __kind: "Currency",
              address: bounty.address,
            },
          },
          {
            min: 10 * 1_000_000_000,
            max: 100 * 1_000_000_000,
            rewardType: {
              __kind: "Currency",
              address: food.address,
            },
          },
          {
            min: 10 * 1_000_000_000,
            max: 20 * 1_000_000_000,
            rewardType: {
              __kind: "Currency",
              address: ammo.address,
            },
          },
        ],
      });
  });

  it("Fetch or Create user/profile", async () => {
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
    expect(availableNfts.length).toBe(totalNfts);
    await honeycomb.staking().stake(availableNfts);
    const stakedNfts = await honeycomb.staking().fetch().stakedNfts();
    expect(stakedNfts.length).toBe(totalNfts);
  });

  it.skip("Participate on Mission", async () => {
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

  it.skip("Recall from missions", async () => {
    await wait(1);
    const participations = await honeycomb.missions().fetch().participations();
    const mission = await honeycomb.missions().mission("QuickPost");
    await mission.recall(participations, { skipPreflight: true });
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
