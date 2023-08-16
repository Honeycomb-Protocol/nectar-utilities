import fs from "fs";
import * as web3 from "@solana/web3.js";
import { Metaplex, Nft, keypairIdentity } from "@metaplex-foundation/js";
import { TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import {
  Honeycomb,
  HoneycombProject,
  identityModule,
  toHoneycombFile,
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
  const totalNfts = 1;
  const totalcNfts = 1;

  let honeycomb: Honeycomb;
  let metaplex: Metaplex;
  let collection: Nft;
  let nfts: Nft[] = [];
  // let cNfts: Metadata[];
  // let factionsArray: { faction: string; mint: web3.PublicKey }[] = [];
  // let factionsMerkleTree: MerkleTree;
  let mainVault: HplHolderAccount;

  it.skip("Temp", async () => {
    const connection = new web3.Connection(
      "https://rpc.hellomoon.io/40f1e769-beb0-4a00-8f11-e9f19e1a576d"
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

    // const newCollection = new web3.PublicKey(
    //   "BwwjnxTHeVWdFieDWmoezta19q1NiwcNNyoon9S38bkM"
    // );
    // await honeycomb.project().addCriteria({
    //   collection: newCollection,
    // });

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

      const image = fs.readFileSync("./temp/bounty.png");
      const ImageCost = await honeycomb
        .storage()
        .getUploadPriceForBytes(image.byteLength);
      await bundlr.fund(ImageCost.basisPoints.toNumber());
      const imageUri = await honeycomb
        .storage()
        .upload(toHoneycombFile(image, "bounty.png"));

      const uriMetadata = {
        name: "Bounty",
        symbol: "BTY",
        description: "Sol Patrol In-Game Currency",
        image: imageUri,
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

      const image = fs.readFileSync("./temp/ammo.png");
      const ImageCost = await honeycomb
        .storage()
        .getUploadPriceForBytes(image.byteLength);
      await bundlr.fund(ImageCost.basisPoints.toNumber());
      const imageUri = await honeycomb
        .storage()
        .upload(toHoneycombFile(image, "ammo.png"));

      const uriMetadata = {
        name: "Ammo",
        symbol: "AMMO",
        description: "Sol Patrol In-Game Currency",
        image: imageUri,
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

      const image = fs.readFileSync("./temp/heal.png");
      const ImageCost = await honeycomb
        .storage()
        .getUploadPriceForBytes(image.byteLength);
      await bundlr.fund(ImageCost.basisPoints.toNumber());
      const imageUri = await honeycomb
        .storage()
        .upload(toHoneycombFile(image, "food.png"));

      const uriMetadata = {
        name: "Food",
        symbol: "FOOD",
        description: "Sol Patrol In-Game Currency",
        image: imageUri,
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

      const image = fs.readFileSync("./temp/gem.png");
      const ImageCost = await honeycomb
        .storage()
        .getUploadPriceForBytes(image.byteLength);
      await bundlr.fund(ImageCost.basisPoints.toNumber());
      const imageUri = await honeycomb
        .storage()
        .upload(toHoneycombFile(image, "gems.png"));

      const uriMetadata = {
        name: "Gems",
        symbol: "GEMS",
        description: "Sol Patrol In-Game Currency",
        image: imageUri,
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
    // const staking = honeycomb.staking() as unknown as NectarStaking;
    // if (!staking) {
    //   honeycomb.use(
    //     await NectarStaking.new(honeycomb, {
    //       args: {
    //         name: "Sol Patrol Staking",
    //         rewardsPerDuration: (25 * 1_000_000_000) / 86400,
    //         rewardsDuration: 1,
    //         maxRewardsDuration: null,
    //         minStakeDuration: null,
    //         cooldownDuration: null,
    //         resetStakeDuration: false,
    //         startTime: Date.now(),
    //         endTime: null,
    //         lockType: LockType.Freeze,
    //       },
    //       project: honeycomb.project(),
    //       currency: honeycomb.currency(),
    //       collections: [collection.mint.address],
    //       multipliersDecimals: 3,
    //       multipliers: [
    //         {
    //           multiplierType: {
    //             __kind: "NFTCount",
    //             minCount: 3,
    //           },
    //           value: 1400,
    //         },
    //         {
    //           multiplierType: {
    //             __kind: "NFTCount",
    //             minCount: 5,
    //           },
    //           value: 1800,
    //         },
    //       ],
    //     })
    //   );
    // }

    // await staking.updatePool({
    //   args: {
    //     name: null,
    //     rewardsPerDuration: null,
    //     rewardsDuration: null,
    //     maxRewardsDuration: null,
    //     minStakeDuration: null,
    //     cooldownDuration: null,
    //     resetStakeDuration: null,
    //     startTime: null,
    //     endTime: null,
    //   },
    //   currency: bounty.address,
    //   collection: newCollection,
    // });

    // // Migrate NFT to NFTv1
    // const nftsRaw = await NFT.gpaBuilder()
    //   .run(honeycomb.connection)
    //   .then((nfts) =>
    //     (
    //       nfts
    //         .map((nft) => {
    //           try {
    //             return [nft.pubkey, NFT.fromAccountInfo(nft.account)[0]];
    //           } catch {
    //             return null;
    //           }
    //         })
    //         .filter((x) => !!x) as [web3.PublicKey, NFT][]
    //     ).filter((x) => !x[1].staker.equals(web3.PublicKey.default))
    //   );

    // const mx = new Metaplex(honeycomb.connection);
    // const nfts: [web3.PublicKey, StakedNft][] = await mx
    //   .nfts()
    //   .findAllByMintList({ mints: nftsRaw.map((x) => x[1].mint) })
    //   .then((metaplexNfts) => {
    //     return (
    //       metaplexNfts.filter((x) => !!x && x.model == "metadata") as Metadata[]
    //     ).map((nft) => {
    //       const found = nftsRaw.find((x) =>
    //         x[1].mint.equals(nft.mintAddress)
    //       ) as [web3.PublicKey, NFT];
    //       return [
    //         found[0],
    //         {
    //           ...nft,
    //           ...found[1],
    //         },
    //       ] as [web3.PublicKey, StakedNft];
    //     });
    //   });
    // console.log("NFTS", nfts.length);
    // let stakers: { [key: string]: Staker } = {};
    // for (let nft of nfts) {
    //   const stakingPool = Object.values(honeycomb._stakings).find((s) =>
    //     s.address.equals(nft[1].stakingPool)
    //   );
    //   if (!stakingPool) continue;

    //   const stakerKey = nft[1].staker.toString();
    //   if (!stakers[stakerKey]) {
    //     stakers[stakerKey] = await Staker.fromAccountAddress(
    //       honeycomb.connection,
    //       nft[1].staker
    //     );
    //   }
    //   const staker = stakers[stakerKey];

    //   const [nftTemp] = web3.PublicKey.findProgramAddressSync(
    //     [
    //       Buffer.from("nft-temp"),
    //       nft[1].mint.toBuffer(),
    //       stakingPool.address.toBuffer(),
    //     ],
    //     stakingPool.programId
    //   );

    //   const [vaultHolderAccount] = holderAccountPda(
    //     stakingPool.address,
    //     stakingPool.currency().mint.address
    //   );
    //   const [vaultTokenAccount] = tokenAccountPda(
    //     stakingPool.address,
    //     stakingPool.currency().mint.address,
    //     undefined,
    //     CURRENCY_MANAGER_ID
    //   );

    //   const [holderAccount] = holderAccountPda(
    //     staker.wallet,
    //     stakingPool.currency().mint.address
    //   );
    //   const preInstructions: web3.TransactionInstruction[] = [];

    //   let tokenAccount: web3.PublicKey;
    //   try {
    //     tokenAccount = (
    //       await HolderAccount.fromAccountAddress(
    //         honeycomb.connection,
    //         holderAccount
    //       )
    //     ).tokenAccount;
    //   } catch {
    //     tokenAccount = getAssociatedTokenAddressSync(
    //       stakingPool.currency().mint.address,
    //       staker.wallet
    //     );

    //     let wrap = false;

    //     if (stakingPool.currency().kind.__kind === "Wrapped") {
    //       try {
    //         await getAccount(honeycomb.connection, tokenAccount);
    //         wrap = true;
    //       } catch {}
    //     }

    //     preInstructions.push(
    //       wrap
    //         ? createWrapHolderAccountInstruction({
    //             project: stakingPool.currency().project().address,
    //             currency: stakingPool.currency().address,
    //             holderAccount,
    //             tokenAccount,
    //             mint: stakingPool.currency().mint.address,
    //             owner: staker.wallet,
    //             payer: honeycomb.identity().address,
    //             vault: VAULT,
    //             instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
    //             logWrapper: SPL_NOOP_PROGRAM_ID,
    //             clockSysvar: web3.SYSVAR_CLOCK_PUBKEY,
    //             associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    //           })
    //         : createCreateHolderAccountInstruction({
    //             project: stakingPool.currency().project().address,
    //             currency: stakingPool.currency().address,
    //             holderAccount,
    //             tokenAccount,
    //             mint: stakingPool.currency().mint.address,
    //             owner: staker.wallet,
    //             payer: honeycomb.identity().address,
    //             vault: VAULT,
    //             instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
    //             logWrapper: SPL_NOOP_PROGRAM_ID,
    //             clockSysvar: web3.SYSVAR_CLOCK_PUBKEY,
    //             associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
    //           })
    //     );
    //   }

    //   const instructions = [
    //     ...preInstructions,

    //     createDistributeRewardsInstruction({
    //       project: stakingPool.project().address,
    //       vault: VAULT,
    //       stakingPool: stakingPool.address,
    //       multipliers:
    //         (await stakingPool.multipliers()).address || stakingPool.programId,
    //       nft: nft[0],
    //       currency: stakingPool.currency().address,
    //       mint: stakingPool.currency().mint.address,
    //       vaultHolderAccount,
    //       vaultTokenAccount,
    //       holderAccount,
    //       tokenAccount,
    //       staker: nft[1].staker,
    //       wallet: staker.wallet,
    //       authority: honeycomb.identity().address,
    //       clock: web3.SYSVAR_CLOCK_PUBKEY,
    //       currencyManagerProgram: CURRENCY_MANAGER_ID,
    //       instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
    //       logWrapper: SPL_NOOP_PROGRAM_ID,
    //     }),
    //     createMigrateNftPart1Instruction({
    //       project: stakingPool.project().address,
    //       stakingPool: stakingPool.address,
    //       nft: nft[0],
    //       nftTemp,
    //       authority: honeycomb.identity().address,
    //     }),
    //     createMigrateNftPart2Instruction({
    //       project: stakingPool.project().address,
    //       stakingPool: stakingPool.address,
    //       nft: nft[0],
    //       nftTemp,
    //       authority: honeycomb.identity().address,
    //     }),
    //   ];

    //   try {
    //     const ctx = await new Operation(honeycomb, instructions).send({
    //       skipPreflight: false,
    //     });
    //     console.log("Signature", ctx.signature);
    //   } catch (e) {
    //     console.dir(e);
    //   }
    // }

    // honeycomb.staking()
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
    // if (!honeycomb._missions) {
    //   const collections = [];
    //   honeycomb.use(
    //     await NectarMissions.new(honeycomb, {
    //       args: {
    //         name: "Sol Patrol",
    //         factionsMerkleRoot: Array(32).fill(0),
    //         collections,
    //       },
    //     })
    //   );
    // }

    // console.log("UPDATING MISSIONS");
    // await honeycomb.missions().update(
    //   {
    //     factionsMerkleRoot: Array(32).fill(0),
    //     collection: honeycomb.project().collections[staking.collections[0]],
    //   },
    //   { skipPreflight: true }
    // );

    // console.log("StakingCollectionn", staking.collections, staking.creators);
    // console.log(
    //   "MissionCollectionn",
    //   honeycomb.missions().collections,
    //   honeycomb.missions().creators
    // );

    // const missions = await honeycomb.missions().missions();

    // // Night Patrol - 3 hr
    // // Cost in $BAIL: Zero
    // // Duration: 180 min
    // // Bounty yield: 2
    // // XP awarded: 1  point
    // // Resource 1 (Ammo):  1
    // // Resource 2 (Food): 1
    // // Resource 3 (Gems): 0
    // // $BAIL reward: 0 $BAIL
    // if (!missions.find((m) => m.name === "Night Patrol")) {
    //   await honeycomb
    //     .missions()
    //     .create()
    //     .mission({
    //       name: "Night Patrol",
    //       cost: {
    //         address: bail.address,
    //         amount: 0 * 1_000_000_000,
    //       },
    //       duration: 3 * 3600,
    //       minXp: 0,
    //       rewards: [
    //         {
    //           min: 2 * 1_000_000_000,
    //           max: 2 * 1_000_000_000,
    //           rewardType: {
    //             __kind: "Currency",
    //             address: bounty.address,
    //           },
    //         },
    //         {
    //           min: 1,
    //           max: 1,
    //           rewardType: {
    //             __kind: "Xp",
    //           },
    //         },
    //         {
    //           min: 1 * 1_000_000_000,
    //           max: 1 * 1_000_000_000,
    //           rewardType: {
    //             __kind: "Currency",
    //             address: ammo.address,
    //           },
    //         },
    //         {
    //           min: 1 * 1_000_000_000,
    //           max: 1 * 1_000_000_000,
    //           rewardType: {
    //             __kind: "Currency",
    //             address: food.address,
    //           },
    //         },
    //         {
    //           min: 0 * 1_000_000_000,
    //           max: 0 * 1_000_000_000,
    //           rewardType: {
    //             __kind: "Currency",
    //             address: gems.address,
    //           },
    //         },
    //         {
    //           min: 0 * 1_000_000_000,
    //           max: 0 * 1_000_000_000,
    //           rewardType: {
    //             __kind: "Currency",
    //             address: bail.address,
    //           },
    //         },
    //       ],
    //     });
    // }

    // // Investigate - 12 hours
    // // Cost in $BAIL: 500 $BAIL
    // // Duration: 12 hours
    // // Bounty yield: 2.5 - 10
    // // XP awarded: 6 - 10 points
    // // Resource 1 (Ammo): 2
    // // Resource 2 (Food): 5
    // // Resource 3 (Gems): 0
    // // $BAIL reward: 0 - 100 $BAIL
    // if (!missions.find((m) => m.name === "Investigate")) {
    //   await honeycomb
    //     .missions()
    //     .create()
    //     .mission({
    //       name: "Investigate",
    //       cost: {
    //         address: bail.address,
    //         amount: 500 * 1_000_000_000,
    //       },
    //       duration: 12 * 3600,
    //       minXp: 0,
    //       rewards: [
    //         {
    //           min: 2.5 * 1_000_000_000,
    //           max: 10 * 1_000_000_000,
    //           rewardType: {
    //             __kind: "Currency",
    //             address: bounty.address,
    //           },
    //         },
    //         {
    //           min: 6,
    //           max: 10,
    //           rewardType: {
    //             __kind: "Xp",
    //           },
    //         },
    //         {
    //           min: 2 * 1_000_000_000,
    //           max: 2 * 1_000_000_000,
    //           rewardType: {
    //             __kind: "Currency",
    //             address: ammo.address,
    //           },
    //         },
    //         {
    //           min: 5 * 1_000_000_000,
    //           max: 5 * 1_000_000_000,
    //           rewardType: {
    //             __kind: "Currency",
    //             address: food.address,
    //           },
    //         },
    //         {
    //           min: 0 * 1_000_000_000,
    //           max: 0 * 1_000_000_000,
    //           rewardType: {
    //             __kind: "Currency",
    //             address: gems.address,
    //           },
    //         },
    //         {
    //           min: 0 * 1_000_000_000,
    //           max: 100 * 1_000_000_000,
    //           rewardType: {
    //             __kind: "Currency",
    //             address: bail.address,
    //           },
    //         },
    //       ],
    //     });
    // }

    // // Arrest - 12 hours
    // // Cost in $BAIL: 500 $BAIL
    // // Duration: 12 hours
    // // Bounty yield: 1 - 10
    // // XP awarded: 10 - 16 points
    // // Resource 1 (Ammo): 3
    // // Resource 2 (Food): 3
    // // Resource 3 (Gems): 0
    // // $BAIL reward: 0 -  100 $BAIL
    // if (!missions.find((m) => m.name === "Arrest")) {
    //   await honeycomb
    //     .missions()
    //     .create()
    //     .mission({
    //       name: "Arrest",
    //       cost: {
    //         address: bail.address,
    //         amount: 500 * 1_000_000_000,
    //       },
    //       duration: 12 * 3600,
    //       minXp: 0,
    //       rewards: [
    //         {
    //           min: 1 * 1_000_000_000,
    //           max: 10 * 1_000_000_000,
    //           rewardType: {
    //             __kind: "Currency",
    //             address: bounty.address,
    //           },
    //         },
    //         {
    //           min: 10,
    //           max: 16,
    //           rewardType: {
    //             __kind: "Xp",
    //           },
    //         },
    //         {
    //           min: 3 * 1_000_000_000,
    //           max: 3 * 1_000_000_000,
    //           rewardType: {
    //             __kind: "Currency",
    //             address: ammo.address,
    //           },
    //         },
    //         {
    //           min: 3 * 1_000_000_000,
    //           max: 3 * 1_000_000_000,
    //           rewardType: {
    //             __kind: "Currency",
    //             address: food.address,
    //           },
    //         },
    //         {
    //           min: 0 * 1_000_000_000,
    //           max: 0 * 1_000_000_000,
    //           rewardType: {
    //             __kind: "Currency",
    //             address: gems.address,
    //           },
    //         },
    //         {
    //           min: 0 * 1_000_000_000,
    //           max: 100 * 1_000_000_000,
    //           rewardType: {
    //             __kind: "Currency",
    //             address: bail.address,
    //           },
    //         },
    //       ],
    //     });
    // }

    // // Combat - 2 Days (Level 3)
    // // Cost in $BAIL: 1500 $BAIL
    // // Duration: 48 hours
    // // Bounty yield: 10 - 30
    // // XP awarded: 25 - 50 points
    // // Resource 1 (Ammo): 15
    // // Resource 2 (Food): 25
    // // Resource 3 (Gems): 1
    // // $BAIL reward: 50 - 300 $BAIL
    // if (!missions.find((m) => m.name === "Combat")) {
    //   await honeycomb
    //     .missions()
    //     .create()
    //     .mission({
    //       name: "Combat",
    //       cost: {
    //         address: bail.address,
    //         amount: 1500 * 1_000_000_000,
    //       },
    //       duration: 48 * 3600,
    //       minXp: 300,
    //       rewards: [
    //         {
    //           min: 10 * 1_000_000_000,
    //           max: 30 * 1_000_000_000,
    //           rewardType: {
    //             __kind: "Currency",
    //             address: bounty.address,
    //           },
    //         },
    //         {
    //           min: 25,
    //           max: 50,
    //           rewardType: {
    //             __kind: "Xp",
    //           },
    //         },
    //         {
    //           min: 15 * 1_000_000_000,
    //           max: 15 * 1_000_000_000,
    //           rewardType: {
    //             __kind: "Currency",
    //             address: ammo.address,
    //           },
    //         },
    //         {
    //           min: 25 * 1_000_000_000,
    //           max: 25 * 1_000_000_000,
    //           rewardType: {
    //             __kind: "Currency",
    //             address: food.address,
    //           },
    //         },
    //         {
    //           min: 1 * 1_000_000_000,
    //           max: 1 * 1_000_000_000,
    //           rewardType: {
    //             __kind: "Currency",
    //             address: gems.address,
    //           },
    //         },
    //         {
    //           min: 50 * 1_000_000_000,
    //           max: 300 * 1_000_000_000,
    //           rewardType: {
    //             __kind: "Currency",
    //             address: bail.address,
    //           },
    //         },
    //       ],
    //     });
    // }

    // // Quick Patrol - 0.25 hr
    // // Cost in $BAIL: 150
    // // Duration: 15 min
    // // Bounty yield: 1
    // // XP awarded: 0  point
    // // Resource 1 (Ammo):  1
    // // Resource 2 (Food): 1
    // // Resource 3 (Gems): 0
    // // $BAIL reward: 0 $BAIL
    // if (!missions.find((m) => m.name === "Quick Patrol")) {
    //   await honeycomb
    //     .missions()
    //     .create()
    //     .mission({
    //       name: "Quick Patrol",
    //       cost: {
    //         address: bail.address,
    //         amount: 150 * 1_000_000_000,
    //       },
    //       duration: 15 * 60,
    //       minXp: 0,
    //       rewards: [
    //         {
    //           min: 1 * 1_000_000_000,
    //           max: 1 * 1_000_000_000,
    //           rewardType: {
    //             __kind: "Currency",
    //             address: bounty.address,
    //           },
    //         },
    //         {
    //           min: 0,
    //           max: 0,
    //           rewardType: {
    //             __kind: "Xp",
    //           },
    //         },
    //         {
    //           min: 1 * 1_000_000_000,
    //           max: 1 * 1_000_000_000,
    //           rewardType: {
    //             __kind: "Currency",
    //             address: ammo.address,
    //           },
    //         },
    //         {
    //           min: 1 * 1_000_000_000,
    //           max: 1 * 1_000_000_000,
    //           rewardType: {
    //             __kind: "Currency",
    //             address: food.address,
    //           },
    //         },
    //         {
    //           min: 0 * 1_000_000_000,
    //           max: 0 * 1_000_000_000,
    //           rewardType: {
    //             __kind: "Currency",
    //             address: gems.address,
    //           },
    //         },
    //         {
    //           min: 0 * 1_000_000_000,
    //           max: 0 * 1_000_000_000,
    //           rewardType: {
    //             __kind: "Currency",
    //             address: bail.address,
    //           },
    //         },
    //       ],
    //     });
    // }

    // // Casino Heist - 1 hr
    // // Cost in $BAIL: 0
    // // Duration: 60 min
    // // Bounty yield: 0 - 1
    // // XP awarded: 0  point
    // // Resource 1 (Ammo):  1
    // // Resource 2 (Food): 0
    // // Resource 3 (Gems): 0
    // // $BAIL reward: 0 $BAIL
    // if (!missions.find((m) => m.name === "Casino Heist")) {
    //   await honeycomb
    //     .missions()
    //     .create()
    //     .mission({
    //       name: "Casino Heist",
    //       cost: {
    //         address: bail.address,
    //         amount: 0 * 1_000_000_000,
    //       },
    //       duration: 3600,
    //       minXp: 0,
    //       rewards: [
    //         {
    //           min: 0 * 1_000_000_000,
    //           max: 1 * 1_000_000_000,
    //           rewardType: {
    //             __kind: "Currency",
    //             address: bounty.address,
    //           },
    //         },
    //         {
    //           min: 0,
    //           max: 0,
    //           rewardType: {
    //             __kind: "Xp",
    //           },
    //         },
    //         {
    //           min: 1 * 1_000_000_000,
    //           max: 1 * 1_000_000_000,
    //           rewardType: {
    //             __kind: "Currency",
    //             address: ammo.address,
    //           },
    //         },
    //         {
    //           min: 0 * 1_000_000_000,
    //           max: 0 * 1_000_000_000,
    //           rewardType: {
    //             __kind: "Currency",
    //             address: food.address,
    //           },
    //         },
    //         {
    //           min: 0 * 1_000_000_000,
    //           max: 0 * 1_000_000_000,
    //           rewardType: {
    //             __kind: "Currency",
    //             address: gems.address,
    //           },
    //         },
    //         {
    //           min: 0 * 1_000_000_000,
    //           max: 0 * 1_000_000_000,
    //           rewardType: {
    //             __kind: "Currency",
    //             address: bail.address,
    //           },
    //         },
    //       ],
    //     });
    // }

    // for (let mission of await honeycomb.missions().missions()) {
    //   const config = (() => {
    //     switch (mission.name) {
    //       case "Quick Patrol":
    //         return {
    //           skip: false,
    //           costAmount: 1,
    //           minXp: 0,
    //           duration: 15 * 60,
    //           bounty: { skip: false, min: 0, max: 1 },
    //           ammo: { skip: false, min: 1, max: 1 },
    //           food: { skip: false, min: 1, max: 1 },
    //           gems: { skip: false, min: 0, max: 0 },
    //           bail: { skip: false, min: 0, max: 0 },
    //         };
    //       case "Casino Heist":
    //         return {
    //           skip: false,
    //           costAmount: 0,
    //           minXp: 0,
    //           duration: 1 * 3600,
    //           bounty: { skip: false, min: 0, max: 1 },
    //           ammo: { skip: false, min: 1, max: 1 },
    //           food: { skip: false, min: 0, max: 0 },
    //           gems: { skip: false, min: 0, max: 0 },
    //           bail: { skip: false, min: 0, max: 0 },
    //         };
    //       case "Night Patrol":
    //         return {
    //           skip: false,
    //           costAmount: 0,
    //           minXp: 0,
    //           duration: 3 * 3600,
    //           bounty: { skip: false, min: 2, max: 2 },
    //           ammo: { skip: false, min: 1, max: 1 },
    //           food: { skip: false, min: 1, max: 1 },
    //           gems: { skip: false, min: 0, max: 0 },
    //           bail: { skip: false, min: 0, max: 0 },
    //         };
    //       case "Investigate":
    //         return {
    //           skip: false,
    //           costAmount: 3,
    //           minXp: 0,
    //           duration: 12 * 3600,
    //           bounty: { skip: false, min: 2, max: 10 },
    //           ammo: { skip: false, min: 2, max: 2 },
    //           food: { skip: false, min: 5, max: 5 },
    //           gems: { skip: false, min: 0, max: 0 },
    //           bail: { skip: false, min: 0, max: 100 },
    //         };
    //       case "Arrest":
    //         return {
    //           skip: false,
    //           costAmount: 3,
    //           minXp: 0,
    //           duration: 12 * 3600,
    //           bounty: { skip: false, min: 1, max: 10 },
    //           ammo: { skip: false, min: 3, max: 3 },
    //           food: { skip: false, min: 3, max: 3 },
    //           gems: { skip: false, min: 0, max: 0 },
    //           bail: { skip: false, min: 0, max: 100 },
    //         };
    //       case "Combat":
    //         return {
    //           skip: false,
    //           costAmount: 10,
    //           minXp: 0,
    //           duration: 48 * 3600,
    //           bounty: { skip: false, min: 10, max: 30 },
    //           ammo: { skip: false, min: 15, max: 15 },
    //           food: { skip: false, min: 25, max: 25 },
    //           gems: { skip: false, min: 1, max: 1 },
    //           bail: { skip: false, min: 50, max: 300 },
    //         };

    //       default:
    //         return { skip: true, costAmount: 0, minXp: 0, duration: 0 };
    //     }
    //   })();

    //   if (config.skip) continue;

    //   // await mission.update({
    //   //   name: null,
    //   //   minXp: config.minXp,
    //   //   cost: {
    //   //     address: bounty.address,
    //   //     amount: config.costAmount * 10 ** bounty.mint.decimals,
    //   //   },
    //   //   duration: config.duration,
    //   //   addReward: null,
    //   //   removeRewardIndex: null,
    //   // });

    //   // console.log(mission.name, "Rewards", mission.rewards.length);

    //   // const coins = {
    //   //   bail: bail,
    //   //   bounty: bounty,
    //   //   ammo: ammo,
    //   //   food: food,
    //   //   gems: gems,
    //   // };
    //   // const { signature } = await new Operation(honeycomb, [
    //   //   // ComputeBudgetProgram.setComputeUnitLimit({
    //   //   //   units: 400_000,
    //   //   // }),
    //   //   createUpdateMissionInstruction(
    //   //     {
    //   //       project: mission.pool().project().address,
    //   //       missionPool: mission.pool().address,
    //   //       mission: mission.address,
    //   //       delegateAuthority: HPL_NECTAR_MISSIONS_PROGRAM,
    //   //       authority: honeycomb.identity().address,
    //   //       payer: honeycomb.identity().address,
    //   //       vault: VAULT,
    //   //       rentSysvar: web3.SYSVAR_RENT_PUBKEY,
    //   //       instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
    //   //     },
    //   //     {
    //   //       args: {
    //   //         name: null,
    //   //         minXp: null,
    //   //         cost: null,
    //   //         duration: null,
    //   //         removeAllRewards: true,
    //   //         addRewards: Object.entries(coins).map(([name, coin]) => ({
    //   //           rewardType: {
    //   //             __kind: "Currency",
    //   //             address: coin.address,
    //   //           },
    //   //           min: config[name].min * 10 ** coin.mint.decimals,
    //   //           max: config[name].max * 10 ** coin.mint.decimals,
    //   //         })),
    //   //         removeRewardIndices: null,
    //   //       },
    //   //     }
    //   //   ),
    //   // ]).send();
    //   // console.log("Set Rewards from", mission.name, signature);

    //   // if (mission.rewards.length) {
    //   //   const { signature: removeSignature } = await new Operation(honeycomb, [
    //   //     // ComputeBudgetProgram.setComputeUnitLimit({
    //   //     //   units: 400_000,
    //   //     // }),
    //   //     ...mission.rewards.map((_, i) =>
    //   //       createUpdateMissionInstruction(
    //   //         {
    //   //           project: mission.pool().project().address,
    //   //           missionPool: mission.pool().address,
    //   //           mission: mission.address,
    //   //           delegateAuthority: HPL_NECTAR_MISSIONS_PROGRAM,
    //   //           authority: honeycomb.identity().address,
    //   //           payer: honeycomb.identity().address,
    //   //           vault: VAULT,
    //   //           rentSysvar: web3.SYSVAR_RENT_PUBKEY,
    //   //           instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
    //   //         },
    //   //         {
    //   //           args: {
    //   //             name: null,
    //   //             minXp: null,
    //   //             cost: null,
    //   //             duration: null,
    //   //             addReward: null,
    //   //             removeRewardIndex: i,
    //   //           },
    //   //         }
    //   //       )
    //   //     ),
    //   //   ]).send();
    //   //   console.log("Removed All Rewards from", mission.name, removeSignature);
    //   // }

    //   // if (mission.rewards.length === 0) {
    //   //   const coins = {
    //   //     bail: bail,
    //   //     bounty: bounty,
    //   //     ammo: ammo,
    //   //     food: food,
    //   //     gems: gems,
    //   //   };
    //   //   const { signature: addSignature } = await new Operation(honeycomb, [
    //   //     // ComputeBudgetProgram.setComputeUnitLimit({
    //   //     //   units: 400_000,
    //   //     // }),
    //   //     ...Object.entries(coins).map(([name, coin]) =>
    //   //       createUpdateMissionInstruction(
    //   //         {
    //   //           project: mission.pool().project().address,
    //   //           missionPool: mission.pool().address,
    //   //           mission: mission.address,
    //   //           delegateAuthority: HPL_NECTAR_MISSIONS_PROGRAM,
    //   //           authority: honeycomb.identity().address,
    //   //           payer: honeycomb.identity().address,
    //   //           vault: VAULT,
    //   //           rentSysvar: web3.SYSVAR_RENT_PUBKEY,
    //   //           instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
    //   //         },
    //   //         {
    //   //           args: {
    //   //             name: null,
    //   //             minXp: null,
    //   //             cost: null,
    //   //             duration: null,
    //   //             addReward: {
    //   //               rewardType: {
    //   //                 __kind: "Currency",
    //   //                 address: coin.address,
    //   //               },
    //   //               min: config[name].min * 10 ** coin.mint.decimals,
    //   //               max: config[name].max * 10 ** coin.mint.decimals,
    //   //             },
    //   //             removeRewardIndex: null,
    //   //           },
    //   //         }
    //   //       )
    //   //     ),
    //   //   ]).send();
    //   //   console.log("Added All Rewards to", mission.name, addSignature);
    //   // }

    //   // if (config.bail && !config.bail.skip) {
    //   //   const bailT = bail;
    //   //   const bailIndex = mission.rewards.findIndex(
    //   //     (r) => r.isCurrency() && r.currency().address.equals(bailT.address)
    //   //   );

    //   //   if (bailIndex >= 0) {
    //   //     const { signature } = await new Operation(honeycomb, [
    //   //       // ComputeBudgetProgram.setComputeUnitLimit({
    //   //       //   units: 400_000,
    //   //       // }),
    //   //       createUpdateMissionInstruction(
    //   //         {
    //   //           project: mission.pool().project().address,
    //   //           missionPool: mission.pool().address,
    //   //           mission: mission.address,
    //   //           delegateAuthority: HPL_NECTAR_MISSIONS_PROGRAM,
    //   //           authority: honeycomb.identity().address,
    //   //           payer: honeycomb.identity().address,
    //   //           vault: VAULT,
    //   //           rentSysvar: web3.SYSVAR_RENT_PUBKEY,
    //   //           instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
    //   //         },
    //   //         {
    //   //           args: {
    //   //             name: null,
    //   //             minXp: null,
    //   //             cost: null,
    //   //             duration: null,
    //   //             addReward: null,
    //   //             removeRewardIndex: bailIndex,
    //   //           },
    //   //         }
    //   //       ),

    //   //       createUpdateMissionInstruction(
    //   //         {
    //   //           project: mission.pool().project().address,
    //   //           missionPool: mission.pool().address,
    //   //           mission: mission.address,
    //   //           delegateAuthority: HPL_NECTAR_MISSIONS_PROGRAM,
    //   //           authority: honeycomb.identity().address,
    //   //           payer: honeycomb.identity().address,
    //   //           vault: VAULT,
    //   //           rentSysvar: web3.SYSVAR_RENT_PUBKEY,
    //   //           instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
    //   //         },
    //   //         {
    //   //           args: {
    //   //             name: null,
    //   //             minXp: null,
    //   //             cost: null,
    //   //             duration: null,
    //   //             addReward: {
    //   //               rewardType: {
    //   //                 __kind: "Currency",
    //   //                 address: bailT.address,
    //   //               },
    //   //               min: config.bail.min * 10 ** bail.mint.decimals,
    //   //               max: config.bail.max * 10 ** bail.mint.decimals,
    //   //             },
    //   //             removeRewardIndex: null,
    //   //           },
    //   //         }
    //   //       ),
    //   //     ]).send();
    //   //     console.log("Bail update for", mission.name, signature);
    //   //   }
    //   // }

    //   // if (config.bounty && !config.bounty.skip) {
    //   //   const bountyT = bounty;
    //   //   const bountyIndex = mission.rewards.findIndex(
    //   //     (r) => r.isCurrency() && r.currency().address.equals(bountyT.address)
    //   //   );

    //   //   if (bountyIndex >= 0) {
    //   //     const { signature } = await new Operation(honeycomb, [
    //   //       // ComputeBudgetProgram.setComputeUnitLimit({
    //   //       //   units: 400_000,
    //   //       // }),
    //   //       createUpdateMissionInstruction(
    //   //         {
    //   //           project: mission.pool().project().address,
    //   //           missionPool: mission.pool().address,
    //   //           mission: mission.address,
    //   //           delegateAuthority: HPL_NECTAR_MISSIONS_PROGRAM,
    //   //           authority: honeycomb.identity().address,
    //   //           payer: honeycomb.identity().address,
    //   //           vault: VAULT,
    //   //           rentSysvar: web3.SYSVAR_RENT_PUBKEY,
    //   //           instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
    //   //         },
    //   //         {
    //   //           args: {
    //   //             name: null,
    //   //             minXp: null,
    //   //             cost: null,
    //   //             duration: null,
    //   //             addReward: null,
    //   //             removeRewardIndex: bountyIndex,
    //   //           },
    //   //         }
    //   //       ),

    //   //       createUpdateMissionInstruction(
    //   //         {
    //   //           project: mission.pool().project().address,
    //   //           missionPool: mission.pool().address,
    //   //           mission: mission.address,
    //   //           delegateAuthority: HPL_NECTAR_MISSIONS_PROGRAM,
    //   //           authority: honeycomb.identity().address,
    //   //           payer: honeycomb.identity().address,
    //   //           vault: VAULT,
    //   //           rentSysvar: web3.SYSVAR_RENT_PUBKEY,
    //   //           instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
    //   //         },
    //   //         {
    //   //           args: {
    //   //             name: null,
    //   //             minXp: null,
    //   //             cost: null,
    //   //             duration: null,
    //   //             addReward: {
    //   //               rewardType: {
    //   //                 __kind: "Currency",
    //   //                 address: bountyT.address,
    //   //               },
    //   //               min: config.bounty.min * 10 ** bounty.mint.decimals,
    //   //               max: config.bounty.max * 10 ** bounty.mint.decimals,
    //   //             },
    //   //             removeRewardIndex: null,
    //   //           },
    //   //         }
    //   //       ),
    //   //     ]).send();
    //   //     console.log("Bounty update for", mission.name, signature);
    //   //   }
    //   // }

    //   // if (config.ammo && !config.ammo.skip) {
    //   //   const ammoT = ammo;
    //   //   const ammoIndex = mission.rewards.findIndex(
    //   //     (r) => r.isCurrency() && r.currency().address.equals(ammoT.address)
    //   //   );

    //   //   if (ammoIndex >= 0) {
    //   //     const { signature } = await new Operation(honeycomb, [
    //   //       // ComputeBudgetProgram.setComputeUnitLimit({
    //   //       //   units: 400_000,
    //   //       // }),
    //   //       createUpdateMissionInstruction(
    //   //         {
    //   //           project: mission.pool().project().address,
    //   //           missionPool: mission.pool().address,
    //   //           mission: mission.address,
    //   //           delegateAuthority: HPL_NECTAR_MISSIONS_PROGRAM,
    //   //           authority: honeycomb.identity().address,
    //   //           payer: honeycomb.identity().address,
    //   //           vault: VAULT,
    //   //           rentSysvar: web3.SYSVAR_RENT_PUBKEY,
    //   //           instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
    //   //         },
    //   //         {
    //   //           args: {
    //   //             name: null,
    //   //             minXp: null,
    //   //             cost: null,
    //   //             duration: null,
    //   //             addReward: null,
    //   //             removeRewardIndex: ammoIndex,
    //   //           },
    //   //         }
    //   //       ),

    //   //       createUpdateMissionInstruction(
    //   //         {
    //   //           project: mission.pool().project().address,
    //   //           missionPool: mission.pool().address,
    //   //           mission: mission.address,
    //   //           delegateAuthority: HPL_NECTAR_MISSIONS_PROGRAM,
    //   //           authority: honeycomb.identity().address,
    //   //           payer: honeycomb.identity().address,
    //   //           vault: VAULT,
    //   //           rentSysvar: web3.SYSVAR_RENT_PUBKEY,
    //   //           instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
    //   //         },
    //   //         {
    //   //           args: {
    //   //             name: null,
    //   //             minXp: null,
    //   //             cost: null,
    //   //             duration: null,
    //   //             addReward: {
    //   //               rewardType: {
    //   //                 __kind: "Currency",
    //   //                 address: ammoT.address,
    //   //               },
    //   //               min: config.ammo.min * 10 ** ammo.mint.decimals,
    //   //               max: config.ammo.max * 10 ** ammo.mint.decimals,
    //   //             },
    //   //             removeRewardIndex: null,
    //   //           },
    //   //         }
    //   //       ),
    //   //     ]).send();
    //   //     console.log("Ammo update for", mission.name, signature);
    //   //   }
    //   // }

    //   // if (config.food && !config.food.skip) {
    //   //   const foodT = food;
    //   //   const foodIndex = mission.rewards.findIndex(
    //   //     (r) => r.isCurrency() && r.currency().address.equals(foodT.address)
    //   //   );

    //   //   if (foodIndex >= 0) {
    //   //     const { signature } = await new Operation(honeycomb, [
    //   //       // ComputeBudgetProgram.setComputeUnitLimit({
    //   //       //   units: 400_000,
    //   //       // }),
    //   //       createUpdateMissionInstruction(
    //   //         {
    //   //           project: mission.pool().project().address,
    //   //           missionPool: mission.pool().address,
    //   //           mission: mission.address,
    //   //           delegateAuthority: HPL_NECTAR_MISSIONS_PROGRAM,
    //   //           authority: honeycomb.identity().address,
    //   //           payer: honeycomb.identity().address,
    //   //           vault: VAULT,
    //   //           rentSysvar: web3.SYSVAR_RENT_PUBKEY,
    //   //           instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
    //   //         },
    //   //         {
    //   //           args: {
    //   //             name: null,
    //   //             minXp: null,
    //   //             cost: null,
    //   //             duration: null,
    //   //             addReward: null,
    //   //             removeRewardIndex: foodIndex < 0 ? null : foodIndex,
    //   //           },
    //   //         }
    //   //       ),

    //   //       createUpdateMissionInstruction(
    //   //         {
    //   //           project: mission.pool().project().address,
    //   //           missionPool: mission.pool().address,
    //   //           mission: mission.address,
    //   //           delegateAuthority: HPL_NECTAR_MISSIONS_PROGRAM,
    //   //           authority: honeycomb.identity().address,
    //   //           payer: honeycomb.identity().address,
    //   //           vault: VAULT,
    //   //           rentSysvar: web3.SYSVAR_RENT_PUBKEY,
    //   //           instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
    //   //         },
    //   //         {
    //   //           args: {
    //   //             name: null,
    //   //             minXp: null,
    //   //             cost: null,
    //   //             duration: null,
    //   //             addReward:
    //   //               foodIndex >= 0 && config.food
    //   //                 ? {
    //   //                     rewardType: {
    //   //                       __kind: "Currency",
    //   //                       address: foodT.address,
    //   //                     },
    //   //                     min: config.food.min * 10 ** food.mint.decimals,
    //   //                     max: config.food.max * 10 ** food.mint.decimals,
    //   //                   }
    //   //                 : null,
    //   //             removeRewardIndex: null,
    //   //           },
    //   //         }
    //   //       ),
    //   //     ]).send();
    //   //     console.log("Food update for", mission.name, signature);
    //   //   }
    //   // }

    //   // if (config.gems && config.gems.skip) {
    //   //   const gemsT = gems;
    //   //   const gemsIndex = mission.rewards.findIndex(
    //   //     (r) => r.isCurrency() && r.currency().address.equals(gemsT.address)
    //   //   );

    //   //   if (gemsIndex >= 0) {
    //   //     const { signature } = await new Operation(honeycomb, [
    //   //       // ComputeBudgetProgram.setComputeUnitLimit({
    //   //       //   units: 400_000,
    //   //       // }),
    //   //       createUpdateMissionInstruction(
    //   //         {
    //   //           project: mission.pool().project().address,
    //   //           missionPool: mission.pool().address,
    //   //           mission: mission.address,
    //   //           delegateAuthority: HPL_NECTAR_MISSIONS_PROGRAM,
    //   //           authority: honeycomb.identity().address,
    //   //           payer: honeycomb.identity().address,
    //   //           vault: VAULT,
    //   //           rentSysvar: web3.SYSVAR_RENT_PUBKEY,
    //   //           instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
    //   //         },
    //   //         {
    //   //           args: {
    //   //             name: null,
    //   //             minXp: null,
    //   //             cost: null,
    //   //             duration: null,
    //   //             addReward: null,
    //   //             removeRewardIndex: gemsIndex < 0 ? null : gemsIndex,
    //   //           },
    //   //         }
    //   //       ),

    //   //       createUpdateMissionInstruction(
    //   //         {
    //   //           project: mission.pool().project().address,
    //   //           missionPool: mission.pool().address,
    //   //           mission: mission.address,
    //   //           delegateAuthority: HPL_NECTAR_MISSIONS_PROGRAM,
    //   //           authority: honeycomb.identity().address,
    //   //           payer: honeycomb.identity().address,
    //   //           vault: VAULT,
    //   //           rentSysvar: web3.SYSVAR_RENT_PUBKEY,
    //   //           instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
    //   //         },
    //   //         {
    //   //           args: {
    //   //             name: null,
    //   //             minXp: null,
    //   //             cost: null,
    //   //             duration: null,
    //   //             addReward:
    //   //               gemsIndex >= 0 && config.gems
    //   //                 ? {
    //   //                     rewardType: {
    //   //                       __kind: "Currency",
    //   //                       address: gemsT.address,
    //   //                     },
    //   //                     min: config.gems.min * 10 ** gems.mint.decimals,
    //   //                     max: config.gems.max * 10 ** gems.mint.decimals,
    //   //                   }
    //   //                 : null,
    //   //             removeRewardIndex: null,
    //   //           },
    //   //         }
    //   //       ),
    //   //     ]).send();
    //   //     console.log("Gems update for", mission.name, signature);
    //   //   }
    //   // }

    //   // console.log("Done", mission.name);
    // }

    // const vault = new web3.PublicKey(
    //   "7LUbP4BZQiopPposQUW7JBrKJ2vgrv7drjbTeFRAb5TS"
    // );
    // const vault = honeycomb.staking().address;
    // const vault = honeycomb.missions().address;
    // await bail
    //   .fetch()
    //   .holderAccount(vault)
    //   .catch((_) => (bail as HplCurrency).create().holderAccount(vault))
    //   .then((hA) => hA.fund(10_000 * 1_000_000_000, { skipPreflight: true }));

    // await bounty
    //   .fetch()
    //   .holderAccount(vault)
    //   .catch((_) => (bounty as HplCurrency).create().holderAccount(vault))
    //   .then((hA) => hA.mint(1_000_000 * 1_000_000_000));

    // await ammo
    //   .fetch()
    //   .holderAccount(vault)
    //   .catch((_) => (ammo as HplCurrency).create().holderAccount(vault))
    //   .then((hA) => hA.mint(1_000_000 * 1_000_000_000));

    // await food
    //   .fetch()
    //   .holderAccount(vault)
    //   .catch((_) => (food as HplCurrency).create().holderAccount(vault))
    //   .then((hA) => hA.mint(1_000_000 * 1_000_000_000));

    // await gems
    //   .fetch()
    //   .holderAccount(vault)
    //   .catch((_) => (gems as HplCurrency).create().holderAccount(vault))
    //   .then((hA) => hA.mint(1_000_000 * 1_000_000_000));
  });

  it("Prepare", async () => {
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

  it("Load Project", async () => {
    honeycomb.use(
      await HoneycombProject.fromAddress(
        honeycomb.connection,
        new web3.PublicKey("BCiLxBdVwfGimSA9ZQ5DwAdshc4ULXL5ouDbWBeK2WRV")
      )
    );
    await findProjectCurrencies(honeycomb.project());
  });

  it("Load/Create Staking Pool", async () => {
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

  it("Load/Create Mission Pool", async () => {
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

  it("Load/Create Mission", async () => {
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
    console.log("AvailaleNFTs", availableNfts);
    expect(availableNfts.length).toBe(totalNfts + totalcNfts);
    await honeycomb.staking().stake(availableNfts);
    const stakedNfts = await honeycomb.staking().fetch().stakedNfts();
    expect(stakedNfts.length).toBe(totalNfts + totalcNfts);
  });

  it("Participate on Mission", async () => {
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

  it("Recall from missions", async () => {
    await wait(1);
    const participations = await honeycomb.missions().participations();
    expect(participations.length).toBeGreaterThan(0);
    const mission = await honeycomb.missions().mission("Quick Patrol");
    await mission.recall(participations, { skipPreflight: true });
  });

  it.skip("Unstake NFTs", async () => {
    const stakedNfts = await honeycomb.staking().fetch().stakedNfts();
    expect(stakedNfts.length).toBe(totalNfts + totalcNfts);
    await honeycomb.staking().unstake(stakedNfts);
    const availableNfts = await honeycomb.staking().fetch().availableNfts();
    expect(availableNfts.length).toBe(totalNfts + totalcNfts);
  });
});
