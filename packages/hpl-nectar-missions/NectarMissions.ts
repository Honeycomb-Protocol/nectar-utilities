import * as web3 from "@solana/web3.js";
import {
  CreateMissionArgs,
  CreateMissionPoolArgs,
  EarnedReward,
  Mission,
  MissionPool,
  PROGRAM_ID,
  ParticipateArgs,
  Participation,
} from "./generated";
import { Honeycomb, Module } from "@honeycomb-protocol/hive-control";
import { StakedNft, getNftPda } from "../../packages/hpl-nectar-staking";
import {
  createMission,
  createMissionPool,
  participate,
  recall,
} from "./operations";
import { missionPda } from "./utils";

type NewMissionPoolArgs = {
  args: CreateMissionPoolArgs & {
    collections?: web3.PublicKey[];
    creators?: web3.PublicKey[];
  };
  project?: web3.PublicKey;
};

declare module "@honeycomb-protocol/hive-control" {
  interface Honeycomb {
    _missions: { [key: string]: NectarMissions };
    missions(key?: string | web3.PublicKey): NectarMissions;
  }
}

export class NectarMissions extends Module {
  private _fetch: NectarMissionsFetch;
  private _create: NectarMissionsCreate;
  private _missions: { [name: string]: NectarMission } = {};

  constructor(readonly address: web3.PublicKey, private _pool: MissionPool) {
    super();
    this._fetch = new NectarMissionsFetch(this);
    this._create = new NectarMissionsCreate(this);
  }

  static async fromAddress(
    connection: web3.Connection,
    address: web3.PublicKey
  ) {
    const pool = await MissionPool.fromAccountAddress(connection, address);
    return new NectarMissions(address, pool);
  }

  static async new(honeycomb: Honeycomb, args: NewMissionPoolArgs) {
    const { poolId } = await createMissionPool(honeycomb, {
      programId: PROGRAM_ID,
      ...args,
      project: args.project || honeycomb.project().address,
    });
    return await NectarMissions.fromAddress(
      new web3.Connection(honeycomb.connection.rpcEndpoint, "processed"),
      poolId
    );
  }

  public fetch() {
    return this._fetch;
  }

  public create() {
    return this._create;
  }

  public get name() {
    return this._pool.name;
  }

  public mission(name: string): NectarMission;
  public mission(address: web3.PublicKey): NectarMission;
  public mission(nameOrAddress: string | web3.PublicKey) {
    return typeof nameOrAddress === "string"
      ? this._missions[nameOrAddress]
      : Object.values(this._missions).find((m) =>
          m.address.equals(nameOrAddress)
        );
  }

  public loadMissions() {
    return this._fetch.missions().then((missions) => {
      this._missions = missions.reduce(
        (obj, mission) => ({ ...obj, [mission.name]: mission }),
        {} as { [name: string]: NectarMission }
      );
      return this._missions;
    });
  }

  public register(mission: NectarMission): NectarMissions;
  public register(mission: NectarMission) {
    this._missions[mission.name] = mission;
    return this;
  }

  public project() {
    return this._honeycomb.project(this._pool.project);
  }

  public install(honeycomb: Honeycomb): Honeycomb {
    if (!honeycomb._missions) {
      honeycomb._missions = {};
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

class NectarMissionsFetch {
  constructor(private _missions: NectarMissions) {}

  public async missions() {
    return Mission.gpaBuilder()
      .addFilter("missionPool", this._missions.address)
      .run(this._missions.honeycomb().connection)
      .then((missions) =>
        missions
          .map((m) => {
            try {
              return new NectarMission(
                this._missions,
                m.pubkey,
                Mission.fromAccountInfo(m.account)[0]
              );
            } catch {
              return null;
            }
          })
          .filter((x) => !!x)
      );
  }

  public async mission(name: string): Promise<NectarMission>;
  public async mission(address: web3.PublicKey): Promise<NectarMission>;
  public async mission(nameOrAddress: string | web3.PublicKey) {
    const address =
      typeof nameOrAddress === "string"
        ? missionPda(this._missions.address, nameOrAddress)[0]
        : nameOrAddress;
    return Mission.fromAccountAddress(
      this._missions.honeycomb().connection,
      address
    )
      .then((m) => new NectarMission(this._missions, address, m))
      .then((m) => {
        this._missions.register(m);
        return m;
      });
  }

  public async participations(
    walletAddress?: web3.PublicKey,
    mission?: web3.PublicKey
  ): Promise<NectarMissionParticipation[]> {
    const gpa = Participation.gpaBuilder().addFilter(
      "wallet",
      walletAddress || this._missions.honeycomb().identity().publicKey
    );
    if (mission) gpa.addFilter("mission", mission);
    return gpa
      .run(this._missions.honeycomb().connection)
      .then((participations) =>
        Promise.all(
          participations.map(async (p) => {
            try {
              const participation = Participation.fromAccountInfo(p.account)[0];
              const stakedNft = await this._missions
                .honeycomb()
                .staking()
                .stakedNfts()
                .then((x) =>
                  x.find((y) =>
                    getNftPda(
                      this._missions.honeycomb().staking().address,
                      y.mintAddress
                    )[0].equals(participation.nft)
                  )
                );
              return new NectarMissionParticipation(
                this._missions.mission(participation.mission),
                p.pubkey,
                participation,
                stakedNft
              );
            } catch {
              return null;
            }
          })
        )
      )
      .then((x) => x.filter((y) => !!y));
  }
}

class NectarMissionsCreate {
  constructor(private _missions: NectarMissions) {}

  public async mission(args: CreateMissionArgs) {
    return createMission(this._missions.honeycomb(), {
      args,
      programId: PROGRAM_ID,
    }).then((m) => this._missions.fetch().mission(m.mission));
  }
}

export class NectarMission {
  constructor(
    private _pool: NectarMissions,
    readonly address: web3.PublicKey,
    private _mission: Mission
  ) {
    if (!_pool.address.equals(_mission.missionPool)) {
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

  public participate(...nfts: (StakedNft & ParticipateArgs)[]) {
    return participate(this._pool.honeycomb(), {
      mission: this,
      nfts,
      programId: PROGRAM_ID,
    });
  }

  public recall(...participations: NectarMissionParticipation[]) {
    return recall(this._pool.honeycomb(), {
      participations,
      programId: PROGRAM_ID,
    });
  }
}

export class NectarMissionParticipation {
  constructor(
    private _mission: NectarMission,
    readonly address: web3.PublicKey,
    private _participation: Participation,
    private _stakedNft: StakedNft
  ) {
    if (!_mission.address.equals(_participation.mission)) {
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

  public recall() {
    return this._mission.recall(this);
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
