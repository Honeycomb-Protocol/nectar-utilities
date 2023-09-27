import * as web3 from "@solana/web3.js";
import { Metaplex, Nft, keypairIdentity } from "@metaplex-foundation/js";
import { TokenStandard } from "@metaplex-foundation/mpl-token-metadata";
import {
  Honeycomb,
  HoneycombProject,
  KeypairLike,
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
import { createNewTree, getHoneycomb, mintOneCNFT, wait } from "./prepare";
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

  let adminHC: Honeycomb;
  let userHC: Honeycomb;
  let metaplex: Metaplex;
  let collection: Nft;
  let nfts: Nft[] = [];
  // let cNfts: Metadata[];
  // let factionsArray: { faction: string; mint: web3.PublicKey }[] = [];
  // let factionsMerkleTree: MerkleTree;
  let userHolderAccount: HplHolderAccount;

  // it.skip("TEMPP", async () => {
  //   const connection = new web3.Connection(
  //     "https://rpc.helius.xyz/?api-key=1f580922-6600-4db7-bf2d-94363b0b5626"
  //     // "https://lingering-newest-sheet.solana-devnet.quiknode.pro/fb6e6465df3955a06fd5ddec2e5b003896f56adb/"
  //   );
  //   const honeycomb = new Honeycomb(connection, { env: "main" }).use(
  //     await HoneycombProject.fromAddress(
  //       connection,
  //       new web3.PublicKey("7CKTHsJ3EZqChNf3XGt9ytdZXvSzDFWmrQJL3BCe4Ppw")
  //       // new web3.PublicKey("B73zK97zv3WQfvF1o4tZF23oWo7rBGqj5kd9k51mMhdk")
  //     )
  //   );
  //   console.log(honeycomb.project().authority.toString());
  //   // let a: any = "";
  //   // if (!a) return;
  //   honeycomb.use(identityModule(tryKeyOrGenerate()[0]));

  //   console.log(honeycomb.identity().address.toString());

  //   const nfts = (
  //     await NFTv1.gpaBuilder()
  //       .addFilter("accountDiscriminator", nFTv1Discriminator)
  //       .run(connection)
  //   )
  //     .map((n) => {
  //       try {
  //         return [n.pubkey, NFTv1.fromAccountInfo(n.account)[0]];
  //       } catch {
  //         return null;
  //       }
  //     })
  //     .filter((n) => !!n) as [web3.PublicKey, NFTv1][];
  //   console.log("Staked", nfts.length);
  //   console.log("pNFTs", nfts.filter((n) => !n[1].isCompressed).length);
  //   console.log("cNFTs", nfts.filter((n) => n[1].isCompressed).length);
  // });

  // it.skip("Temp", async () => {
  //   const connection = new web3.Connection(
  //     "https://rpc.helius.xyz/?api-key=1f580922-6600-4db7-bf2d-94363b0b5626"
  //     // "https://lingering-newest-sheet.solana-devnet.quiknode.pro/fb6e6465df3955a06fd5ddec2e5b003896f56adb/"
  //   );
  //   const honeycomb = new Honeycomb(connection, { env: "main" }).use(
  //     await HoneycombProject.fromAddress(
  //       connection,
  //       new web3.PublicKey("7CKTHsJ3EZqChNf3XGt9ytdZXvSzDFWmrQJL3BCe4Ppw")
  //       // new web3.PublicKey("B73zK97zv3WQfvF1o4tZF23oWo7rBGqj5kd9k51mMhdk")
  //     )
  //   );
  //   console.log(honeycomb.project().authority.toString());
  //   // let a: any = "";
  //   // if (!a) return;
  //   honeycomb.use(identityModule(tryKeyOrGenerate()[0]));

  //   console.log(honeycomb.identity().address.toString());

  //   // const balance = await honeycomb
  //   //   .rpc()
  //   //   .getBalance(honeycomb.identity().address);

  //   // console.log(
  //   //   "address",
  //   //   honeycomb.identity().address.toString(),
  //   //   balance.toString(),
  //   //   honeycomb.connection.rpcEndpoint
  //   // );

  //   // const newCollection = new web3.PublicKey(
  //   //   "SoLPr7zxggXh9JUt8NGKyxLZGJmyWqgawcs9N9hmatP"
  //   // );
  //   // const newMerkleTree = new web3.PublicKey(
  //   //   "BXMBo3FKjihFk5F7Mj8UdByNrufmzhfC4Ng6qcUA5VDs"
  //   // );
  //   // await honeycomb.project().addCriteria({
  //   //   collection: newCollection,
  //   //   merkleTree: newMerkleTree,
  //   // });

  //   await findProjectCurrencies(honeycomb.project());
  //   console.log("Currencies", Object.values(honeycomb._currencies).length);

  //   let bail = Object.values(honeycomb._currencies).find(
  //     (c) =>
  //       !Object.values((c as any)._metadata).length ||
  //       c.name.toLocaleLowerCase() === "bail"
  //   );
  //   if (!bail) throw new Error("Bail not found");

  //   let bounty = Object.values(honeycomb._currencies).find(
  //     (c) =>
  //       Object.values((c as any)._metadata).length &&
  //       c.name.toLocaleLowerCase() === "bounty"
  //   );
  //   if (!bounty) throw new Error("Bounty not found");

  //   let ammo = Object.values(honeycomb._currencies).find(
  //     (c) =>
  //       Object.values((c as any)._metadata).length &&
  //       c.name.toLocaleLowerCase() === "ammo"
  //   );
  //   if (!ammo) throw new Error("Ammo not found");

  //   let food = Object.values(honeycomb._currencies).find(
  //     (c) =>
  //       Object.values((c as any)._metadata).length &&
  //       c.name.toLocaleLowerCase() === "food"
  //   );
  //   if (!food) throw new Error("food not found");

  //   let gems = Object.values(honeycomb._currencies).find(
  //     (c) =>
  //       Object.values((c as any)._metadata).length &&
  //       c.name.toLocaleLowerCase() === "gems"
  //   );
  //   if (!gems) throw new Error("gems not found");
  //   await findProjectStakingPools(honeycomb.project());
  //   const staking = honeycomb.staking() as unknown as NectarStaking;
  //   console.log("Staking", staking.address);

  //   // // Migrate NFT to NFTv1
  //   // const nftsRaw = await NFT.gpaBuilder()
  //   //   .run(honeycomb.connection)
  //   //   .then(
  //   //     (nfts) =>
  //   //       nfts
  //   //         .map((nft) => {
  //   //           try {
  //   //             return [nft.pubkey, NFT.fromAccountInfo(nft.account)[0]] as [
  //   //               web3.PublicKey,
  //   //               NFT
  //   //             ];
  //   //           } catch {
  //   //             return null;
  //   //           }
  //   //         })
  //   //         .filter(
  //   //           (x) =>
  //   //             !!x &&
  //   //             (x[1].staker === web3.PublicKey.default || x[1].staker === null)
  //   //         ) as [web3.PublicKey, NFT][]
  //   //   );

  //   // console.log("NFTs", nftsRaw.length);
  //   // // const operations = nftsRaw.map(
  //   // //   (nft) =>
  //   // //     new Operation(honeycomb, [
  //   // //       createCloseNftInstruction({
  //   // //         project: honeycomb.project().address,
  //   // //         nft: nft[0],
  //   // //         authority: honeycomb.identity().address,
  //   // //         vault: VAULT,
  //   // //         instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //   // //       }),
  //   // //     ])
  //   // // );
  //   // // await Operation.sendBulk(honeycomb, operations);

  //   // for (let nft of nftsRaw) {
  //   //   const { signature } = await new Operation(honeycomb, [
  //   //     createCloseNftInstruction({
  //   //       project: honeycomb.project().address,
  //   //       nft: nft[0],
  //   //       authority: honeycomb.identity().address,
  //   //       vault: VAULT,
  //   //       instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //   //     }),
  //   //   ]).send({ skipPreflight: true });
  //   //   console.log("Signature", signature);
  //   //   break;
  //   // }

  //   // const nfts: [web3.PublicKey, StakedNft][] = await fetchHeliusAssets(
  //   //   staking.helius_rpc,
  //   //   {
  //   //     mintList: nftsRaw.map((x) => x[1].mint),
  //   //   }
  //   // ).then(
  //   //   (nfts) =>
  //   //     nfts
  //   //       .map((nft) => {
  //   //         const found = nftsRaw.find((x) => x[1].mint.equals(nft.mint));
  //   //         if (!found) return;
  //   //         return [
  //   //           found[0],
  //   //           {
  //   //             ...nft,
  //   //             ...found[1],
  //   //           },
  //   //         ];
  //   //       })
  //   //       .filter((x) => !!x) as [web3.PublicKey, StakedNft][]
  //   // );

  //   // console.log("NFTS", nfts.length);
  //   // for (let nft of nfts) {
  //   //   const stakingPool = Object.values(honeycomb._stakings).find((s) =>
  //   //     s.address.equals(nft[1].stakingPool)
  //   //   );
  //   //   if (!stakingPool) continue;

  //   //   const [nftTemp] = web3.PublicKey.findProgramAddressSync(
  //   //     [
  //   //       Buffer.from("nft-temp"),
  //   //       nft[1].mint.toBuffer(),
  //   //       stakingPool.address.toBuffer(),
  //   //     ],
  //   //     stakingPool.programId
  //   //   );

  //   //   const instructions = [
  //   //     createMigrateNftPart1Instruction({
  //   //       project: stakingPool.project().address,
  //   //       stakingPool: stakingPool.address,
  //   //       nft: nft[0],
  //   //       nftTemp,
  //   //       authority: honeycomb.identity().address,
  //   //     }),
  //   //     createMigrateNftPart2Instruction({
  //   //       project: stakingPool.project().address,
  //   //       stakingPool: stakingPool.address,
  //   //       nft: nft[0],
  //   //       nftTemp,
  //   //       authority: honeycomb.identity().address,
  //   //     }),
  //   //   ];

  //   //   try {
  //   //     const ctx = await new Operation(honeycomb, instructions).send({
  //   //       skipPreflight: false,
  //   //     });
  //   //     console.log("Signature", ctx.signature);
  //   //   } catch (e) {
  //   //     console.dir(e);
  //   //   }
  //   // }

  //   // honeycomb.staking()
  //   //   .staker({
  //   //     wallet: new web3.PublicKey(
  //   //       "232Z5QNvQ4wRyraGWFpC5i3HEbqozEWgBCV95eWASaG1"
  //   //     ),
  //   //   })
  //   //   .then((s) =>
  //   //     console.log("Staker", {
  //   //       ...s,
  //   //       totalStaked: s.totalStaked.toString(),
  //   //       wallet: s.wallet.toString(),
  //   //     })
  //   //   );

  //   // const availableNfts = await honeycomb
  //   //   .staking()
  //   //   .fetch()
  //   //   .availableNfts(
  //   //     new web3.PublicKey("232Z5QNvQ4wRyraGWFpC5i3HEbqozEWgBCV95eWASaG1")
  //   //   );
  //   // console.log("availableNfts", availableNfts.length);

  //   // const stakedNfts = await honeycomb
  //   //   .staking()
  //   //   .fetch()
  //   //   .stakedNfts(
  //   //     new web3.PublicKey("232Z5QNvQ4wRyraGWFpC5i3HEbqozEWgBCV95eWASaG1")
  //   //   );
  //   // console.log("stakedNfts", stakedNfts.length);
  //   // const [{ rewards, multipliers }] = await honeycomb
  //   //   .staking()
  //   //   .fetch()
  //   //   .rewards([stakedNfts[0]]);
  //   // console.log("rewards", rewards, multipliers);

  //   // // @ts-ignore
  //   // const mint: web3.PublicKey = staking._pool.currency;
  //   // console.log("mint", mint.toString());

  //   // const [rewardVault] = web3.PublicKey.findProgramAddressSync(
  //   //   [Buffer.from("vault"), staking.address.toBuffer(), mint.toBuffer()],
  //   //   staking.programId
  //   // );

  //   // const [currency] = currencyPda(mint);
  //   // const [vaultHolderAccount] = holderAccountPda(staking.address, mint);
  //   // const [vaultTokenAccount] = tokenAccountPda(staking.address, mint);

  //   // const operation = new Operation(honeycomb, [
  //   //   ...(await createCreateCurrencyOperation(honeycomb, {
  //   //     args: {
  //   //       mint,
  //   //     },
  //   //     project: staking.project(),
  //   //   }).then(({ operation }) => operation.instructions)),

  //   //   createCreateHolderAccountInstruction({
  //   //     project: staking.project().address,
  //   //     currency,
  //   //     holderAccount: vaultHolderAccount,
  //   //     mint,
  //   //     tokenAccount: vaultTokenAccount,
  //   //     owner: staking.address,
  //   //     payer: honeycomb.identity().address,
  //   //     vault: VAULT,
  //   //     instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //   //   }),

  //   //   createMigrateVaultInstruction({
  //   //     project: staking.project().address,
  //   //     stakingPool: staking.address,
  //   //     currency,
  //   //     mint,
  //   //     rewardVault,
  //   //     vaultHolderAccount,
  //   //     vaultTokenAccount,
  //   //     authority: honeycomb.identity().address,
  //   //     payer: honeycomb.identity().address,
  //   //     delegateAuthority: staking.programId,
  //   //     vault: VAULT,
  //   //     currencyManagerProgram: CURRENCY_PROGRAM_ID,
  //   //     instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //   //   }),
  //   // ]);

  //   // await operation.send({ skipPreflight: true });

  //   await findProjectMissionPools(honeycomb.project());
  //   const hcMissions = honeycomb.missions() as unknown as NectarMissions;
  //   console.log("Missions", hcMissions.address);
  //   // if (!honeycomb._missions) {
  //   //   const collections = [];
  //   //   honeycomb.use(
  //   //     await NectarMissions.new(honeycomb, {
  //   //       args: {
  //   //         name: "Sol Patrol",
  //   //         factionsMerkleRoot: Array(32).fill(0),
  //   //         collections,
  //   //       },
  //   //     })
  //   //   );
  //   // }

  //   // console.log("UPDATING MISSIONS");
  //   // await honeycomb.missions().update(
  //   //   {
  //   //     factionsMerkleRoot: Array(32).fill(0),
  //   //     collection: honeycomb.project().collections[staking.collections[0]],
  //   //   },
  //   //   { skipPreflight: true }
  //   // );

  //   // const missions = {
  //   //   "Quick Patrol": {
  //   //     skip: false,
  //   //     costAmount: 1,
  //   //     minXp: 0,
  //   //     duration: 15 * 60,
  //   //     ammo: { skip: false, min: 1, max: 1 },
  //   //     food: { skip: false, min: 1, max: 1 },
  //   //   },
  //   //   "Casino Heist": {
  //   //     skip: false,
  //   //     costAmount: 0,
  //   //     minXp: 0,
  //   //     duration: 1 * 3600,
  //   //     ammo: { skip: false, min: 1, max: 1 },
  //   //   },
  //   //   "Night Patrol": {
  //   //     skip: false,
  //   //     costAmount: 0,
  //   //     minXp: 0,
  //   //     duration: 3 * 3600,
  //   //     ammo: { skip: false, min: 1, max: 1 },
  //   //     food: { skip: false, min: 1, max: 1 },
  //   //   },
  //   //   Investigate: {
  //   //     skip: false,
  //   //     costAmount: 3,
  //   //     minXp: 0,
  //   //     duration: 12 * 3600,
  //   //     ammo: { skip: false, min: 2, max: 2 },
  //   //     food: { skip: false, min: 5, max: 5 },
  //   //   },
  //   //   Arrest: {
  //   //     skip: false,
  //   //     costAmount: 3,
  //   //     minXp: 0,
  //   //     duration: 12 * 3600,
  //   //     ammo: { skip: false, min: 3, max: 3 },
  //   //     food: { skip: false, min: 3, max: 3 },
  //   //   },
  //   //   Combat: {
  //   //     skip: false,
  //   //     costAmount: 10,
  //   //     minXp: 0,
  //   //     duration: 48 * 3600,
  //   //     gems: { skip: false, min: 1, max: 1 },
  //   //   },
  //   // };
  //   // for (let mission of await hcMissions.missions()) {
  //   //   const config = missions[mission.name];
  //   //   // await staking.updatePool(
  //   //   //   {
  //   //   //     args: {
  //   //   //       name: null,
  //   //   //       rewardsPerDuration: null,
  //   //   //       rewardsDuration: null,
  //   //   //       maxRewardsDuration: null,
  //   //   //       minStakeDuration: null,
  //   //   //       cooldownDuration: null,
  //   //   //       resetStakeDuration: null,
  //   //   //       startTime: null,
  //   //   //       endTime: null,
  //   //   //     },
  //   //   //     collection: newCollection,
  //   //   //     merkleTree: newMerkleTree,
  //   //   //   },
  //   //   //   { skipPreflight: true }
  //   //   // );

  //   //   if (config.skip) continue;

  //   //   const coins = {
  //   //     bail: bail,
  //   //     bounty: bounty,
  //   //     ammo: ammo,
  //   //     food: food,
  //   //     gems: gems,
  //   //   };

  //   //   await mission.update({
  //   //     name: null,
  //   //     minXp: config.minXp,
  //   //     cost: {
  //   //       address: bounty.address,
  //   //       amount: config.costAmount * 10 ** bounty.mint.decimals,
  //   //     },
  //   //     duration: config.duration,
  //   //     addRewards: Object.entries(coins)
  //   //       .map(
  //   //         ([name, coin]) =>
  //   //           config[name] && {
  //   //             rewardType: {
  //   //               __kind: "Currency",
  //   //               address: coin.address,
  //   //             } as RewardType,
  //   //             min: config[name].min * 10 ** coin.mint.decimals,
  //   //             max: config[name].max * 10 ** coin.mint.decimals,
  //   //           }
  //   //       )
  //   //       .filter((a) => a),
  //   //     removeRewardIndices: null,
  //   //     removeAllRewards: true,
  //   //   });

  //   //   console.log(mission.name, "Rewards", mission.rewards.length);
  //   // }

  //   // console.log("StakingCollectionn", staking.collections, staking.creators);
  //   // console.log(
  //   //   "MissionCollectionn",
  //   //   honeycomb.missions().collections,
  //   //   honeycomb.missions().creators
  //   // );

  //   // const missions = await honeycomb.missions().missions();

  //   // // Night Patrol - 3 hr
  //   // // Cost in $BAIL: Zero
  //   // // Duration: 180 min
  //   // // Bounty yield: 2
  //   // // XP awarded: 1  point
  //   // // Resource 1 (Ammo):  1
  //   // // Resource 2 (Food): 1
  //   // // Resource 3 (Gems): 0
  //   // // $BAIL reward: 0 $BAIL
  //   // if (!missions.find((m) => m.name === "Night Patrol")) {
  //   //   await honeycomb
  //   //     .missions()
  //   //     .create()
  //   //     .mission({
  //   //       name: "Night Patrol",
  //   //       cost: {
  //   //         address: bail.address,
  //   //         amount: 0 * 1_000_000_000,
  //   //       },
  //   //       duration: 3 * 3600,
  //   //       minXp: 0,
  //   //       rewards: [
  //   //         {
  //   //           min: 2 * 1_000_000_000,
  //   //           max: 2 * 1_000_000_000,
  //   //           rewardType: {
  //   //             __kind: "Currency",
  //   //             address: bounty.address,
  //   //           },
  //   //         },
  //   //         {
  //   //           min: 1,
  //   //           max: 1,
  //   //           rewardType: {
  //   //             __kind: "Xp",
  //   //           },
  //   //         },
  //   //         {
  //   //           min: 1 * 1_000_000_000,
  //   //           max: 1 * 1_000_000_000,
  //   //           rewardType: {
  //   //             __kind: "Currency",
  //   //             address: ammo.address,
  //   //           },
  //   //         },
  //   //         {
  //   //           min: 1 * 1_000_000_000,
  //   //           max: 1 * 1_000_000_000,
  //   //           rewardType: {
  //   //             __kind: "Currency",
  //   //             address: food.address,
  //   //           },
  //   //         },
  //   //         {
  //   //           min: 0 * 1_000_000_000,
  //   //           max: 0 * 1_000_000_000,
  //   //           rewardType: {
  //   //             __kind: "Currency",
  //   //             address: gems.address,
  //   //           },
  //   //         },
  //   //         {
  //   //           min: 0 * 1_000_000_000,
  //   //           max: 0 * 1_000_000_000,
  //   //           rewardType: {
  //   //             __kind: "Currency",
  //   //             address: bail.address,
  //   //           },
  //   //         },
  //   //       ],
  //   //     });
  //   // }

  //   // // Investigate - 12 hours
  //   // // Cost in $BAIL: 500 $BAIL
  //   // // Duration: 12 hours
  //   // // Bounty yield: 2.5 - 10
  //   // // XP awarded: 6 - 10 points
  //   // // Resource 1 (Ammo): 2
  //   // // Resource 2 (Food): 5
  //   // // Resource 3 (Gems): 0
  //   // // $BAIL reward: 0 - 100 $BAIL
  //   // if (!missions.find((m) => m.name === "Investigate")) {
  //   //   await honeycomb
  //   //     .missions()
  //   //     .create()
  //   //     .mission({
  //   //       name: "Investigate",
  //   //       cost: {
  //   //         address: bail.address,
  //   //         amount: 500 * 1_000_000_000,
  //   //       },
  //   //       duration: 12 * 3600,
  //   //       minXp: 0,
  //   //       rewards: [
  //   //         {
  //   //           min: 2.5 * 1_000_000_000,
  //   //           max: 10 * 1_000_000_000,
  //   //           rewardType: {
  //   //             __kind: "Currency",
  //   //             address: bounty.address,
  //   //           },
  //   //         },
  //   //         {
  //   //           min: 6,
  //   //           max: 10,
  //   //           rewardType: {
  //   //             __kind: "Xp",
  //   //           },
  //   //         },
  //   //         {
  //   //           min: 2 * 1_000_000_000,
  //   //           max: 2 * 1_000_000_000,
  //   //           rewardType: {
  //   //             __kind: "Currency",
  //   //             address: ammo.address,
  //   //           },
  //   //         },
  //   //         {
  //   //           min: 5 * 1_000_000_000,
  //   //           max: 5 * 1_000_000_000,
  //   //           rewardType: {
  //   //             __kind: "Currency",
  //   //             address: food.address,
  //   //           },
  //   //         },
  //   //         {
  //   //           min: 0 * 1_000_000_000,
  //   //           max: 0 * 1_000_000_000,
  //   //           rewardType: {
  //   //             __kind: "Currency",
  //   //             address: gems.address,
  //   //           },
  //   //         },
  //   //         {
  //   //           min: 0 * 1_000_000_000,
  //   //           max: 100 * 1_000_000_000,
  //   //           rewardType: {
  //   //             __kind: "Currency",
  //   //             address: bail.address,
  //   //           },
  //   //         },
  //   //       ],
  //   //     });
  //   // }

  //   // // Arrest - 12 hours
  //   // // Cost in $BAIL: 500 $BAIL
  //   // // Duration: 12 hours
  //   // // Bounty yield: 1 - 10
  //   // // XP awarded: 10 - 16 points
  //   // // Resource 1 (Ammo): 3
  //   // // Resource 2 (Food): 3
  //   // // Resource 3 (Gems): 0
  //   // // $BAIL reward: 0 -  100 $BAIL
  //   // if (!missions.find((m) => m.name === "Arrest")) {
  //   //   await honeycomb
  //   //     .missions()
  //   //     .create()
  //   //     .mission({
  //   //       name: "Arrest",
  //   //       cost: {
  //   //         address: bail.address,
  //   //         amount: 500 * 1_000_000_000,
  //   //       },
  //   //       duration: 12 * 3600,
  //   //       minXp: 0,
  //   //       rewards: [
  //   //         {
  //   //           min: 1 * 1_000_000_000,
  //   //           max: 10 * 1_000_000_000,
  //   //           rewardType: {
  //   //             __kind: "Currency",
  //   //             address: bounty.address,
  //   //           },
  //   //         },
  //   //         {
  //   //           min: 10,
  //   //           max: 16,
  //   //           rewardType: {
  //   //             __kind: "Xp",
  //   //           },
  //   //         },
  //   //         {
  //   //           min: 3 * 1_000_000_000,
  //   //           max: 3 * 1_000_000_000,
  //   //           rewardType: {
  //   //             __kind: "Currency",
  //   //             address: ammo.address,
  //   //           },
  //   //         },
  //   //         {
  //   //           min: 3 * 1_000_000_000,
  //   //           max: 3 * 1_000_000_000,
  //   //           rewardType: {
  //   //             __kind: "Currency",
  //   //             address: food.address,
  //   //           },
  //   //         },
  //   //         {
  //   //           min: 0 * 1_000_000_000,
  //   //           max: 0 * 1_000_000_000,
  //   //           rewardType: {
  //   //             __kind: "Currency",
  //   //             address: gems.address,
  //   //           },
  //   //         },
  //   //         {
  //   //           min: 0 * 1_000_000_000,
  //   //           max: 100 * 1_000_000_000,
  //   //           rewardType: {
  //   //             __kind: "Currency",
  //   //             address: bail.address,
  //   //           },
  //   //         },
  //   //       ],
  //   //     });
  //   // }

  //   // // Combat - 2 Days (Level 3)
  //   // // Cost in $BAIL: 1500 $BAIL
  //   // // Duration: 48 hours
  //   // // Bounty yield: 10 - 30
  //   // // XP awarded: 25 - 50 points
  //   // // Resource 1 (Ammo): 15
  //   // // Resource 2 (Food): 25
  //   // // Resource 3 (Gems): 1
  //   // // $BAIL reward: 50 - 300 $BAIL
  //   // if (!missions.find((m) => m.name === "Combat")) {
  //   //   await honeycomb
  //   //     .missions()
  //   //     .create()
  //   //     .mission({
  //   //       name: "Combat",
  //   //       cost: {
  //   //         address: bail.address,
  //   //         amount: 1500 * 1_000_000_000,
  //   //       },
  //   //       duration: 48 * 3600,
  //   //       minXp: 300,
  //   //       rewards: [
  //   //         {
  //   //           min: 10 * 1_000_000_000,
  //   //           max: 30 * 1_000_000_000,
  //   //           rewardType: {
  //   //             __kind: "Currency",
  //   //             address: bounty.address,
  //   //           },
  //   //         },
  //   //         {
  //   //           min: 25,
  //   //           max: 50,
  //   //           rewardType: {
  //   //             __kind: "Xp",
  //   //           },
  //   //         },
  //   //         {
  //   //           min: 15 * 1_000_000_000,
  //   //           max: 15 * 1_000_000_000,
  //   //           rewardType: {
  //   //             __kind: "Currency",
  //   //             address: ammo.address,
  //   //           },
  //   //         },
  //   //         {
  //   //           min: 25 * 1_000_000_000,
  //   //           max: 25 * 1_000_000_000,
  //   //           rewardType: {
  //   //             __kind: "Currency",
  //   //             address: food.address,
  //   //           },
  //   //         },
  //   //         {
  //   //           min: 1 * 1_000_000_000,
  //   //           max: 1 * 1_000_000_000,
  //   //           rewardType: {
  //   //             __kind: "Currency",
  //   //             address: gems.address,
  //   //           },
  //   //         },
  //   //         {
  //   //           min: 50 * 1_000_000_000,
  //   //           max: 300 * 1_000_000_000,
  //   //           rewardType: {
  //   //             __kind: "Currency",
  //   //             address: bail.address,
  //   //           },
  //   //         },
  //   //       ],
  //   //     });
  //   // }

  //   // // Quick Patrol - 0.25 hr
  //   // // Cost in $BAIL: 150
  //   // // Duration: 15 min
  //   // // Bounty yield: 1
  //   // // XP awarded: 0  point
  //   // // Resource 1 (Ammo):  1
  //   // // Resource 2 (Food): 1
  //   // // Resource 3 (Gems): 0
  //   // // $BAIL reward: 0 $BAIL
  //   // if (!missions.find((m) => m.name === "Quick Patrol")) {
  //   //   await honeycomb
  //   //     .missions()
  //   //     .create()
  //   //     .mission({
  //   //       name: "Quick Patrol",
  //   //       cost: {
  //   //         address: bail.address,
  //   //         amount: 150 * 1_000_000_000,
  //   //       },
  //   //       duration: 15 * 60,
  //   //       minXp: 0,
  //   //       rewards: [
  //   //         {
  //   //           min: 1 * 1_000_000_000,
  //   //           max: 1 * 1_000_000_000,
  //   //           rewardType: {
  //   //             __kind: "Currency",
  //   //             address: bounty.address,
  //   //           },
  //   //         },
  //   //         {
  //   //           min: 0,
  //   //           max: 0,
  //   //           rewardType: {
  //   //             __kind: "Xp",
  //   //           },
  //   //         },
  //   //         {
  //   //           min: 1 * 1_000_000_000,
  //   //           max: 1 * 1_000_000_000,
  //   //           rewardType: {
  //   //             __kind: "Currency",
  //   //             address: ammo.address,
  //   //           },
  //   //         },
  //   //         {
  //   //           min: 1 * 1_000_000_000,
  //   //           max: 1 * 1_000_000_000,
  //   //           rewardType: {
  //   //             __kind: "Currency",
  //   //             address: food.address,
  //   //           },
  //   //         },
  //   //         {
  //   //           min: 0 * 1_000_000_000,
  //   //           max: 0 * 1_000_000_000,
  //   //           rewardType: {
  //   //             __kind: "Currency",
  //   //             address: gems.address,
  //   //           },
  //   //         },
  //   //         {
  //   //           min: 0 * 1_000_000_000,
  //   //           max: 0 * 1_000_000_000,
  //   //           rewardType: {
  //   //             __kind: "Currency",
  //   //             address: bail.address,
  //   //           },
  //   //         },
  //   //       ],
  //   //     });
  //   // }

  //   // // Casino Heist - 1 hr
  //   // // Cost in $BAIL: 0
  //   // // Duration: 60 min
  //   // // Bounty yield: 0 - 1
  //   // // XP awarded: 0  point
  //   // // Resource 1 (Ammo):  1
  //   // // Resource 2 (Food): 0
  //   // // Resource 3 (Gems): 0
  //   // // $BAIL reward: 0 $BAIL
  //   // if (!missions.find((m) => m.name === "Casino Heist")) {
  //   //   await honeycomb
  //   //     .missions()
  //   //     .create()
  //   //     .mission({
  //   //       name: "Casino Heist",
  //   //       cost: {
  //   //         address: bail.address,
  //   //         amount: 0 * 1_000_000_000,
  //   //       },
  //   //       duration: 3600,
  //   //       minXp: 0,
  //   //       rewards: [
  //   //         {
  //   //           min: 0 * 1_000_000_000,
  //   //           max: 1 * 1_000_000_000,
  //   //           rewardType: {
  //   //             __kind: "Currency",
  //   //             address: bounty.address,
  //   //           },
  //   //         },
  //   //         {
  //   //           min: 0,
  //   //           max: 0,
  //   //           rewardType: {
  //   //             __kind: "Xp",
  //   //           },
  //   //         },
  //   //         {
  //   //           min: 1 * 1_000_000_000,
  //   //           max: 1 * 1_000_000_000,
  //   //           rewardType: {
  //   //             __kind: "Currency",
  //   //             address: ammo.address,
  //   //           },
  //   //         },
  //   //         {
  //   //           min: 0 * 1_000_000_000,
  //   //           max: 0 * 1_000_000_000,
  //   //           rewardType: {
  //   //             __kind: "Currency",
  //   //             address: food.address,
  //   //           },
  //   //         },
  //   //         {
  //   //           min: 0 * 1_000_000_000,
  //   //           max: 0 * 1_000_000_000,
  //   //           rewardType: {
  //   //             __kind: "Currency",
  //   //             address: gems.address,
  //   //           },
  //   //         },
  //   //         {
  //   //           min: 0 * 1_000_000_000,
  //   //           max: 0 * 1_000_000_000,
  //   //           rewardType: {
  //   //             __kind: "Currency",
  //   //             address: bail.address,
  //   //           },
  //   //         },
  //   //       ],
  //   //     });
  //   // }

  //   // for (let mission of await honeycomb.missions().missions()) {
  //   //   const config = (() => {
  //   //     switch (mission.name) {
  //   //       case "Quick Patrol":
  //   //         return {
  //   //           skip: false,
  //   //           costAmount: 1,
  //   //           minXp: 0,
  //   //           duration: 15 * 60,
  //   //           bounty: { skip: false, min: 0, max: 1 },
  //   //           ammo: { skip: false, min: 1, max: 1 },
  //   //           food: { skip: false, min: 1, max: 1 },
  //   //           gems: { skip: false, min: 0, max: 0 },
  //   //           bail: { skip: false, min: 0, max: 0 },
  //   //         };
  //   //       case "Casino Heist":
  //   //         return {
  //   //           skip: false,
  //   //           costAmount: 0,
  //   //           minXp: 0,
  //   //           duration: 1 * 3600,
  //   //           bounty: { skip: false, min: 0, max: 1 },
  //   //           ammo: { skip: false, min: 1, max: 1 },
  //   //           food: { skip: false, min: 0, max: 0 },
  //   //           gems: { skip: false, min: 0, max: 0 },
  //   //           bail: { skip: false, min: 0, max: 0 },
  //   //         };
  //   //       case "Night Patrol":
  //   //         return {
  //   //           skip: false,
  //   //           costAmount: 0,
  //   //           minXp: 0,
  //   //           duration: 3 * 3600,
  //   //           bounty: { skip: false, min: 2, max: 2 },
  //   //           ammo: { skip: false, min: 1, max: 1 },
  //   //           food: { skip: false, min: 1, max: 1 },
  //   //           gems: { skip: false, min: 0, max: 0 },
  //   //           bail: { skip: false, min: 0, max: 0 },
  //   //         };
  //   //       case "Investigate":
  //   //         return {
  //   //           skip: false,
  //   //           costAmount: 3,
  //   //           minXp: 0,
  //   //           duration: 12 * 3600,
  //   //           bounty: { skip: false, min: 2, max: 10 },
  //   //           ammo: { skip: false, min: 2, max: 2 },
  //   //           food: { skip: false, min: 5, max: 5 },
  //   //           gems: { skip: false, min: 0, max: 0 },
  //   //           bail: { skip: false, min: 0, max: 100 },
  //   //         };
  //   //       case "Arrest":
  //   //         return {
  //   //           skip: false,
  //   //           costAmount: 3,
  //   //           minXp: 0,
  //   //           duration: 12 * 3600,
  //   //           bounty: { skip: false, min: 1, max: 10 },
  //   //           ammo: { skip: false, min: 3, max: 3 },
  //   //           food: { skip: false, min: 3, max: 3 },
  //   //           gems: { skip: false, min: 0, max: 0 },
  //   //           bail: { skip: false, min: 0, max: 100 },
  //   //         };
  //   //       case "Combat":
  //   //         return {
  //   //           skip: false,
  //   //           costAmount: 10,
  //   //           minXp: 0,
  //   //           duration: 48 * 3600,
  //   //           bounty: { skip: false, min: 10, max: 30 },
  //   //           ammo: { skip: false, min: 15, max: 15 },
  //   //           food: { skip: false, min: 25, max: 25 },
  //   //           gems: { skip: false, min: 1, max: 1 },
  //   //           bail: { skip: false, min: 50, max: 300 },
  //   //         };

  //   //       default:
  //   //         return { skip: true, costAmount: 0, minXp: 0, duration: 0 };
  //   //     }
  //   //   })();

  //   //   if (config.skip) continue;

  //   //   // await mission.update({
  //   //   //   name: null,
  //   //   //   minXp: config.minXp,
  //   //   //   cost: {
  //   //   //     address: bounty.address,
  //   //   //     amount: config.costAmount * 10 ** bounty.mint.decimals,
  //   //   //   },
  //   //   //   duration: config.duration,
  //   //   //   addReward: null,
  //   //   //   removeRewardIndex: null,
  //   //   // });

  //   //   // console.log(mission.name, "Rewards", mission.rewards.length);

  //   //   // const coins = {
  //   //   //   bail: bail,
  //   //   //   bounty: bounty,
  //   //   //   ammo: ammo,
  //   //   //   food: food,
  //   //   //   gems: gems,
  //   //   // };
  //   //   // const { signature } = await new Operation(honeycomb, [
  //   //   //   // ComputeBudgetProgram.setComputeUnitLimit({
  //   //   //   //   units: 400_000,
  //   //   //   // }),
  //   //   //   createUpdateMissionInstruction(
  //   //   //     {
  //   //   //       project: mission.pool().project().address,
  //   //   //       missionPool: mission.pool().address,
  //   //   //       mission: mission.address,
  //   //   //       delegateAuthority: HPL_NECTAR_MISSIONS_PROGRAM,
  //   //   //       authority: honeycomb.identity().address,
  //   //   //       payer: honeycomb.identity().address,
  //   //   //       vault: VAULT,
  //   //   //       rentSysvar: web3.SYSVAR_RENT_PUBKEY,
  //   //   //       instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //   //   //     },
  //   //   //     {
  //   //   //       args: {
  //   //   //         name: null,
  //   //   //         minXp: null,
  //   //   //         cost: null,
  //   //   //         duration: null,
  //   //   //         removeAllRewards: true,
  //   //   //         addRewards: Object.entries(coins).map(([name, coin]) => ({
  //   //   //           rewardType: {
  //   //   //             __kind: "Currency",
  //   //   //             address: coin.address,
  //   //   //           },
  //   //   //           min: config[name].min * 10 ** coin.mint.decimals,
  //   //   //           max: config[name].max * 10 ** coin.mint.decimals,
  //   //   //         })),
  //   //   //         removeRewardIndices: null,
  //   //   //       },
  //   //   //     }
  //   //   //   ),
  //   //   // ]).send();
  //   //   // console.log("Set Rewards from", mission.name, signature);

  //   //   // if (mission.rewards.length) {
  //   //   //   const { signature: removeSignature } = await new Operation(honeycomb, [
  //   //   //     // ComputeBudgetProgram.setComputeUnitLimit({
  //   //   //     //   units: 400_000,
  //   //   //     // }),
  //   //   //     ...mission.rewards.map((_, i) =>
  //   //   //       createUpdateMissionInstruction(
  //   //   //         {
  //   //   //           project: mission.pool().project().address,
  //   //   //           missionPool: mission.pool().address,
  //   //   //           mission: mission.address,
  //   //   //           delegateAuthority: HPL_NECTAR_MISSIONS_PROGRAM,
  //   //   //           authority: honeycomb.identity().address,
  //   //   //           payer: honeycomb.identity().address,
  //   //   //           vault: VAULT,
  //   //   //           rentSysvar: web3.SYSVAR_RENT_PUBKEY,
  //   //   //           instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //   //   //         },
  //   //   //         {
  //   //   //           args: {
  //   //   //             name: null,
  //   //   //             minXp: null,
  //   //   //             cost: null,
  //   //   //             duration: null,
  //   //   //             addReward: null,
  //   //   //             removeRewardIndex: i,
  //   //   //           },
  //   //   //         }
  //   //   //       )
  //   //   //     ),
  //   //   //   ]).send();
  //   //   //   console.log("Removed All Rewards from", mission.name, removeSignature);
  //   //   // }

  //   //   // if (mission.rewards.length === 0) {
  //   //   //   const coins = {
  //   //   //     bail: bail,
  //   //   //     bounty: bounty,
  //   //   //     ammo: ammo,
  //   //   //     food: food,
  //   //   //     gems: gems,
  //   //   //   };
  //   //   //   const { signature: addSignature } = await new Operation(honeycomb, [
  //   //   //     // ComputeBudgetProgram.setComputeUnitLimit({
  //   //   //     //   units: 400_000,
  //   //   //     // }),
  //   //   //     ...Object.entries(coins).map(([name, coin]) =>
  //   //   //       createUpdateMissionInstruction(
  //   //   //         {
  //   //   //           project: mission.pool().project().address,
  //   //   //           missionPool: mission.pool().address,
  //   //   //           mission: mission.address,
  //   //   //           delegateAuthority: HPL_NECTAR_MISSIONS_PROGRAM,
  //   //   //           authority: honeycomb.identity().address,
  //   //   //           payer: honeycomb.identity().address,
  //   //   //           vault: VAULT,
  //   //   //           rentSysvar: web3.SYSVAR_RENT_PUBKEY,
  //   //   //           instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //   //   //         },
  //   //   //         {
  //   //   //           args: {
  //   //   //             name: null,
  //   //   //             minXp: null,
  //   //   //             cost: null,
  //   //   //             duration: null,
  //   //   //             addReward: {
  //   //   //               rewardType: {
  //   //   //                 __kind: "Currency",
  //   //   //                 address: coin.address,
  //   //   //               },
  //   //   //               min: config[name].min * 10 ** coin.mint.decimals,
  //   //   //               max: config[name].max * 10 ** coin.mint.decimals,
  //   //   //             },
  //   //   //             removeRewardIndex: null,
  //   //   //           },
  //   //   //         }
  //   //   //       )
  //   //   //     ),
  //   //   //   ]).send();
  //   //   //   console.log("Added All Rewards to", mission.name, addSignature);
  //   //   // }

  //   //   // if (config.bail && !config.bail.skip) {
  //   //   //   const bailT = bail;
  //   //   //   const bailIndex = mission.rewards.findIndex(
  //   //   //     (r) => r.isCurrency() && r.currency().address.equals(bailT.address)
  //   //   //   );

  //   //   //   if (bailIndex >= 0) {
  //   //   //     const { signature } = await new Operation(honeycomb, [
  //   //   //       // ComputeBudgetProgram.setComputeUnitLimit({
  //   //   //       //   units: 400_000,
  //   //   //       // }),
  //   //   //       createUpdateMissionInstruction(
  //   //   //         {
  //   //   //           project: mission.pool().project().address,
  //   //   //           missionPool: mission.pool().address,
  //   //   //           mission: mission.address,
  //   //   //           delegateAuthority: HPL_NECTAR_MISSIONS_PROGRAM,
  //   //   //           authority: honeycomb.identity().address,
  //   //   //           payer: honeycomb.identity().address,
  //   //   //           vault: VAULT,
  //   //   //           rentSysvar: web3.SYSVAR_RENT_PUBKEY,
  //   //   //           instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //   //   //         },
  //   //   //         {
  //   //   //           args: {
  //   //   //             name: null,
  //   //   //             minXp: null,
  //   //   //             cost: null,
  //   //   //             duration: null,
  //   //   //             addReward: null,
  //   //   //             removeRewardIndex: bailIndex,
  //   //   //           },
  //   //   //         }
  //   //   //       ),

  //   //   //       createUpdateMissionInstruction(
  //   //   //         {
  //   //   //           project: mission.pool().project().address,
  //   //   //           missionPool: mission.pool().address,
  //   //   //           mission: mission.address,
  //   //   //           delegateAuthority: HPL_NECTAR_MISSIONS_PROGRAM,
  //   //   //           authority: honeycomb.identity().address,
  //   //   //           payer: honeycomb.identity().address,
  //   //   //           vault: VAULT,
  //   //   //           rentSysvar: web3.SYSVAR_RENT_PUBKEY,
  //   //   //           instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //   //   //         },
  //   //   //         {
  //   //   //           args: {
  //   //   //             name: null,
  //   //   //             minXp: null,
  //   //   //             cost: null,
  //   //   //             duration: null,
  //   //   //             addReward: {
  //   //   //               rewardType: {
  //   //   //                 __kind: "Currency",
  //   //   //                 address: bailT.address,
  //   //   //               },
  //   //   //               min: config.bail.min * 10 ** bail.mint.decimals,
  //   //   //               max: config.bail.max * 10 ** bail.mint.decimals,
  //   //   //             },
  //   //   //             removeRewardIndex: null,
  //   //   //           },
  //   //   //         }
  //   //   //       ),
  //   //   //     ]).send();
  //   //   //     console.log("Bail update for", mission.name, signature);
  //   //   //   }
  //   //   // }

  //   //   // if (config.bounty && !config.bounty.skip) {
  //   //   //   const bountyT = bounty;
  //   //   //   const bountyIndex = mission.rewards.findIndex(
  //   //   //     (r) => r.isCurrency() && r.currency().address.equals(bountyT.address)
  //   //   //   );

  //   //   //   if (bountyIndex >= 0) {
  //   //   //     const { signature } = await new Operation(honeycomb, [
  //   //   //       // ComputeBudgetProgram.setComputeUnitLimit({
  //   //   //       //   units: 400_000,
  //   //   //       // }),
  //   //   //       createUpdateMissionInstruction(
  //   //   //         {
  //   //   //           project: mission.pool().project().address,
  //   //   //           missionPool: mission.pool().address,
  //   //   //           mission: mission.address,
  //   //   //           delegateAuthority: HPL_NECTAR_MISSIONS_PROGRAM,
  //   //   //           authority: honeycomb.identity().address,
  //   //   //           payer: honeycomb.identity().address,
  //   //   //           vault: VAULT,
  //   //   //           rentSysvar: web3.SYSVAR_RENT_PUBKEY,
  //   //   //           instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //   //   //         },
  //   //   //         {
  //   //   //           args: {
  //   //   //             name: null,
  //   //   //             minXp: null,
  //   //   //             cost: null,
  //   //   //             duration: null,
  //   //   //             addReward: null,
  //   //   //             removeRewardIndex: bountyIndex,
  //   //   //           },
  //   //   //         }
  //   //   //       ),

  //   //   //       createUpdateMissionInstruction(
  //   //   //         {
  //   //   //           project: mission.pool().project().address,
  //   //   //           missionPool: mission.pool().address,
  //   //   //           mission: mission.address,
  //   //   //           delegateAuthority: HPL_NECTAR_MISSIONS_PROGRAM,
  //   //   //           authority: honeycomb.identity().address,
  //   //   //           payer: honeycomb.identity().address,
  //   //   //           vault: VAULT,
  //   //   //           rentSysvar: web3.SYSVAR_RENT_PUBKEY,
  //   //   //           instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //   //   //         },
  //   //   //         {
  //   //   //           args: {
  //   //   //             name: null,
  //   //   //             minXp: null,
  //   //   //             cost: null,
  //   //   //             duration: null,
  //   //   //             addReward: {
  //   //   //               rewardType: {
  //   //   //                 __kind: "Currency",
  //   //   //                 address: bountyT.address,
  //   //   //               },
  //   //   //               min: config.bounty.min * 10 ** bounty.mint.decimals,
  //   //   //               max: config.bounty.max * 10 ** bounty.mint.decimals,
  //   //   //             },
  //   //   //             removeRewardIndex: null,
  //   //   //           },
  //   //   //         }
  //   //   //       ),
  //   //   //     ]).send();
  //   //   //     console.log("Bounty update for", mission.name, signature);
  //   //   //   }
  //   //   // }

  //   //   // if (config.ammo && !config.ammo.skip) {
  //   //   //   const ammoT = ammo;
  //   //   //   const ammoIndex = mission.rewards.findIndex(
  //   //   //     (r) => r.isCurrency() && r.currency().address.equals(ammoT.address)
  //   //   //   );

  //   //   //   if (ammoIndex >= 0) {
  //   //   //     const { signature } = await new Operation(honeycomb, [
  //   //   //       // ComputeBudgetProgram.setComputeUnitLimit({
  //   //   //       //   units: 400_000,
  //   //   //       // }),
  //   //   //       createUpdateMissionInstruction(
  //   //   //         {
  //   //   //           project: mission.pool().project().address,
  //   //   //           missionPool: mission.pool().address,
  //   //   //           mission: mission.address,
  //   //   //           delegateAuthority: HPL_NECTAR_MISSIONS_PROGRAM,
  //   //   //           authority: honeycomb.identity().address,
  //   //   //           payer: honeycomb.identity().address,
  //   //   //           vault: VAULT,
  //   //   //           rentSysvar: web3.SYSVAR_RENT_PUBKEY,
  //   //   //           instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //   //   //         },
  //   //   //         {
  //   //   //           args: {
  //   //   //             name: null,
  //   //   //             minXp: null,
  //   //   //             cost: null,
  //   //   //             duration: null,
  //   //   //             addReward: null,
  //   //   //             removeRewardIndex: ammoIndex,
  //   //   //           },
  //   //   //         }
  //   //   //       ),

  //   //   //       createUpdateMissionInstruction(
  //   //   //         {
  //   //   //           project: mission.pool().project().address,
  //   //   //           missionPool: mission.pool().address,
  //   //   //           mission: mission.address,
  //   //   //           delegateAuthority: HPL_NECTAR_MISSIONS_PROGRAM,
  //   //   //           authority: honeycomb.identity().address,
  //   //   //           payer: honeycomb.identity().address,
  //   //   //           vault: VAULT,
  //   //   //           rentSysvar: web3.SYSVAR_RENT_PUBKEY,
  //   //   //           instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //   //   //         },
  //   //   //         {
  //   //   //           args: {
  //   //   //             name: null,
  //   //   //             minXp: null,
  //   //   //             cost: null,
  //   //   //             duration: null,
  //   //   //             addReward: {
  //   //   //               rewardType: {
  //   //   //                 __kind: "Currency",
  //   //   //                 address: ammoT.address,
  //   //   //               },
  //   //   //               min: config.ammo.min * 10 ** ammo.mint.decimals,
  //   //   //               max: config.ammo.max * 10 ** ammo.mint.decimals,
  //   //   //             },
  //   //   //             removeRewardIndex: null,
  //   //   //           },
  //   //   //         }
  //   //   //       ),
  //   //   //     ]).send();
  //   //   //     console.log("Ammo update for", mission.name, signature);
  //   //   //   }
  //   //   // }

  //   //   // if (config.food && !config.food.skip) {
  //   //   //   const foodT = food;
  //   //   //   const foodIndex = mission.rewards.findIndex(
  //   //   //     (r) => r.isCurrency() && r.currency().address.equals(foodT.address)
  //   //   //   );

  //   //   //   if (foodIndex >= 0) {
  //   //   //     const { signature } = await new Operation(honeycomb, [
  //   //   //       // ComputeBudgetProgram.setComputeUnitLimit({
  //   //   //       //   units: 400_000,
  //   //   //       // }),
  //   //   //       createUpdateMissionInstruction(
  //   //   //         {
  //   //   //           project: mission.pool().project().address,
  //   //   //           missionPool: mission.pool().address,
  //   //   //           mission: mission.address,
  //   //   //           delegateAuthority: HPL_NECTAR_MISSIONS_PROGRAM,
  //   //   //           authority: honeycomb.identity().address,
  //   //   //           payer: honeycomb.identity().address,
  //   //   //           vault: VAULT,
  //   //   //           rentSysvar: web3.SYSVAR_RENT_PUBKEY,
  //   //   //           instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //   //   //         },
  //   //   //         {
  //   //   //           args: {
  //   //   //             name: null,
  //   //   //             minXp: null,
  //   //   //             cost: null,
  //   //   //             duration: null,
  //   //   //             addReward: null,
  //   //   //             removeRewardIndex: foodIndex < 0 ? null : foodIndex,
  //   //   //           },
  //   //   //         }
  //   //   //       ),

  //   //   //       createUpdateMissionInstruction(
  //   //   //         {
  //   //   //           project: mission.pool().project().address,
  //   //   //           missionPool: mission.pool().address,
  //   //   //           mission: mission.address,
  //   //   //           delegateAuthority: HPL_NECTAR_MISSIONS_PROGRAM,
  //   //   //           authority: honeycomb.identity().address,
  //   //   //           payer: honeycomb.identity().address,
  //   //   //           vault: VAULT,
  //   //   //           rentSysvar: web3.SYSVAR_RENT_PUBKEY,
  //   //   //           instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //   //   //         },
  //   //   //         {
  //   //   //           args: {
  //   //   //             name: null,
  //   //   //             minXp: null,
  //   //   //             cost: null,
  //   //   //             duration: null,
  //   //   //             addReward:
  //   //   //               foodIndex >= 0 && config.food
  //   //   //                 ? {
  //   //   //                     rewardType: {
  //   //   //                       __kind: "Currency",
  //   //   //                       address: foodT.address,
  //   //   //                     },
  //   //   //                     min: config.food.min * 10 ** food.mint.decimals,
  //   //   //                     max: config.food.max * 10 ** food.mint.decimals,
  //   //   //                   }
  //   //   //                 : null,
  //   //   //             removeRewardIndex: null,
  //   //   //           },
  //   //   //         }
  //   //   //       ),
  //   //   //     ]).send();
  //   //   //     console.log("Food update for", mission.name, signature);
  //   //   //   }
  //   //   // }

  //   //   // if (config.gems && config.gems.skip) {
  //   //   //   const gemsT = gems;
  //   //   //   const gemsIndex = mission.rewards.findIndex(
  //   //   //     (r) => r.isCurrency() && r.currency().address.equals(gemsT.address)
  //   //   //   );

  //   //   //   if (gemsIndex >= 0) {
  //   //   //     const { signature } = await new Operation(honeycomb, [
  //   //   //       // ComputeBudgetProgram.setComputeUnitLimit({
  //   //   //       //   units: 400_000,
  //   //   //       // }),
  //   //   //       createUpdateMissionInstruction(
  //   //   //         {
  //   //   //           project: mission.pool().project().address,
  //   //   //           missionPool: mission.pool().address,
  //   //   //           mission: mission.address,
  //   //   //           delegateAuthority: HPL_NECTAR_MISSIONS_PROGRAM,
  //   //   //           authority: honeycomb.identity().address,
  //   //   //           payer: honeycomb.identity().address,
  //   //   //           vault: VAULT,
  //   //   //           rentSysvar: web3.SYSVAR_RENT_PUBKEY,
  //   //   //           instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //   //   //         },
  //   //   //         {
  //   //   //           args: {
  //   //   //             name: null,
  //   //   //             minXp: null,
  //   //   //             cost: null,
  //   //   //             duration: null,
  //   //   //             addReward: null,
  //   //   //             removeRewardIndex: gemsIndex < 0 ? null : gemsIndex,
  //   //   //           },
  //   //   //         }
  //   //   //       ),

  //   //   //       createUpdateMissionInstruction(
  //   //   //         {
  //   //   //           project: mission.pool().project().address,
  //   //   //           missionPool: mission.pool().address,
  //   //   //           mission: mission.address,
  //   //   //           delegateAuthority: HPL_NECTAR_MISSIONS_PROGRAM,
  //   //   //           authority: honeycomb.identity().address,
  //   //   //           payer: honeycomb.identity().address,
  //   //   //           vault: VAULT,
  //   //   //           rentSysvar: web3.SYSVAR_RENT_PUBKEY,
  //   //   //           instructionsSysvar: web3.SYSVAR_INSTRUCTIONS_PUBKEY,
  //   //   //         },
  //   //   //         {
  //   //   //           args: {
  //   //   //             name: null,
  //   //   //             minXp: null,
  //   //   //             cost: null,
  //   //   //             duration: null,
  //   //   //             addReward:
  //   //   //               gemsIndex >= 0 && config.gems
  //   //   //                 ? {
  //   //   //                     rewardType: {
  //   //   //                       __kind: "Currency",
  //   //   //                       address: gemsT.address,
  //   //   //                     },
  //   //   //                     min: config.gems.min * 10 ** gems.mint.decimals,
  //   //   //                     max: config.gems.max * 10 ** gems.mint.decimals,
  //   //   //                   }
  //   //   //                 : null,
  //   //   //             removeRewardIndex: null,
  //   //   //           },
  //   //   //         }
  //   //   //       ),
  //   //   //     ]).send();
  //   //   //     console.log("Gems update for", mission.name, signature);
  //   //   //   }
  //   //   // }

  //   //   // console.log("Done", mission.name);
  //   // }

  //   // const participationsRaw = await Participation.gpaBuilder()
  //   //   .run(honeycomb.connection)
  //   //   .then(
  //   //     (participations) =>
  //   //       participations
  //   //         .map((participation) => {
  //   //           try {
  //   //             return [
  //   //               participation.pubkey,
  //   //               Participation.fromAccountInfo(participation.account)[0],
  //   //             ] as [web3.PublicKey, Participation];
  //   //           } catch {
  //   //             return null;
  //   //           }
  //   //         })
  //   //         .filter((x) => !!x && x[1].isRecalled === true) as [
  //   //         web3.PublicKey,
  //   //         Participation
  //   //       ][]
  //   //   );
  //   // console.log("Recalled Participations", participationsRaw.length);

  //   const vault = new web3.PublicKey(
  //     "8sN1LJDUhTgJJZ7zkq3WGjgd7MjwHJaBMGD6zF7DNEEi"
  //   );
  //   // const vault = honeycomb.staking().address;
  //   // const vault = honeycomb.missions().address;
  //   // await bail
  //   //   .fetch()
  //   //   .holderAccount(vault)
  //   //   .catch((_) => (bail as HplCurrency).create().holderAccount(vault))
  //   //   .then((hA) => hA.fund(10_000 * 1_000_000_000, { skipPreflight: true }));

  //   await bounty
  //     .fetch()
  //     .holderAccount(vault)
  //     .catch((_) => (bounty as HplCurrency).create().holderAccount(vault))
  //     .then((hA) => hA.mint(1_000_000 * 1_000_000_000));

  //   await ammo
  //     .fetch()
  //     .holderAccount(vault)
  //     .catch((_) => (ammo as HplCurrency).create().holderAccount(vault))
  //     .then((hA) => hA.mint(1_000_000 * 1_000_000_000));

  //   await food
  //     .fetch()
  //     .holderAccount(vault)
  //     .catch((_) => (food as HplCurrency).create().holderAccount(vault))
  //     .then((hA) => hA.mint(1_000_000 * 1_000_000_000));

  //   await gems
  //     .fetch()
  //     .holderAccount(vault)
  //     .catch((_) => (gems as HplCurrency).create().holderAccount(vault))
  //     .then((hA) => hA.mint(1_000_000 * 1_000_000_000));
  // });

  it("Prepare", async () => {
    const temp = await getHoneycomb();

    adminHC = temp.adminHC;
    userHC = temp.userHC;

    console.log("Admin", adminHC.identity().address.toString());

    // Set up Metaplex to mint some NFTs for testing
    metaplex = new Metaplex(adminHC.connection);
    metaplex.use(keypairIdentity(temp.admin));

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
  });

  it("Setup", async () => {
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
          symbol: `TEST`,
          sellerFeeBasisPoints: 100,
          uri: "https://arweave.net/WhyRt90kgI7f0EG9GPfB8TIBTIBgX3X12QaF9ObFerE",
          collection: collection.mint.address,
          collectionAuthority: metaplex.identity(),
          tokenStandard: TokenStandard.NonFungible,
        })
        .then((x) => x.nft);
      nfts.push(nft);

      await metaplex.nfts().transfer({
        nftOrSft: nft,
        toOwner: userHC.identity().address,
      });
    }

    // Create Merkle tree for cNFTs
    const [treeKeypair] = await createNewTree(adminHC);

    // Mint cNFTs
    for (let i = 1; i <= totalcNfts; i++) {
      await mintOneCNFT(adminHC, {
        dropWalletKey: userHC.identity().address.toString(),
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
    adminHC.use(
      await HoneycombProject.new(adminHC, {
        name: "TestProject",
        expectedMintAddresses: nfts.length,
        collections: [collection.mint.address],
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

    userHC.use(
      await HoneycombProject.fromAddress(
        userHC.connection,
        adminHC.project().address
      )
    );

    adminHC.use(
      await HplCurrency.new(adminHC, {
        name: "BAIL",
        symbol: "BAIL",
        kind: PermissionedCurrencyKind.NonCustodial,
        decimals: 9,
        uri: "https://arweave.net/QPC6FYdUn-3V8ytFNuoCS85S2tHAuiDblh6u3CIZLsw",
      })
    );

    userHC.use(
      await HplCurrency.fromAddress(
        userHC.connection,
        adminHC.currency().address
      )
    );

    await adminHC
      .currency()
      .create()
      .holderAccount(userHC.identity().address)
      .then((hA) => hA.mint(10_000 * 1_000_000_000));

    userHolderAccount = await userHC.currency().holderAccount();

    console.log(
      "Project",
      adminHC.project().address.toString(),
      "Currency",
      adminHC.currency().address.toString()
    );
  });

  it.skip("Load Project", async () => {
    const address = new web3.PublicKey(
      "rwDU4NWfAfvrVquzmCeKw8ghZ2ebWpsQyjyhv7Dpfc2"
    );
    adminHC.use(
      await HoneycombProject.fromAddress(adminHC.connection, address)
    );
    await findProjectCurrencies(adminHC.project());

    userHC.use(await HoneycombProject.fromAddress(userHC.connection, address));
    await findProjectCurrencies(userHC.project());
  });

  it("Load/Create Staking Pool", async () => {
    await findProjectStakingPools(adminHC.project());

    if (!adminHC.staking) {
      // Create staking pool
      adminHC.use(
        await NectarStaking.new(
          adminHC,
          {
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
            project: adminHC.project(),
            currency: adminHC.currency(),
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
          },
          { skipPreflight: true }
        )
      );
    }

    (adminHC.staking() as unknown as NectarStaking).helius_rpc =
      "https://devnet.helius-rpc.com/?api-key=014b4690-ef6d-4cab-b9e9-d3ec73610d52";
    // Fund Staking pool vault
    const stakingVault = await adminHC
      .currency()
      .fetch()
      .holderAccount(adminHC.staking().address)
      .catch(() =>
        adminHC.currency().create().holderAccount(adminHC.staking().address)
      );
    await stakingVault.mint(1_000 * 1_000_000_000);
    console.log(
      "Stakinng",
      adminHC.staking().address.toString(),
      stakingVault.tokenAccount.toString()
    );
  });

  it("Load/Create Mission Pool", async () => {
    await findProjectMissionPools(adminHC.project());

    if (!adminHC.missions) {
      adminHC.use(
        await NectarMissions.new(adminHC, {
          args: {
            name: "Missions2.0",
            factionsMerkleRoot: new Array(32).fill(0),
            collections: [collection.mint.address],
          },
        })
      );
    }

    const missionsVault = await adminHC
      .currency()
      .fetch()
      .holderAccount(adminHC.missions().address)
      .catch(() =>
        adminHC.currency().create().holderAccount(adminHC.missions().address)
      );
    await missionsVault.mint(1_000_000 * 1_000_000_000);
    console.log(
      "Missions",
      adminHC.missions().address.toString(),
      missionsVault.tokenAccount.toString()
    );
  });

  it("Load/Create Mission", async () => {
    const missions = await adminHC.missions().missions();

    if (!missions.length) {
      await adminHC
        .missions()
        .create()
        .mission({
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

  it("Fetch or Create user/profile", async () => {
    await userHC
      .identity()
      .user()
      .catch((_) =>
        userHC.identity().create().user({
          username: "MissionTest6",
          name: "MissionTest",
          bio: "This account is used for testing",
          pfp: "https://ottxzxktsovtp7hzlcgxu7ti42ukppp5pzavhy6rkj7v4neiblyq.arweave.net/dOd83VOTqzf8-ViNen5o5qinvf1-QVPj0VJ_XjSICvE?ext=png",
        })
      );

    await userHC
      .identity()
      .profile(userHC.project().address, userHC.identity().address)
      .catch((_) =>
        userHC
          .identity()
          .create()
          .profile(userHC.project().address, userHC.identity().address)
      );

    // console.log("User", user.address.toString(), profile.address.toString());
  });

  it("Stake NFTs", async () => {
    userHC.use(
      await NectarStaking.fromAddress(
        userHC.connection,
        adminHC.staking().address
      )
    );

    const staking = userHC.staking() as unknown as NectarStaking;

    const availableNfts = await staking.fetch().availableNfts();
    console.log("AvailaleNFTs", availableNfts);
    expect(availableNfts.length).toBe(totalNfts + totalcNfts);
    await staking.stake(availableNfts);
    const stakedNfts = await staking.fetch().stakedNfts();
    expect(stakedNfts.length).toBe(totalNfts + totalcNfts);
  });

  it("Participate on Mission", async () => {
    const staking = userHC.staking() as unknown as NectarStaking;

    const stakedNfts = await staking.fetch().stakedNfts();
    console.log("StakedNfts", stakedNfts);
    expect(stakedNfts.length).toBe(totalNfts + totalcNfts);

    userHC.use(
      await NectarStaking.fromAddress(
        userHC.connection,
        adminHC.staking().address
      )
    );

    const participations = await userHC.missions().fetch().participations();
    console.log("Participations", participations.length);

    const nfts = stakedNfts.filter(
      (nft) => !participations.find((p) => p.nft.mint.equals(nft.mint))
    );

    if (nfts.length) {
      const mission = await userHC.missions().mission("Quick Patrol");
      await mission.participate(
        nfts.map((x) => ({
          ...x,
          args: {
            faction: null,
            merkleProof: null,
          },
        })),
        {}
      );
    }
  });

  it("Recall from missions", async () => {
    await wait(1);
    const participations = await userHC.missions().participations();
    expect(participations.length).toBeGreaterThan(0);
    const mission = await userHC.missions().mission("Quick Patrol");
    await mission.recall(participations);
  });

  it("Unstake NFTs", async () => {
    const staking = userHC.staking() as unknown as NectarStaking;

    const stakedNfts = await staking.fetch().stakedNfts();
    expect(stakedNfts.length).toBe(totalNfts + totalcNfts);
    await staking.unstake(stakedNfts, {});
    const availableNfts = await staking.fetch().availableNfts();
    expect(availableNfts.length).toBe(totalNfts + totalcNfts);
  });
});
