// import type { ConfirmOptions } from "@solana/web3.js";
// import type { NectarMission } from "./Mission";
// import type { EarnedReward, Participation } from "./generated";
// import type { StakedNft } from "@honeycomb-protocol/nectar-staking";
// import type { BuzzGuild } from "@honeycomb-protocol/buzz-guild";

// /**
//  * Represents a Nectar Mission Participation.
//  * @category Helpers
//  */
// export abstract class NectarMissionParticipation {
//   /**
//    * Creates a new `NectarMissionParticipation` instance.
//    * @param _mission - The `NectarMission` instance that the participation belongs to.
//    * @param address - The public key address of the participation.
//    * @param _participation - The underlying `Participation` object representing the participation data.
//    * @throws {Error} Throws an error if the participation does not belong to the mission or the staked NFT.
//    */
//   constructor(
//     private _mission: NectarMission,
//     private _participation: Participation
//   ) {}

//   /**
//    * Returns the `NectarMission` instance that the participation belongs to.
//    * @returns The `NectarMission` instance.
//    */
//   public mission() {
//     return this._mission;
//   }

//   public get address() {
//     return this.mission()
//       .pool()
//       .honeycomb()
//       .pda()
//       .missions()
//       .participation(this._participation.instrument.fields[0])[0];
//   }

//   /**
//    * Gets the wallet address associated with the participation.
//    * @returns The wallet address.
//    */
//   public get wallet() {
//     return this._participation.wallet;
//   }

//   /**
//    * Gets the end time of the participation as a `Date`.
//    * @returns The end time of the participation.
//    */
//   public get endTime() {
//     return new Date(Number(this._participation.endTime.toString()) * 1000);
//   }

//   /**
//    * Gets the start time of the participation as a `Date`.
//    * @returns The start time of the participation.
//    */
//   public get startTime() {
//     return new Date(this.endTime.getTime() - this.mission().duration.getTime());
//   }

//   /**
//    * Checks if the participation has ended.
//    * @returns `true` if the participation has ended, `false` otherwise.
//    */
//   public get isEnded() {
//     return this.endTime.getTime() < Date.now();
//   }

//   /**
//    * Checks if the participation has been recalled.
//    * @returns `true` if the participation has been recalled, `false` otherwise.
//    */
//   public get isRecalled() {
//     return this._participation.isRecalled;
//   }

//   /**
//    * Gets the rewards associated with the participation.
//    * @returns An array of `ParticipationReward` or `ParticipationCurrencyRewards` objects representing the rewards.
//    */
//   public get rewards() {
//     return this._participation.rewards.map((r) =>
//       (() => {
//         switch (r.rewardType.__kind) {
//           case "Currency":
//             return new ParticipationCurrencyRewards(this, r);
//           default:
//             return new ParticipationReward(this, r);
//         }
//       })()
//     );
//   }

//   /**
//    * Checks if this participation is an NFT Participation.
//    * @returns true is this participation is an NFT Participation.
//    */
//   public isNft(): this is NectarMissionParticipationNft {
//     return this._participation.instrument.__kind === "Nft";
//   }

//   /**
//    * Checks if this participation is a Guild Participation.
//    * @returns true is this participation is a Guild Participation.
//    */
//   public isGuild(): this is NectarMissionParticipationGuild {
//     return this._participation.instrument.__kind === "Guild";
//   }

//   /**
//    * Recalls the participation from the mission for this instance.
//    * @param confirmOptions - Optional transaction confirmation options.
//    * @returns A promise that resolves to the transaction signature upon successful recall.
//    * @async
//    * @example
//    * // Recall participation for this instance
//    * const recallResult = await nectarMissionParticipation.recall();
//    * console.log(recallResult); // Output: Transaction signature
//    */
//   public recall(confirmOptions?: ConfirmOptions) {
//     return this._mission.recall([this], confirmOptions);
//   }
// }

// /**
//  * Represents a Nectar Mission Participation.
//  * @category Helpers
//  */
// export class NectarMissionParticipationNft extends NectarMissionParticipation {
//   /**
//    * Creates a new `NectarMissionParticipation` instance.
//    * @param _mission - The `NectarMission` instance that the participation belongs to.
//    * @param address - The public key address of the participation.
//    * @param _participation - The underlying `Participation` object representing the participation data.
//    * @param _stakedNft - The `StakedNft` object representing the staked NFT associated with the participation.
//    * @throws {Error} Throws an error if the participation does not belong to the mission or the staked NFT.
//    */
//   constructor(
//     mission: NectarMission,
//     participation: Participation,
//     private _stakedNft: StakedNft
//   ) {
//     super(mission, participation);

//     if (participation.instrument.__kind === "Nft") {
//       if (
//         !mission
//           .pool()
//           .honeycomb()
//           .pda()
//           .staking()
//           .nft(_stakedNft.stakingPool, _stakedNft.mint)[0]
//           .equals(participation.instrument.fields[0])
//       ) {
//         throw new Error("Participation does not belong to nft");
//       }
//     } else {
//       throw new Error("Provided participation is not an NFT participation");
//     }
//   }

//   /**
//    * Gets the staked NFT associated with the participation.
//    * @returns The staked NFT object.
//    */
//   public get nft() {
//     return this._stakedNft;
//   }

//   /**
//    * Gets the address of the staked NFT associated with the participation.
//    * @returns The address of the staked NFT.
//    */
//   public get nftAddress() {
//     return this.mission()
//       .pool()
//       .honeycomb()
//       .pda()
//       .staking()
//       .nft(this.nft.stakingPool, this.nft.mint)[0];
//   }
// }

// /**
//  * Represents a Nectar Mission Participation.
//  * @category Helpers
//  */
// export class NectarMissionParticipationGuild extends NectarMissionParticipation {
//   /**
//    * Creates a new `NectarMissionParticipation` instance.
//    * @param mission - The `NectarMission` instance that the participation belongs to.
//    * @param address - The public key address of the participation.
//    * @param participation - The underlying `Participation` object representing the participation data.
//    * @param guild - The `StakedNft` object representing the staked NFT associated with the participation.
//    * @throws {Error} Throws an error if the participation does not belong to the mission or the staked NFT.
//    */
//   constructor(
//     mission: NectarMission,
//     participation: Participation,
//     private _guild: BuzzGuild
//   ) {
//     super(mission, participation);

//     if (participation.instrument.__kind === "Guild") {
//       if (!_guild.address.equals(participation.instrument.fields[0])) {
//         throw new Error("Participation does not belong to guild");
//       }
//     } else {
//       throw new Error("Provided participation is not a Guild participation");
//     }
//   }

//   /**
//    * Gets the staked NFT associated with the participation.
//    * @returns The staked NFT object.
//    */
//   public get guild() {
//     return this._guild;
//   }
// }

// /**
//  * Represents a Participation Reward.
//  * @category Helpers
//  */
// export class ParticipationReward {
//   /**
//    * Creates a new `ParticipationReward` instance.
//    * @param _participation - The `NectarMissionParticipation` instance that the reward belongs to.
//    * @param _reward - The underlying `EarnedReward` object representing the reward data.
//    */
//   constructor(
//     protected _participation: NectarMissionParticipation,
//     protected _reward: EarnedReward
//   ) {}

//   /**
//    * Gets the amount of the reward.
//    * @returns The amount of the reward.
//    * @example
//    * const participationReward = new ParticipationReward(participation, rewardData);
//    * const amount = participationReward.amount;
//    * console.log(amount); // Output: 100
//    */
//   public get amount() {
//     return this._reward.amount;
//   }

//   /**
//    * Checks if the reward has been collected.
//    * @returns True if the reward has been collected, false otherwise.
//    * @example
//    * const participationReward = new ParticipationReward(participation, rewardData);
//    * const isCollected = participationReward.collected;
//    * console.log(isCollected); // Output: true
//    */
//   public get collected() {
//     return this._reward.collected;
//   }

//   /**
//    * Gets the `NectarMissionParticipation` instance associated with the reward.
//    * @returns The `NectarMissionParticipation` instance.
//    * @example
//    * const participationReward = new ParticipationReward(participation, rewardData);
//    * const participation = participationReward.participation();
//    * console.log(participation.wallet); // Output: Wallet public key of the participant
//    */
//   public participation() {
//     return this._participation;
//   }

//   /**
//    * Checks if the reward is of type `ParticipationCurrencyRewards`.
//    * @returns True if the reward is of type `ParticipationCurrencyRewards`, false otherwise.
//    * @example
//    * const participationReward = new ParticipationReward(participation, rewardData);
//    * if (participationReward.isCurrency()) {
//    *   const currencyReward = participationReward as ParticipationCurrencyRewards;
//    *   const currency = currencyReward.currency();
//    *   console.log(currency.symbol); // Output: "USD" (assuming rewardData.rewardType is of type "Currency")
//    * }
//    */
//   public isCurrency(): this is ParticipationCurrencyRewards {
//     return this._reward.rewardType.__kind === "Currency";
//   }
// }

// /**
//  * Represents a Participation Reward of type `ParticipationCurrencyRewards`.
//  * @category Helpers
//  */
// export class ParticipationCurrencyRewards extends ParticipationReward {
//   constructor(
//     _participation: NectarMissionParticipation,
//     _reward: EarnedReward
//   ) {
//     super(_participation, _reward);
//   }

//   /**
//    * Get the currency associated with the reward.
//    * @returns The currency object.
//    * @throws An error if the reward is not of type "Currency".
//    */
//   public currency() {
//     if (this._reward.rewardType.__kind === "Currency")
//       return this._participation
//         .mission()
//         .pool()
//         .honeycomb()
//         .currency(this._reward.rewardType.address);
//     else throw new Error("Reward is not a currency");
//   }
// }
