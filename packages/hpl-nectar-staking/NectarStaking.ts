// import * as web3 from "@solana/web3.js";
// import {
//   BatchLifeCycle,
//   BulkLifeCycle,
//   ForceScenario,
//   Honeycomb,
//   HoneycombProject,
//   Module,
//   Operation,
//   SendBulkOptions,
//   isPublicKey,
// } from "@honeycomb-protocol/hive-control";
// import { AddMultiplierArgs, PROGRAM_ID, StakingPool } from "./generated";
// import {
//   createAddMultiplierOperation,
//   createClaimRewardsOperation,
//   createStakeOperation,
//   createUnstakeOperation,
//   createUpdatePoolOperation,
// } from "./operations";
// import {
//   NewStakingPoolArgs,
//   StakingMultipliers,
//   UpdatePoolArgs,
// } from "./types";
// import {
//   nectarStakingCreate,
//   nectarStakingFetch,
//   nectarStakingPdas,
// } from "./utils";
// import {
//   HplCharacter,
//   HplCharacterModel,
// } from "@honeycomb-protocol/character-manager";

// declare module "@honeycomb-protocol/hive-control" {
//   interface Honeycomb {
//     //@ts-ignore
//     _stakings: { [key: string]: NectarStaking };
//     staking(nameOrKey?: string | web3.PublicKey): NectarStaking;
//   }
// }

// /**
//  * Represents the Nectar Staking module in the Honeycomb Protocol.
//  * Allows users to interact with staking pools, claim rewards, and manage staked NFTs.
//  * @category Modules
//  */
// export class NectarStaking extends Module<"stake" | "claim" | "unstake"> {
//   readonly programId: web3.PublicKey = PROGRAM_ID;

//   /**
//    * TODO: move helius rpc to hive-control
//    */
//   public helius_rpc: string =
//     "https://rpc.helius.xyz/?api-key=014b4690-ef6d-4cab-b9e9-d3ec73610d52";

//   private _multipliers: StakingMultipliers | null;

//   /**
//    * Create a new instance of NectarStaking based on the provided address.
//    * @param poolAddress - The address of the staking pool.
//    * @param pool - The staking pool details.
//    */
//   constructor(
//     readonly poolAddress: web3.PublicKey,
//     private _pool: StakingPool
//   ) {
//     super();
//   }

//   /**
//    * Create a new instance of NectarStaking based on the provided address.
//    * @param connection - The Solana connection object.
//    * @param poolAddress - The address of the staking pool.
//    * @param commitmentOrConfig - Optional parameter for the commitment or account info config.
//    * @returns A new NectarStaking instance.
//    */
//   static async fromAddress(
//     honeycomb: Honeycomb,
//     address: web3.PublicKey,
//     commitment?: web3.Commitment,
//     forceFetch?: ForceScenario
//   ) {
//     honeycomb.fetch().register(nectarStakingFetch());
//     const pool = await honeycomb
//       .fetch()
//       .staking()
//       .pool(address, commitment, forceFetch);
//     return new NectarStaking(address, pool);
//   }

//   /**
//    * Create a new NectarStaking instance with the provided arguments.
//    * @param honeycomb - The Honeycomb instance.
//    * @param args - The arguments for creating a new staking pool.
//    * @param confirmOptions - Optional transaction confirmation options.
//    * @returns A new NectarStaking instance representing the created staking pool.
//    */
//   static async new(
//     honeycomb: Honeycomb,
//     args: NewStakingPoolArgs,
//     confirmOptions?: web3.ConfirmOptions
//   ) {
//     honeycomb.pda().register(nectarStakingPdas());
//     honeycomb.create().register(nectarStakingCreate());
//     const { stakingPool } = await honeycomb
//       .create()
//       .staking()
//       .pool(args, confirmOptions);
//     return await NectarStaking.fromAddress(honeycomb, stakingPool);
//   }

//   /**
//    * Get the Honeycomb instance associated with this NectarStaking.
//    * @returns The Honeycomb instance.
//    */
//   public honeycomb() {
//     return this._honeycomb;
//   }

//   /**
//    * Get the staking pool details.
//    * @returns The staking pool details.
//    */
//   public pool() {
//     return this._pool;
//   }

//   /**
//    * Get the address of the staking pool.
//    * @returns The address of the staking pool.
//    */
//   public get address() {
//     return this.poolAddress;
//   }

//   /**
//    * Get the lock type of the staking pool.
//    */
//   public get lockType() {
//     return this._pool.lockType;
//   }

//   /**
//    * Get the name of the staking pool.
//    */
//   public get name() {
//     return this._pool.name;
//   }
//   /**
//    * Get the rewards per duration for the staking pool.
//    */
//   public get rewardsPerDuration() {
//     return this._pool.rewardsPerDuration;
//   }

//   /**
//    * Get the rewards duration for the staking pool.
//    */
//   public get rewardsDuration() {
//     return this._pool.rewardsDuration;
//   }

//   /**
//    * Get the maximum rewards duration for the staking pool.
//    */
//   public get maxRewardsDuration() {
//     return this._pool.maxRewardsDuration;
//   }

//   /**
//    * Get the minimum stake duration for the staking pool.
//    */
//   public get minStakeDuration() {
//     return this._pool.minStakeDuration;
//   }

//   /**
//    * Get the cooldown duration for the staking pool.
//    */
//   public get cooldownDuration() {
//     return this._pool.cooldownDuration;
//   }

//   /**
//    * Get the reset stake duration for the staking pool.
//    */
//   public get resetStakeDuration() {
//     return this._pool.resetStakeDuration;
//   }

//   /**
//    * Get the allowed mints for the staking pool.
//    */
//   public get allowedMints() {
//     return this._pool.allowedMints;
//   }

//   /**
//    * Get the total staked amount in the staking pool.
//    */
//   public get totalStaked() {
//     return this._pool.totalStaked;
//   }

//   /**
//    * Get the start time of the staking pool.
//    */
//   public get startTime() {
//     return this._pool.startTime;
//   }

//   /**
//    * Get the end time of the staking pool.
//    */
//   public get endTime() {
//     return this._pool.endTime;
//   }

//   /**
//    * Get the collections associated with the staking pool.
//    */
//   public get collections() {
//     return [...this._pool.collections].map(
//       (i) => this.project().collections[i]
//     );
//   }

//   /**
//    * Get the creators associated with the staking pool.
//    */
//   public get creators() {
//     return [...this._pool.creators].map((i) => this.project().creators[i]);
//   }

//   /**
//    * Get the merkle trees associated with the staking pool.
//    */
//   public get merkleTrees() {
//     return [...this._pool.merkleTrees].map(
//       (i) => this.project().merkleTrees[i]
//     );
//   }

//   /**
//    * Get the HoneycombProject associated with this staking pool.
//    * @returns The HoneycombProject instance.
//    */
//   public project() {
//     return this._honeycomb.project(this._pool.project);
//   }

//   /**
//    * Get the HplCurrency associated with this staking pool.
//    * @returns The HplCurrency instance.
//    */
//   public currency() {
//     return this._honeycomb.currency(this._pool.currency);
//   }

//   /**
//    * Get the vault of the staking pool currency.
//    * @returns The vault account address.
//    */
//   public vault() {
//     return this.currency().holderAccount(this.address);
//   }

//   /**
//    * Get the multipliers associated with the staking pool.
//    * @param reFetch - If true, re-fetch the data from the blockchain.
//    * @returns A Promise that resolves with the multipliers data.
//    */
//   public async multipliers(
//     commitment?: web3.Commitment,
//     forceFetch?: ForceScenario
//   ): Promise<StakingMultipliers | null> {
//     const [address] = this.honeycomb()
//       .pda()
//       .staking()
//       .multipliers(this.address, this.programId);
//     return {
//       address,
//       ...(await this.honeycomb()
//         .fetch()
//         .staking()
//         .multipliers(address, commitment, forceFetch)),
//     };
//   }

//   /**
//    * Get the staker associated with the staking pool.
//    * @param args - Optional object containing either wallet address or staker address.
//    * @param reFetch - If true, re-fetch the data from the blockchain.
//    * @returns A Promise that resolves with the Staker instance.
//    */
//   public async staker(
//     commitment?: web3.Commitment,
//     forceFetch?: ForceScenario
//   ) {
//     const [staker] = this.honeycomb()
//       .pda()
//       .staking()
//       .staker(
//         this.address,
//         this.honeycomb().identity().address,
//         this.programId
//       );
//     return this.honeycomb()
//       .fetch()
//       .staking()
//       .staker(staker, commitment, forceFetch);
//   }

//   /**
//    * Reload the data associated with the staking pool, including multipliers, stakers, available NFTs, and staked NFTs.
//    * @returns A Promise that resolves when all data is reloaded.
//    */
//   public reloadData() {
//     return Promise.all([
//       this.multipliers(undefined, ForceScenario.ConsiderNull).catch((e) =>
//         console.error(e)
//       ),
//       this.staker(undefined, ForceScenario.Force).catch((e) =>
//         console.error(e)
//       ),
//     ]);
//   }

//   /**
//    * Update the staking pool with new parameters.
//    * @param args - The arguments for updating the staking pool.
//    * @param confirmOptions - Optional transaction confirmation options.
//    * @returns A Promise that resolves with the context of the transaction.
//    */
//   public async updatePool(
//     args: UpdatePoolArgs,
//     confirmOptions?: web3.ConfirmOptions
//   ) {
//     const { operation } = await createUpdatePoolOperation(this.honeycomb(), {
//       project: this.project().address,
//       stakingPool: this.address,
//       programId: this.programId,
//       ...args,
//     });
//     const context = await operation.send(confirmOptions);
//     return context;
//   }

//   /**
//    * Add a new multiplier to the staking pool.
//    * @param args - The arguments for adding the multiplier.
//    * @param confirmOptions - Optional transaction confirmation options.
//    * @returns A promise that resolves when the transaction is confirmed.
//    */
//   public async addMultiplier(
//     args: AddMultiplierArgs,
//     confirmOptions?: web3.ConfirmOptions
//   ) {
//     const { operation } = await createAddMultiplierOperation(this.honeycomb(), {
//       args,
//       project: this.project().address,
//       stakingPool: this.address,
//       programId: this.programId,
//     });
//     return operation.send(confirmOptions);
//   }

//   /**
//    * Initialize the staker account for the staking pool.
//    * @param confirmOptions - Optional transaction confirmation options.
//    * @returns A promise that resolves when the transaction is confirmed.
//    */
//   public async newStaker(confirmOptions?: web3.ConfirmOptions) {
//     await this.honeycomb()
//       .create()
//       .staking()
//       .staker(
//         this.address,
//         this.honeycomb().identity().address,
//         confirmOptions
//       );
//     return this.staker(undefined, ForceScenario.Force);
//   }

//   public get initStaker() {
//     return this.newStaker;
//   }

//   /**
//    * Stake NFTs in the staking pool.
//    * @param nfts - The NFTs to stake.
//    * @param confirmOptions - Optional transaction confirmation options.
//    * @returns A promise that resolves with an array of responses for the transactions.
//    */
//   public async stake(
//     characterModel: HplCharacterModel,
//     _characters: HplCharacter[],
//     options: web3.ConfirmOptions & SendBulkOptions = {}
//   ) {
//     let characters: HplCharacter[] = _characters.filter(
//       (character) => character.usedBy.__kind == "None"
//     );
//     // await fetchAssetProofBatch(
//     //   this.helius_rpc,
//     //   _characters
//     //     .filter((n) => n.isCompressed && !n.compression.proof)
//     //     .map((n) => n.mint)
//     // ).then((proofs) => {
//     //   nfts = _characters.map((nft) => {
//     //     if (nft.compression) {
//     //       return {
//     //         ...nft,
//     //         compression: {
//     //           ...nft.compression,
//     //           proof: proofs[nft.mint.toString()] || nft.compression.proof,
//     //         },
//     //       };
//     //     } else {
//     //       return nft;
//     //     }
//     //   });
//     // });

//     // this.cache.updateSync(
//     //   "availableNfts",
//     //   this.honeycomb().identity().address.toString(),
//     //   (availableNfts) => {
//     //     if (!availableNfts) availableNfts = new Map();
//     //     characters.forEach((character) => {
//     //       if (character.isCompressed) availableNfts.set(nft.mint.toString(), nft);
//     //     });
//     //     return availableNfts;
//     //   }
//     // );

//     const operations = await Promise.all(
//       characters.map((character, i) =>
//         createStakeOperation(
//           this.honeycomb(),
//           {
//             stakingPool: this,
//             characterModel,
//             character,
//             isFirst: i == 0,
//             programId: this.programId,
//           },
//           this.getLuts("stake")
//         ).then(({ operation }) => operation)
//       )
//     );
//     const instance = this;
//     let promises: Promise<any>[] = [];

//     return Operation.sendBulk(this.honeycomb(), operations, {
//       prepareAllAtOnce: characters.length < 11,
//       ...options,
//       statusUpdate(status) {
//         if (options.statusUpdate) options.statusUpdate(status);

//         if (
//           status.status !== BulkLifeCycle.Main ||
//           status.main.currentBatchStatus !== BatchLifeCycle.Completed
//         )
//           return;

//         // const startsFrom = Math.max(
//         //   status.main.confirmedContexts.length - (options.batchSize || 10),
//         //   0
//         // );

//         // const processedNfts: Map<string, HplCharacter> = new Map();
//         // status.main.confirmedContexts.slice(startsFrom).forEach((c, ind) => {
//         //   if (!("confirmationFailed" in c.confirmResponse)) {
//         //     if (c.confirmResponse.value.err)
//         //       console.log(
//         //         "Error staking mint",
//         //         characters[startsFrom + ind].mint.toString(),
//         //         c.confirmResponse.value.err
//         //       );
//         //     else
//         //       processedNfts.set(
//         //         characters[startsFrom + ind].mint.toString(),
//         //         characters[startsFrom + ind]
//         //       );
//         //   }
//         // });

//         // instance.cache.updateSync(
//         //   "availableNfts",
//         //   instance.honeycomb().identity().address.toString(),
//         //   (nfts) => {
//         //     if (!nfts) nfts = new Map();
//         //     processedNfts.forEach((_, key) => {
//         //       nfts.delete(key);
//         //     });
//         //     return nfts;
//         //   }
//         // );

//         // promises.push(
//         //   instance
//         //     .honeycomb()
//         //     .fetch()
//         //     .staking()
//         //     .nfts(
//         //       instance.address,
//         //       Array.from(processedNfts.keys()).map((n) => new web3.PublicKey(n))
//         //     )
//         //     .then((nfts) => {
//         //       instance.cache.updateSync(
//         //         "stakedNfts",
//         //         instance.honeycomb().identity().address.toString(),
//         //         (currentStakedNfts) => {
//         //           if (!currentStakedNfts) currentStakedNfts = new Map();
//         //           nfts.forEach((nft) => {
//         //             const mintStr = nft.mint.toString();
//         //             const processedNft = processedNfts.get(mintStr);
//         //             processedNft.compression &&
//         //               (processedNft.compression.proof = null);
//         //             currentStakedNfts.set(mintStr, {
//         //               ...processedNft,
//         //               ...nft,
//         //             });
//         //           });
//         //           return currentStakedNfts;
//         //         }
//         //       );
//         //     })
//         // );
//       },
//     }).then((x) =>
//       Promise.all(promises).then(() =>
//         this.staker(undefined, ForceScenario.Force).then(() => x)
//       )
//     );
//   }

//   /**
//    * Claim rewards for staked NFTs.
//    * @param nfts - The staked NFTs to claim rewards for.
//    * @param confirmOptions - Optional transaction confirmation options.
//    * @returns A promise that resolves with an array of responses for the transactions.
//    */
//   public async claim(
//     characterModel: HplCharacterModel,
//     _characters: HplCharacter[],
//     options: web3.ConfirmOptions & SendBulkOptions = {}
//   ) {
//     const characters = _characters.filter(
//       (character) => character.usedBy.__kind == "Staking"
//     );
//     const operations = await Promise.all(
//       characters.map((character, i) =>
//         createClaimRewardsOperation(
//           this.honeycomb(),
//           {
//             stakingPool: this,
//             characterModel,
//             character,
//             programId: this.programId,
//           },
//           this.getLuts("claim")
//         ).then(({ operation }) => operation)
//       )
//     );

//     return Operation.sendBulk(this.honeycomb(), operations, {
//       prepareAllAtOnce: characters.length < 11,
//       ...options,
//     });
//   }

//   /**
//    * Unstake NFTs from the staking pool.
//    * @param nfts - The staked NFTs to unstake.
//    * @param confirmOptions - Optional transaction confirmation options.
//    * @returns A promise that resolves with an array of responses for the transactions.
//    */
//   public async unstake(
//     characterModel: HplCharacterModel,
//     _characters: HplCharacter[],
//     options: web3.ConfirmOptions & SendBulkOptions = {}
//   ) {
//     const characters = _characters.filter(
//       (character) => character.usedBy.__kind == "Staking"
//     );
//     // await fetchAssetProofBatch(
//     //   this.helius_rpc,
//     //   _nfts
//     //     .filter((n) => n.isCompressed && !n.compression.proof)
//     //     .map((n) => n.mint)
//     // ).then((proofs) => {
//     //   nfts = _nfts.map((nft) => {
//     //     if (nft.compression) {
//     //       return {
//     //         ...nft,
//     //         compression: {
//     //           ...nft.compression,
//     //           proof: proofs[nft.mint.toString()] || nft.compression.proof,
//     //         },
//     //       };
//     //     } else {
//     //       return nft;
//     //     }
//     //   });
//     // });

//     // this.cache.updateSync(
//     //   "stakedNfts",
//     //   this.honeycomb().identity().address.toString(),
//     //   (stakedNfts) => {
//     //     if (!stakedNfts) stakedNfts = new Map();
//     //     nfts.forEach((nft) => {
//     //       if (nft.isCompressed) stakedNfts.set(nft.mint.toString(), nft);
//     //     });
//     //     return stakedNfts;
//     //   }
//     // );

//     const operations = await Promise.all(
//       characters.map((character, i) =>
//         createUnstakeOperation(
//           this.honeycomb(),
//           {
//             stakingPool: this,
//             characterModel,
//             character,
//             isFirst: i == 0,
//             programId: this.programId,
//           },
//           this.getLuts("unstake")
//         ).then(({ operation }) => operation)
//       )
//     );
//     const instance = this;
//     return Operation.sendBulk(this.honeycomb(), operations, {
//       prepareAllAtOnce: characters.length < 11,
//       ...options,
//       statusUpdate(status) {
//         if (options.statusUpdate) options.statusUpdate(status);

//         if (
//           status.status !== BulkLifeCycle.Main ||
//           status.main.currentBatchStatus !== BatchLifeCycle.Completed
//         )
//           return;

//         // const startsFrom = Math.max(
//         //   status.main.confirmedContexts.length - (options.batchSize || 10),
//         //   0
//         // );

//         // const processedNfts: Map<string, AvailableNft> = new Map();
//         // status.main.confirmedContexts.slice(startsFrom).forEach((c, ind) => {
//         //   if (!("confirmationFailed" in c.confirmResponse))
//         //     processedNfts.set(
//         //       nfts[startsFrom + ind].mint.toString(),
//         //       nfts[startsFrom + ind]
//         //     );
//         // });

//         // instance.cache.updateSync(
//         //   "stakedNfts",
//         //   instance.honeycomb().identity().address.toString(),
//         //   (nfts) => {
//         //     if (!nfts) nfts = new Map();
//         //     processedNfts.forEach((_, key) => {
//         //       nfts.delete(key);
//         //     });
//         //     return nfts;
//         //   }
//         // );

//         // instance.cache.updateSync(
//         //   "availableNfts",
//         //   instance.honeycomb().identity().address.toString(),
//         //   (nfts) => {
//         //     if (!nfts) nfts = new Map();
//         //     processedNfts.forEach((nft) => {
//         //       const mintStr = nft.mint.toString();
//         //       nft.compression && (nft.compression.proof = null);

//         //       const alreadyThereNft = nfts.get(mintStr);
//         //       alreadyThereNft?.compression &&
//         //         (alreadyThereNft.compression.proof = null);

//         //       nfts.set(mintStr, {
//         //         ...nft,
//         //         ...alreadyThereNft,
//         //       });
//         //     });
//         //     return nfts;
//         //   }
//         // );
//       },
//     }).then((x) => this.staker(undefined, ForceScenario.Force).then(() => x));
//   }

//   // public async rewards(nfts?: StakedNft[], till?: Date) {
//   //   if (!nfts) nfts = await this.stakedNfts();
//   //   this.multipliers(undefined, ForceScenario.ConsiderNull);
//   //   const rewards = await Promise.all(
//   //     nfts.map((nft) => this.honeycomb().fetch().staking().rewards(nft, till))
//   //   );
//   //   return rewards.reduce((a, b) => a + b.rewards, 0);
//   // }

//   /**
//    * Install the NectarStaking module into the Honeycomb instance.
//    * @param honeycomb - The Honeycomb instance to install the module into.
//    * @returns The updated Honeycomb instance with the NectarStaking module installed.
//    */
//   public install(honeycomb: Honeycomb): Honeycomb {
//     if (!honeycomb._stakings) {
//       honeycomb._stakings = {};
//       honeycomb.pda().register(nectarStakingPdas());
//       honeycomb.fetch().register(nectarStakingFetch());
//       honeycomb.create().register(nectarStakingCreate());
//     }
//     honeycomb._stakings[this.poolAddress.toString()] = this;

//     honeycomb.staking = (nameOrKey?: string | web3.PublicKey) => {
//       if (nameOrKey) {
//         if (typeof nameOrKey === "string") {
//           return Object.values(honeycomb._stakings).find(
//             (s) => s.name === nameOrKey
//           );
//         } else {
//           return honeycomb._stakings[nameOrKey.toString()];
//         }
//       } else {
//         return this;
//       }
//     };

//     this._honeycomb = honeycomb;
//     return honeycomb;
//   }
// }

// /**
//  * Creates a new NectarStaking instance or retrieves an existing one from the provided Honeycomb instance.
//  * If a web3.PublicKey is provided as the `args`, it will retrieve the existing NectarStaking instance
//  * associated with that pool address. Otherwise, it will create a new staking pool using the provided arguments.
//  * @category Factory
//  * @param honeycomb - The Honeycomb instance.
//  * @param args - Either a web3.PublicKey representing an existing staking pool address, or an object of type NewStakingPoolArgs for creating a new staking pool.
//  * @returns A Promise that resolves with the NectarStaking instance representing the created or retrieved staking pool.
//  */
// export const nectarStakingModule = (
//   honeycomb: Honeycomb,
//   args: web3.PublicKey | NewStakingPoolArgs
// ) =>
//   isPublicKey(args)
//     ? NectarStaking.fromAddress(honeycomb, args)
//     : NectarStaking.new(honeycomb, args);

// /**
//  * Find staking pools associated with a specific HoneycombProject instance.
//  * It searches for staking pools that have the project's address as the associated project.
//  * @category Factory
//  * @param project - The HoneycombProject instance.
//  * @returns A Promise that resolves with the updated Honeycomb instance with staking pool data.
//  */
// export const findProjectStakingPools = (project: HoneycombProject) =>
//   StakingPool.gpaBuilder()
//     .addFilter("project", project.address)
//     .run(project.honeycomb().processedConnection)
//     .then((currencies) =>
//       currencies.map((c) => {
//         try {
//           project
//             .honeycomb()
//             .use(
//               new NectarStaking(
//                 c.pubkey,
//                 StakingPool.fromAccountInfo(c.account)[0]
//               )
//             );
//         } catch {
//           return null;
//         }
//       })
//     )
//     .then((_) => project.honeycomb());
