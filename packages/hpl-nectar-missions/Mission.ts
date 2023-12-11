import type { ConfirmOptions } from "@solana/web3.js";
import type { NectarMissions } from "./NectarMissions";
import type {
  Mission,
  ParticipateArgs,
  Reward,
  UpdateMissionArgs,
} from "./generated";
import {
  createParticipateOperation,
  createUpdateMissionOperation,
} from "./operations";
import type { StakedNft } from "@honeycomb-protocol/nectar-staking";
import { Operation, SendBulkOptions } from "@honeycomb-protocol/hive-control";
import type {
  NectarMissionParticipation,
  ParticipationCurrencyRewards,
} from "./Participation";

/**
 * Represents a Nectar Mission.
 * @category Helpers
 */
export class NectarMission {
  /**
   * Creates a new `NectarMission` instance.
   * @param _pool - The `NectarMissions` instance that the mission belongs to.
   * @param address - The public key address of the mission.
   * @param _mission - The underlying `Mission` object representing the mission data.
   * @throws {Error} Throws an error if the mission does not belong to the pool.
   */
  constructor(private _pool: NectarMissions, private _mission: Mission) {
    if (!_pool.address.equals(_mission.missionPool)) {
      throw new Error("Mission does not belong to pool");
    }
  }

  /**
   * Returns the `NectarMissions` instance that the mission belongs to.
   * @returns The `NectarMissions` instance.
   */
  public pool() {
    return this._pool;
  }

  public get address() {
    return this.pool()
      .honeycomb()
      .pda()
      .missions()
      .mission(this.pool().address, this.name)[0];
  }

  /**
   * Gets the name of the mission.
   * @returns The name of the mission.
   */
  public get name() {
    return this._mission.name;
  }

  /**
   * Gets the mission requirements.
   * @returns The mission requirements.
   */
  public get requirements() {
    return {
      minXp: this._mission.minXp,
      cost: {
        amount: this._mission.cost.amount,
        currency: () =>
          this.pool().honeycomb().currency(this._mission.cost.address),
      },
    };
  }

  /**
   * Gets the duration of the mission.
   * @returns The duration of the mission as a `Date`.
   */
  public get duration() {
    return new Date(Number(this._mission.duration.toString()) * 1000);
  }

  /**
   * Gets the rewards associated with the mission.
   * @returns An array of `MissionReward` or `MissionCurrencyRewards` objects representing the rewards.
   */
  public get rewards() {
    return this._mission.rewards.map((r) =>
      (() => {
        switch (r.rewardType.__kind) {
          case "Currency":
            return new MissionCurrencyRewards(this, r);
          default:
            return new MissionReward(this, r);
        }
      })()
    );
  }

  /**
   * Updates this missions config.
   * @param args - The arguments to update the mission.
   * @param confirmOptions - Optional transaction confirmation options.
   * @returns A promise that resolves to the operation context.
   * @async
   * @example
   * // Update mission
   * const updateMissionArgs = {
   *   name: "MissionABC",
   * };
   * const { signature } = await mission.update(updateMissionArgs);
   * console.log(signature); // Output: Transaction signature
   */
  public async update(
    args: UpdateMissionArgs,
    confirmOptions?: ConfirmOptions
  ) {
    const { operation } = await createUpdateMissionOperation(
      this.pool().honeycomb(),
      {
        args,
        mission: this,
        programId: this.pool().programId,
      }
    );
    return operation.send(confirmOptions);
  }

  /**
   * Participates in the mission by staking NFTs.
   * @param nfts - An array of staked NFTs along with their participation arguments.
   * @param confirmOptions - Optional transaction confirmation options.
   * @returns A promise that resolves to an array of transaction signatures upon successful participation.
   * @async
   * @example
   * // Participate in a mission by staking NFTs
   * const nftsToStake = [
   *   { nft: stakedNft1, args: participateArgs1 },
   *   { nft: stakedNft2, args: participateArgs2 },
   *   // Add more NFTs to stake as needed
   * ];
   * const participationResult = await nectarMission.participate(nftsToStake);
   * console.log(participationResult); // Output: Array of transaction signatures
   */
  public async participate(
    nfts: (StakedNft & { args: ParticipateArgs })[],
    options: ConfirmOptions & SendBulkOptions = {}
  ) {
    const operations = await Promise.all(
      nfts.map((nft, i) =>
        createParticipateOperation(
          this.pool().honeycomb(),
          {
            args: nft.args,
            mission: this,
            nft,
            isFirst: i === 0,
            programId: this.pool().programId,
          },
          this.pool().getLuts("participate")
        ).then(({ operation }) => operation)
      )
    );

    return Operation.sendBulk(this.pool().honeycomb(), operations, {
      prepareAllAtOnce: nfts.length < 5,
      ...options,
    });
  }

  /**
   * Recalls the participation from the mission for the provided participations.
   * @param participations - An array of `NectarMissionParticipation` instances representing the participations to recall.
   * @param confirmOptions - Optional transaction confirmation options.
   * @returns A promise that resolves to the transaction signature upon successful recall.
   * @async
   * @example
   * // Recall participation from the mission for specific participations
   * const participationsToRecall = [participation1, participation2];
   * const recallResult = await nectarMission.recall(participationsToRecall);
   * console.log(recallResult); // Output: Transaction signature
   */
  public async recall(
    participations: NectarMissionParticipation[],
    confirmOptions?: ConfirmOptions
  ) {
    return this.pool().recall(participations, confirmOptions);
  }
}

/**
 * Represents a Mission Reward.
 * @category Helpers
 */
export class MissionReward {
  /**
   * Creates a new `MissionReward` instance.
   * @param _mission - The `NectarMission` instance that the reward belongs to.
   * @param _reward - The underlying `Reward` object representing the reward data.
   */
  constructor(protected _mission: NectarMission, protected _reward: Reward) {}

  /**
   * Gets the minimum amount of the reward.
   * @returns The minimum amount.
   */
  public get min() {
    return this._reward.min;
  }

  /**
   * Gets the maximum amount of the reward.
   * @returns The maximum amount.
   */
  public get max() {
    return this._reward.max;
  }

  /**
   * Checks if the reward is of type `ParticipationCurrencyRewards`.
   * @returns `true` if the reward is of type `ParticipationCurrencyRewards`, `false` otherwise.
   */
  public isCurrency(): this is ParticipationCurrencyRewards {
    return this._reward.rewardType.__kind === "Currency";
  }

  /**
   * Gets the user interface (UI) amount representation of the reward.
   * @returns The UI amount string.
   * @example
   * // Example 1:
   * const reward = new MissionReward(mission, rewardData);
   * console.log(reward.uiAmount); // Output: "5" (if rewardData.min and rewardData.max are both 5000000000)
   *
   * // Example 2:
   * const reward = new MissionReward(mission, rewardData);
   * console.log(reward.uiAmount); // Output: "1-10" (if rewardData.min is 1000000000 and rewardData.max is 10000000000)
   */
  public get uiAmount() {
    const min = parseInt(this.min.toString());
    const max = parseInt(this.max.toString());
    if (this.isCurrency()) {
      const decimals = 10 ** this.currency().mint.decimals;
      if (min === max) return (min / decimals).toString();
      return `${min / decimals}-${max / decimals}`;
    } else {
      if (min === max) return min.toString();
      return `${min}-${max}`;
    }
  }
}

/**
 * Represents a Mission Reward of type `MissionCurrencyRewards`.
 * @category Helpers
 */
export class MissionCurrencyRewards extends MissionReward {
  /**
   * Creates a new `MissionCurrencyRewards` instance.
   * @param _mission - The `NectarMission` instance that the reward belongs to.
   * @param _reward - The underlying `Reward` object representing the reward data.
   */
  constructor(_mission: NectarMission, _reward: Reward) {
    super(_mission, _reward);
  }

  /**
   * Gets the currency associated with the reward.
   * @returns The currency instance.
   * @throws {Error} If the reward is not a currency.
   * @example
   * const currencyReward = new MissionCurrencyRewards(mission, rewardData);
   * const currency = currencyReward.currency();
   * console.log(currency.symbol); // Output: "USD" (assuming rewardData.rewardType.address points to a valid currency token)
   */
  public currency() {
    if (this._reward.rewardType.__kind === "Currency") {
      return this._mission
        .pool()
        .honeycomb()
        .currency(this._reward.rewardType.address);
    } else {
      throw new Error("Reward is not a currency");
    }
  }
}
