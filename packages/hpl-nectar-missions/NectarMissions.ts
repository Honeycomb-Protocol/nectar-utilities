import * as web3 from "@solana/web3.js";
import { EarnedReward, Mission, MissionPool, Participation } from "./generated";
import { Honeycomb, Module } from "@honeycomb-protocol/hive-control";
import { StakedNft, getNftPda } from "packages/hpl-nectar-staking";

declare module "@honeycomb-protocol/hive-control" {
  interface Honeycomb {
    _missions: { [key: string]: NectarMissions };
    missions(key?: string | web3.PublicKey): NectarMissions;
  }
}

export class NectarMissions extends Module {
  private _missions: { [key: string]: NectarMission } = {};

  constructor(readonly address: web3.PublicKey, private _pool: MissionPool) {
    super();
  }

  public get name() {
    return this._pool.name;
  }

  public project() {
    return this._honeycomb.project(this._pool.project);
  }

  public mission(key: string | web3.PublicKey) {
    return this._missions[key instanceof web3.PublicKey ? key.toString() : key];
  }

  public install(honeycomb: Honeycomb): Honeycomb {
    if (!honeycomb._stakings) {
      honeycomb._stakings = {};
    }
    honeycomb._missions[this.address.toString()] = this;

    honeycomb.missions = (key?: string | web3.PublicKey) => {
      if (key) {
        return honeycomb._missions[
          key instanceof web3.PublicKey ? key.toString() : key
        ];
      } else {
        return this;
      }
    };

    this._honeycomb = honeycomb;
    return honeycomb;
  }
}

export class NectarMission {
  constructor(
    private _pool: NectarMissions,
    readonly address: web3.PublicKey,
    private _mission: Mission
  ) {
    if (_pool.address != _mission.missionPool) {
      throw new Error("Mission does not belong to pool");
    }
  }

  public pool() {
    return this._pool;
  }

  public get name() {
    return this._mission.name;
  }

  public get requirements() {
    return {
      minXp: this._mission.minXp,
      cost: this._mission.cost,
    };
  }

  public get duration() {
    return new Date(Number(this._mission.duration.toString()) * 1000);
  }

  public get rewards() {
    return this._mission.rewards;
  }
}

export class NectarMissionParticipation {
  constructor(
    private _mission: NectarMission,
    readonly address: web3.PublicKey,
    private _participation: Participation,
    private _stakedNft: StakedNft
  ) {
    if (_mission.address != _participation.mission) {
      throw new Error("Participation does not belong to mission");
    }

    if (
      !getNftPda(_stakedNft.stakingPool, _stakedNft.mint)[0].equals(
        _participation.nft
      )
    ) {
      throw new Error("Participation does not belong to nft");
    }
  }

  public mission() {
    return this._mission;
  }

  public get wallet() {
    return this._participation.wallet;
  }

  public get nft() {
    return this._stakedNft;
  }

  public get nftAddress() {
    return getNftPda(this._stakedNft.stakingPool, this._stakedNft.mint)[0];
  }

  public get endTime() {
    return new Date(Number(this._participation.endTime.toString()) * 1000);
  }

  public get startTime() {
    return new Date(this.endTime.getTime() - this.mission().duration.getTime());
  }

  public get isEnded() {
    return this.endTime.getTime() < Date.now();
  }

  public get isRecalled() {
    return this._participation.isRecalled;
  }

  public get rewards() {
    return this._participation.rewards.map(
      (r) => new ParticipationReward(this, r)
    );
  }
}

export class ParticipationReward {
  constructor(
    protected _participation: NectarMissionParticipation,
    protected _reward: EarnedReward
  ) {}

  public participation() {
    return this._participation;
  }

  public get amount() {
    return this._reward.amount;
  }

  public get collected() {
    return this._reward.collected;
  }

  public isCurrency(): this is ParticipationCurrencyRewards {
    return this._reward.rewardType.__kind === "Currency";
  }
}

export class ParticipationCurrencyRewards extends ParticipationReward {
  constructor(
    _participation: NectarMissionParticipation,
    _rewards: EarnedReward[]
  ) {
    super(_participation, _rewards[0]);
  }

  public currency() {
    if (this._reward.rewardType.__kind === "Currency")
      return this._participation
        .mission()
        .pool()
        .honeycomb()
        .currency(this._reward.rewardType.address);
    else throw new Error("Reward is not a currency");
  }
}
