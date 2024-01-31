// import { Commitment, PublicKey } from "@solana/web3.js";
// import { Multipliers, Staker, StakingPool } from "../generated";
// import {
//   FetchModule,
//   FetchClient,
//   ForceScenario,
// } from "@honeycomb-protocol/hive-control";
// import { HplCharacter } from "@honeycomb-protocol/character-manager";

// /**
//  * Extends the Honeycomb interface with the `fetch` method to access the NectarStakingFetchClient.
//  */
// declare module "@honeycomb-protocol/hive-control" {
//   interface FetchModule {
//     staking(): NectarStakingFetchClient;
//   }
// }

// /**
//  * Represents the Fetch Module which contains boiler plates for fetching NectarStaking accounts.
//  * @category Modules
//  */
// export class NectarStakingFetchClient extends FetchClient {
//   /**
//    * Creates a new instance of the NectarStakingFetchClient.
//    */
//   constructor() {
//     super();
//   }

//   /**
//    * Creates an instance of HoneycombProject using the provided connection and project address.
//    * @param address - The public address of the Public Info account.
//    * @param commitment The Solana block commitment.
//    * @param forceFetch Wether to use cache data or forcefully refetch.
//    * @returns An instance of HoneycombProject.
//    */
//   public async pool(
//     address: PublicKey,
//     commitment: Commitment = "processed",
//     forceFetch?: ForceScenario
//   ): Promise<StakingPool | null> {
//     try {
//       return StakingPool.fromAccountInfo(
//         await this.getAccount(address, { forceFetch, commitment })
//       )[0];
//     } catch {
//       return null;
//     }
//   }

//   /**
//    * Creates an instance of HoneycombProject using the provided connection and project address.
//    * @param address - The public address of the Public Info account.
//    * @param commitment The Solana block commitment.
//    * @param forceFetch Wether to use cache data or forcefully refetch.
//    * @returns An instance of HoneycombProject.
//    */
//   public async multipliers(
//     address: PublicKey,
//     commitment: Commitment = "processed",
//     forceFetch?: ForceScenario
//   ): Promise<Multipliers | null> {
//     try {
//       return Multipliers.fromAccountInfo(
//         await this.getAccount(address, { forceFetch, commitment })
//       )[0];
//     } catch {
//       return null;
//     }
//   }

//   /**
//    * Creates an instance of HoneycombProject using the provided connection and project address.
//    * @param address - The public address of the Public Info account.
//    * @param commitment The Solana block commitment.
//    * @param forceFetch Wether to use cache data or forcefully refetch.
//    * @returns An instance of HoneycombProject.
//    */
//   public async staker(
//     address: PublicKey,
//     commitment: Commitment = "processed",
//     forceFetch?: ForceScenario
//   ): Promise<Staker | null> {
//     try {
//       return Staker.fromAccountInfo(
//         await this.getAccount(address, { forceFetch, commitment })
//       )[0];
//     } catch {
//       return null;
//     }
//   }

//   public async rewards(character: HplCharacter, till = new Date()) {
//     if (character.usedBy.__kind !== "Staking")
//       return { rewards: 0, multipliers: 0 };

//     const staking = this.honeycomb().staking(character.usedBy.pool);
//     const staker = await this.staker(character.usedBy.staker);
//     let secondsElapsed =
//       till.getTime() / 1000 - Number(character.usedBy.claimedAt);

//     const maxRewardsDuration =
//       staking.maxRewardsDuration && Number(staking.maxRewardsDuration);
//     if (maxRewardsDuration && maxRewardsDuration < secondsElapsed) {
//       secondsElapsed = maxRewardsDuration;
//     }

//     const rewardsPerSecond =
//       Number(staking.rewardsPerDuration) / Number(staking.rewardsDuration);
//     let rewardsAmount = rewardsPerSecond * secondsElapsed;

//     let multipliersDecimals = 1;
//     let totalMultipliers = multipliersDecimals;

//     const multipliers = await staking.multipliers(
//       undefined,
//       ForceScenario.ConsiderNull
//     );
//     if (multipliers) {
//       multipliersDecimals = 10 ** multipliers.decimals;
//       totalMultipliers = multipliersDecimals;

//       let durationMultiplier = multipliersDecimals;
//       for (const multiplier of multipliers.durationMultipliers) {
//         if (
//           multiplier.multiplierType.__kind === "StakeDuration" &&
//           secondsElapsed < Number(multiplier.multiplierType.minDuration)
//         ) {
//           durationMultiplier = Number(multiplier.value);
//         } else {
//           break;
//         }
//       }
//       durationMultiplier -= multipliersDecimals;
//       totalMultipliers += durationMultiplier;

//       let countMultiplier = multipliersDecimals;
//       for (const multiplier of multipliers.countMultipliers) {
//         if (
//           multiplier.multiplierType.__kind === "NFTCount" &&
//           Number(multiplier.multiplierType.minCount) <=
//             Number(staker.totalStaked)
//         ) {
//           countMultiplier = Number(multiplier.value);
//         } else {
//           break;
//         }
//       }
//       countMultiplier -= multipliersDecimals;
//       totalMultipliers += countMultiplier;

//       let creatorMultiplier = multipliersDecimals;
//       for (const multiplier of multipliers.creatorMultipliers) {
//         if (
//           multiplier.multiplierType.__kind === "Creator" &&
//           character.source.criteria.__kind === "Creator" &&
//           character.source.criteria[0].equals(multiplier.multiplierType.creator)
//         ) {
//           creatorMultiplier = Number(multiplier.value);
//           break;
//         }
//       }
//       creatorMultiplier -= multipliersDecimals;
//       totalMultipliers += creatorMultiplier;

//       let collectionMultiplier = multipliersDecimals;
//       for (const multiplier of multipliers.collectionMultipliers) {
//         if (
//           multiplier.multiplierType.__kind === "Collection" &&
//           character.source.criteria.__kind === "Collection" &&
//           character.source.criteria[0].equals(
//             multiplier.multiplierType.collection
//           )
//         ) {
//           collectionMultiplier = Number(multiplier.value);
//           break;
//         }
//       }
//       collectionMultiplier -= multipliersDecimals;
//       totalMultipliers += collectionMultiplier;
//     }
//     rewardsAmount = (rewardsAmount * totalMultipliers) / multipliersDecimals;

//     return {
//       rewards: rewardsAmount,
//       multipliers: totalMultipliers / multipliersDecimals,
//     };
//   }

//   /**
//    * Installs the NectarStakingFetchClient into the FetchModule instance.
//    *
//    * @param fetchModule - The FetchModule instance to install the module into.
//    * @returns The modified FetchModule instance with the NectarStakingFetchClient installed.
//    */
//   public install(fetchModule: FetchModule): FetchModule {
//     this._fetchModule = fetchModule;
//     fetchModule.staking = () => this;
//     return fetchModule;
//   }
// }

// /**
//  * Factory function to create a new instance of the NectarStakingFetchClient.
//  * @category Factory
//  * @returns A new instance of the NectarStakingFetchClient.
//  */
// export const nectarStakingFetch = () => new NectarStakingFetchClient();
