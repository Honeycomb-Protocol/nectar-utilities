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
  Reward,
  UpdateMissionPoolArgs,
} from "./generated";
import {
  Honeycomb,
  HoneycombProject,
  Module,
} from "@honeycomb-protocol/hive-control";
import { StakedNft, getNftPda } from "@honeycomb-protocol/nectar-staking";
import {
  creatRecallOperation,
  createCreateMissionOperation,
  createCreateMissionPoolOperation,
  createParticipateOperation,
  createUpdateMissionPoolOperation,
} from "./operations";
import { missionPda, removeDuplicateFromArrayOf } from "./utils";

type ItemOrArray<T = any> = T | T[];

type NewMissionPoolArgs = {
  args: CreateMissionPoolArgs & {
    collections?: web3.PublicKey[];
    creators?: web3.PublicKey[];
  };
  project?: HoneycombProject;
};

declare module "@honeycomb-protocol/hive-control" {
  interface Honeycomb {
    _missions: { [key: string]: NectarMissions };
    missions(key?: string | web3.PublicKey): NectarMissions;
  }
}

export class NectarMissions extends Module {
  public readonly programId = PROGRAM_ID;
  private _fetch: NectarMissionsFetch;
  private _create: NectarMissionsCreate;
  private _missions: { [name: string]: NectarMission } = {};
  private _participations: { [wallet: string]: NectarMissionParticipation[] } =
    {};

  constructor(readonly address: web3.PublicKey, private _pool: MissionPool) {
    super();
    this._fetch = new NectarMissionsFetch(this);
    this._create = new NectarMissionsCreate(this);
  }

  static async fromAddress(
    connection: web3.Connection,
    address: web3.PublicKey,
    commitmentOrConfig?: web3.Commitment | web3.GetAccountInfoConfig
  ) {
    const pool = await MissionPool.fromAccountAddress(
      connection,
      address,
      commitmentOrConfig
    );
    return new NectarMissions(address, pool);
  }

  static async new(
    honeycomb: Honeycomb,
    args: NewMissionPoolArgs,
    confirmOptions?: web3.ConfirmOptions
  ) {
    const { missionPool, operation } = await createCreateMissionPoolOperation(
      honeycomb,
      {
        programId: PROGRAM_ID,
        project: args.project || honeycomb.project(),
        ...args,
      }
    );
    await operation.send(confirmOptions);
    return await NectarMissions.fromAddress(
      new web3.Connection(honeycomb.connection.rpcEndpoint, "processed"),
      missionPool
    );
  }

  public async update(
    args: UpdateMissionPoolArgs & {
      collection?: web3.PublicKey;
      creator?: web3.PublicKey;
    },
    confirmOptions?: web3.ConfirmOptions
  ) {
    const { operation } = await createUpdateMissionPoolOperation(
      this.honeycomb(),
      {
        args,
        programId: PROGRAM_ID,
        project: this.project().address,
        missionPool: this.address,
        collection: args.collection,
        creator: args.creator,
      }
    );
    return operation.send(confirmOptions);
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

  public get collections() {
    return this._pool.collections;
  }

  public get creators() {
    return this._pool.creators;
  }

  public project() {
    return this._honeycomb.project(this._pool.project);
  }

  public async missions(reFetch: boolean = false) {
    if (Object.keys(this._missions).length === 0 || reFetch) {
      this._missions = await this.fetch()
        .missions()
        .then((missions) =>
          missions.reduce(
            (acc, mission) => ({ ...acc, [mission.name]: mission }),
            {}
          )
        );
    }
    return Object.values(this._missions);
  }

  public async mission(
    name: string,
    reFetch?: boolean,
    commitmentOrConfig?: web3.Commitment | web3.GetAccountInfoConfig
  ): Promise<NectarMission>;
  public async mission(
    address: web3.PublicKey,
    reFetch?: boolean,
    commitmentOrConfig?: web3.Commitment | web3.GetAccountInfoConfig
  ): Promise<NectarMission>;
  public async mission(
    nameOrAddress: string | web3.PublicKey,
    reFetch = false,
    commitmentOrConfig?: web3.Commitment | web3.GetAccountInfoConfig
  ) {
    if (typeof nameOrAddress === "string") {
      if (!this._missions[nameOrAddress] || reFetch) {
        this._missions[nameOrAddress] = await this.fetch().mission(
          nameOrAddress,
          commitmentOrConfig
        );
      }
      return this._missions[nameOrAddress];
    } else {
      let mission = Object.values(this._missions).find((m) =>
        m.address.equals(nameOrAddress)
      );
      if (!mission || reFetch) {
        mission = await this.fetch().mission(nameOrAddress, commitmentOrConfig);
        this._missions[mission.name] = mission;
      }
      return mission;
    }
  }

  public async participations(wallet?: web3.PublicKey, reFetch = false) {
    const walletAddr = wallet || this.honeycomb().identity().address;
    if (!this._participations[walletAddr.toString()] || reFetch) {
      this._participations[walletAddr.toString()] =
        await this.fetch().participations(wallet);
    }
    return this._participations[walletAddr.toString()];
  }

  public register(mission: NectarMission): NectarMissions;
  public register(participations: NectarMissionParticipation[]): NectarMissions;
  public register(
    arg: ItemOrArray<NectarMission> | ItemOrArray<NectarMissionParticipation>
  ) {
    if (Array.isArray(arg)) {
      arg.map((x) => this.register(x));
    } else {
      if (arg instanceof NectarMission) {
        this._missions[arg.name] = arg;
      } else if (arg instanceof NectarMissionParticipation) {
        if (!this._participations[arg.wallet.toString()])
          this._participations[arg.wallet.toString()] = [];
        this._participations[arg.wallet.toString()] = [
          ...this._participations[arg.wallet.toString()],
          arg,
        ];

        this._participations[arg.wallet.toString()] =
          removeDuplicateFromArrayOf(
            this._participations[arg.wallet.toString()],
            (x) => x.address.toString()
          );
      } else {
        throw new Error("Unrecognized item");
      }
    }

    return this;
  }

  public async recall(
    participations: NectarMissionParticipation[],
    confirmOptions?: web3.ConfirmOptions
  ) {
    const operations = (
      await Promise.all(
        participations.map((participation, i) =>
          creatRecallOperation(this.honeycomb(), {
            participation,
            programId: this.programId,
          }).then(({ operations }) => operations)
        )
      )
    ).flat();

    const preparedOperations = await this.honeycomb()
      .rpc()
      .prepareTransactions(operations.map((operation) => operation.context));

    const firstTxResponse = await this.honeycomb()
      .rpc()
      .sendAndConfirmTransaction(preparedOperations.shift(), {
        commitment: "processed",
        ...confirmOptions,
      });

    const responses = await this.honeycomb()
      .rpc()
      .sendAndConfirmTransactionsInBatches(preparedOperations, {
        commitment: "processed",
        ...confirmOptions,
      });
    return [firstTxResponse, ...responses];
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

  public async mission(
    name: string,
    commitmentOrConfig?: web3.Commitment | web3.GetAccountInfoConfig
  ): Promise<NectarMission>;
  public async mission(
    address: web3.PublicKey,
    commitmentOrConfig?: web3.Commitment | web3.GetAccountInfoConfig
  ): Promise<NectarMission>;
  public async mission(
    nameOrAddress: string | web3.PublicKey,
    commitmentOrConfig?: web3.Commitment | web3.GetAccountInfoConfig
  ) {
    const address =
      typeof nameOrAddress === "string"
        ? missionPda(this._missions.address, nameOrAddress)[0]
        : nameOrAddress;
    return Mission.fromAccountAddress(
      this._missions.honeycomb().connection,
      address,
      commitmentOrConfig
    ).then((m) => new NectarMission(this._missions, address, m));
  }

  public async participations(
    walletAddress?: web3.PublicKey,
    mission?: web3.PublicKey
  ): Promise<NectarMissionParticipation[]> {
    const gpa = Participation.gpaBuilder().addFilter(
      "wallet",
      walletAddress || this._missions.honeycomb().identity().address
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
                await this._missions.mission(participation.mission),
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
      .then((x) => x.filter((y) => !!y))
      .then((x) => {
        this._missions.register(x);
        return x;
      });
  }
}

class NectarMissionsCreate {
  constructor(private _missionPool: NectarMissions) {}

  public async mission(
    args: CreateMissionArgs,
    confirmOptions?: web3.ConfirmOptions
  ) {
    const { operation, mission } = await createCreateMissionOperation(
      this._missionPool.honeycomb(),
      {
        args,
        missionPool: this._missionPool,
        programId: this._missionPool.programId,
      }
    );
    await operation.send(confirmOptions);
    return this._missionPool.mission(mission, true, "processed");
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
      cost: {
        amount: this._mission.cost.amount,
        currency: () =>
          this.pool().honeycomb().currency(this._mission.cost.address),
      },
    };
  }

  public get duration() {
    return new Date(Number(this._mission.duration.toString()) * 1000);
  }

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

  public async participate(
    nfts: (StakedNft & { args: ParticipateArgs })[],
    confirmOptions?: web3.ConfirmOptions
  ) {
    const operations = await Promise.all(
      nfts.map((nft, i) =>
        createParticipateOperation(this.pool().honeycomb(), {
          args: nft.args,
          mission: this,
          nft,
          programId: this.pool().programId,
        })
      )
    );

    const preparedOperations = await this.pool()
      .honeycomb()
      .rpc()
      .prepareTransactions(
        operations.map(({ operation }) => operation.context)
      );

    const firstTxResponse = await this.pool()
      .honeycomb()
      .rpc()
      .sendAndConfirmTransaction(preparedOperations.shift(), {
        commitment: "processed",
        ...confirmOptions,
      });

    const responses = await this.pool()
      .honeycomb()
      .rpc()
      .sendAndConfirmTransactionsInBatches(preparedOperations, {
        commitment: "processed",
        ...confirmOptions,
      });
    return [firstTxResponse, ...responses];
  }

  public async recall(
    participations: NectarMissionParticipation[],
    confirmOptions?: web3.ConfirmOptions
  ) {
    const operations = (
      await Promise.all(
        participations.map((participation, i) =>
          creatRecallOperation(this.pool().honeycomb(), {
            participation,
            programId: this.pool().programId,
          }).then(({ operations }) => operations)
        )
      )
    ).flat();

    const preparedOperations = await this.pool()
      .honeycomb()
      .rpc()
      .prepareTransactions(operations.map((operation) => operation.context));

    const firstTxResponse = await this.pool()
      .honeycomb()
      .rpc()
      .sendAndConfirmTransaction(preparedOperations.shift(), {
        commitment: "processed",
        ...confirmOptions,
      });

    const responses = await this.pool()
      .honeycomb()
      .rpc()
      .sendAndConfirmTransactionsInBatches(preparedOperations, {
        commitment: "processed",
        ...confirmOptions,
      });
    return [firstTxResponse, ...responses];
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
    return this._participation.rewards.map((r) =>
      (() => {
        switch (r.rewardType.__kind) {
          case "Currency":
            return new ParticipationCurrencyRewards(this, r);
          default:
            return new ParticipationReward(this, r);
        }
      })()
    );
  }

  public recall(confirmOptions?: web3.ConfirmOptions) {
    return this._mission.recall([this], confirmOptions);
  }
}

export class MissionReward {
  constructor(protected _mission: NectarMission, protected _reward: Reward) {}

  public get min() {
    return this._reward.min;
  }

  public get max() {
    return this._reward.max;
  }

  public isCurrency(): this is ParticipationCurrencyRewards {
    return this._reward.rewardType.__kind === "Currency";
  }

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

export class MissionCurrencyRewards extends MissionReward {
  constructor(_mission: NectarMission, _reward: Reward) {
    super(_mission, _reward);
  }

  public currency() {
    if (this._reward.rewardType.__kind === "Currency")
      return this._mission
        .pool()
        .honeycomb()
        .currency(this._reward.rewardType.address);
    else throw new Error("Reward is not a currency");
  }
}

export class ParticipationReward {
  constructor(
    protected _participation: NectarMissionParticipation,
    protected _reward: EarnedReward
  ) {}

  public get amount() {
    return this._reward.amount;
  }

  public get collected() {
    return this._reward.collected;
  }

  public participation() {
    return this._participation;
  }

  public isCurrency(): this is ParticipationCurrencyRewards {
    return this._reward.rewardType.__kind === "Currency";
  }
}

export class ParticipationCurrencyRewards extends ParticipationReward {
  constructor(
    _participation: NectarMissionParticipation,
    _reward: EarnedReward
  ) {
    super(_participation, _reward);
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

export const nectarMissionsModule = (
  honeycomb: Honeycomb,
  args: web3.PublicKey | NewMissionPoolArgs
) =>
  args instanceof web3.PublicKey
    ? NectarMissions.fromAddress(honeycomb.connection, args)
    : NectarMissions.new(honeycomb, args);

export const findProjectMissionPools = (project: HoneycombProject) =>
  MissionPool.gpaBuilder()
    .addFilter("project", project.address)
    .run(project.honeycomb().connection)
    .then((currencies) =>
      currencies.map((c) => {
        try {
          project
            .honeycomb()
            .use(
              new NectarMissions(
                c.pubkey,
                MissionPool.fromAccountInfo(c.account)[0]
              )
            );
        } catch (e) {
          console.error(e);
          return null;
        }
      })
    )
    .then((_) => project.honeycomb());
