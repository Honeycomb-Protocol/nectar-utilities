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
  Operation,
} from "@honeycomb-protocol/hive-control";
import { StakedNft, getNftPda } from "@honeycomb-protocol/nectar-staking";
import {
  creatRecallOperation,
  createCreateMissionOperation,
  createCreateMissionPoolOperation,
  createParticipateOperation,
  createUpdateMissionPoolOperation,
} from "./operations";
import {
  createLookupTable,
  missionPda,
  removeDuplicateFromArrayOf,
} from "./utils";

/**
 * The `ItemOrArray` type represents a value that can either be a single item of type `T`
 * or an array of items of type `T`.
 *
 * @category Types
 * @typeparam T - The type of items in the array.
 *
 * @example
 * type ExampleType = ItemOrArray<number>;
 * const value1: ExampleType = 42; // A single number
 * const value2: ExampleType = [1, 2, 3]; // An array of numbers
 */
type ItemOrArray<T = any> = T | T[];

/**
 * The `NewMissionPoolArgs` type represents the arguments needed to create a new mission pool in the Honeycomb Protocol.
 *
 * @category Types
 * @property args - The `CreateMissionPoolArgs` object containing the necessary data to create the mission pool,
 *                along with optional properties `collections` and `creators`.
 * @property project - An optional `HoneycombProject` object representing the project associated with the mission pool.
 *
 * @example
 * const args: NewMissionPoolArgs = {
 *   args: {
 *     name: "Mission Pool 1",
 *     ... (other properties from CreateMissionPoolArgs)
 *     collections: [collection1, collection2],
 *     creators: [creator1, creator2],
 *   },
 *   project: honeycombProject, // Optional, if not provided, it will use the default project
 * };
 */
type NewMissionPoolArgs = {
  args: CreateMissionPoolArgs & {
    collections?: web3.PublicKey[];
    creators?: web3.PublicKey[];
  };
  project?: HoneycombProject;
};

/**
 * The module declaration for `@honeycomb-protocol/hive-control`.
 *
 * @category Module
 * This module extends the `Honeycomb` interface to add support for missions in the Honeycomb Protocol.
 */
declare module "@honeycomb-protocol/hive-control" {
  /**
   * The `Honeycomb` interface is extended to include missions-related methods and properties.
   */
  interface Honeycomb {
    /**
     * An object that holds instances of `NectarMissions`, indexed by their addresses as strings.
     */
    _missions: { [key: string]: NectarMissions };

    /**
     * Retrieves a specific instance of `NectarMissions` associated with a mission pool using its key or public key.
     *
     * @param key - The key or public key of the mission pool to retrieve.
     * @returns A `NectarMissions` instance representing the requested mission pool.
     *
     * @example
     * const missionPoolKey = "MissionPool1"; // The key or public key of the mission pool
     * const missionPool = honeycomb.missions(missionPoolKey);
     * console.log(missionPool); // Output: NectarMissions instance for MissionPool1
     *
     * // Alternatively, you can use the public key directly to fetch the mission pool.
     * const missionPoolPublicKey = new web3.PublicKey("MissionPoolPublicKey");
     * const missionPool = honeycomb.missions(missionPoolPublicKey);
     * console.log(missionPool); // Output: NectarMissions instance for MissionPoolPublicKey
     */
    missions(key?: string | web3.PublicKey): NectarMissions;
  }
}
/**
 * The `NectarMissions` class represents a collection of missions in the Honeycomb Protocol.
 * This class extends the `Module` class and provides methods to interact with missions,
 * such as creating new missions, updating existing missions, fetching missions, etc.
 * @category Module
 */
export class NectarMissions extends Module {
  /**
   * The program ID associated with the NectarMissions module.
   */
  public readonly programId = PROGRAM_ID;

  /**
   * An instance of the `NectarMissionsFetch` class to handle fetching mission data.
   * Used internally for fetching missions from the blockchain.
   */
  private _fetch: NectarMissionsFetch;

  /**
   * An instance of the `NectarMissionsCreate` class to handle creating new missions.
   * Used internally for creating missions on the blockchain.
   */
  private _create: NectarMissionsCreate;

  /**
   * An object that holds instances of `NectarMission`, indexed by their names.
   * Used to cache mission instances for efficient access and retrieval.
   */
  private _missions: { [name: string]: NectarMission } = {};

  /**
   * An object that holds arrays of `NectarMissionParticipation`, indexed by the wallet address.
   * Used to cache mission participations for efficient access and retrieval.
   */
  private _participations: { [wallet: string]: NectarMissionParticipation[] } =
    {};

  /**
   * Creates a new `NectarMissions` instance.
   *
   * @param address - The public key of the NectarMissions account on the blockchain.
   * @param _pool - The associated `MissionPool` instance representing the mission pool.
   */
  constructor(readonly address: web3.PublicKey, private _pool: MissionPool) {
    super();
    this._fetch = new NectarMissionsFetch(this);
    this._create = new NectarMissionsCreate(this);
  }

  /**
   * Creates a new `NectarMissions` instance from the given address on the blockchain.
   *
   * @param connection - The Solana connection instance to use for interacting with the blockchain.
   * @param address - The public key of the NectarMissions account on the blockchain.
   * @param commitmentOrConfig - Optional commitment level or GetAccountInfoConfig object for fetching account data.
   * @returns A new `NectarMissions` instance representing the mission pool.
   *
   * @async
   * @example
   * const connection = new web3.Connection("https://api.mainnet-beta.solana.com");
   * const address = new web3.PublicKey("..."); // Replace with the actual address of the NectarMissions account.
   * const missionPool = await NectarMissions.fromAddress(connection, address);
   */
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

  /**
   * Creates a new mission pool in the Honeycomb Protocol and returns the corresponding `NectarMissions` instance.
   *
   * @param honeycomb - The `Honeycomb` instance to use for the transaction.
   * @param args - The `NewMissionPoolArgs` object containing the necessary data to create the mission pool.
   * @param confirmOptions - Optional transaction confirmation options.
   * @returns A new `NectarMissions` instance representing the newly created mission pool.
   *
   * @async
   * @example
   * const honeycomb = new Honeycomb(...); // Replace with the actual Honeycomb instance.
   * const args: NewMissionPoolArgs = {
   *   args: {
   *     name: "Mission Pool 1",
   *     ... (other properties from CreateMissionPoolArgs)
   *     collections: [collection1, collection2],
   *     creators: [creator1, creator2],
   *   },
   *   project: honeycombProject, // Optional, if not provided, it will use the default project
   * };
   * const missionPool = await NectarMissions.new(honeycomb, args);
   */
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

  /**
   * Updates an existing mission pool with new data.
   *
   * @param args - The `UpdateMissionPoolArgs` object containing the data to update the mission pool.
   * @param confirmOptions - Optional transaction confirmation options.
   * @returns A promise that resolves to the transaction signature after the update is complete.
   *
   * @async
   * @example
   * const args: UpdateMissionPoolArgs = {
   *   name: "Updated Mission Pool",
   *   ... (other properties to update the mission pool)
   *   collection: newCollection, // Optional, specify if you want to change the collection
   *   creator: newCreator, // Optional, specify if you want to change the creator
   * };
   * const confirmOptions: web3.ConfirmOptions = {
   *   skipPreflight: false, // Optional, set to true to skip preflight checks
   * };
   * await nectarMissions.update(args, confirmOptions);
   */
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

  /**
   * Returns the `NectarMissionsFetch` instance to handle fetching mission data.
   *
   * @returns The `NectarMissionsFetch` instance.
   *
   * @example
   * const fetcher = nectarMissions.fetch();
   * // Use the fetcher to retrieve mission data from the blockchain.
   */
  public fetch() {
    return this._fetch;
  }

  /**
   * Returns the `NectarMissionsCreate` instance to handle creating new missions.
   *
   * @returns The `NectarMissionsCreate` instance.
   *
   * @example
   * const creator = nectarMissions.create();
   * // Use the creator to create new missions on the blockchain.
   */
  public create() {
    return this._create;
  }

  /**
   * Returns the name of the mission pool.
   *
   * @returns The name of the mission pool.
   *
   * @example
   * const poolName = nectarMissions.name;
   * console.log(poolName); // Output: "Mission Pool 1"
   */
  public get name() {
    return this._pool.name;
  }

  /**
   * Returns an array of public keys representing the collections associated with the mission pool.
   *
   * @returns An array of public keys representing the collections associated with the mission pool.
   *
   * @example
   * const collections = nectarMissions.collections;
   * console.log(collections); // Output: [collection1, collection2]
   */
  public get collections() {
    return this._pool.collections;
  }

  /**
   * Returns an array of public keys representing the creators associated with the mission pool.
   *
   * @returns An array of public keys representing the creators associated with the mission pool.
   *
   * @example
   * const creators = nectarMissions.creators;
   * console.log(creators); // Output: [creator1, creator2]
   */
  public get creators() {
    return this._pool.creators;
  }

  /**
   * Returns the `HoneycombProject` associated with the mission pool.
   *
   * @returns The `HoneycombProject` associated with the mission pool.
   *
   * @example
   * const project = nectarMissions.project();
   * console.log(project); // Output: HoneycombProject instance representing the project
   */
  public project() {
    return this._honeycomb.project(this._pool.project);
  }

  /**
   * Retrieves all missions associated with the mission pool.
   *
   * @param reFetch - Set to `true` to force fetching missions from the blockchain, even if cached.
   * @returns An array of `NectarMission` instances representing the missions associated with the mission pool.
   *
   * @async
   * @example
   * const missions = await nectarMissions.missions();
   * console.log(missions); // Output: [NectarMission1, NectarMission2, ...]
   */
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

  /**
   * Retrieves a specific mission associated with the mission pool by its name or public key.
   *
   * @param name - The name of the mission or the public key of the mission account.
   * @param reFetch - Set to `true` to force fetching the mission from the blockchain, even if cached.
   * @param commitmentOrConfig - Optional commitment level or GetAccountInfoConfig object for fetching account data.
   * @returns A promise that resolves to the `NectarMission` instance representing the requested mission.
   *
   * @async
   * @example
   * const missionName = "Mission1"; // The name of the mission or the public key of the mission account
   * const mission = await nectarMissions.mission(missionName);
   * console.log(mission); // Output: NectarMission instance for Mission1
   *
   * // Alternatively, you can use the public key directly to fetch the mission.
   * const missionPublicKey = new web3.PublicKey("MissionPublicKey");
   * const mission = await nectarMissions.mission(missionPublicKey);
   * console.log(mission); // Output: NectarMission instance for MissionPublicKey
   */
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

  /**
   * Retrieves mission participations for a given wallet address associated with the mission pool.
   *
   * @param wallet - The public key of the wallet for which to retrieve mission participations.
   * If not provided, the default wallet associated with the `Honeycomb` instance will be used.
   * @param reFetch - Set to `true` to force fetching participations from the blockchain, even if cached.
   * @returns An array of `NectarMissionParticipation` instances representing the mission participations
   * associated with the wallet.
   *
   * @async
   * @example
   * // Retrieve mission participations for the default wallet
   * const participations = await nectarMissions.participations();
   * console.log(participations); // Output: [NectarMissionParticipation1, NectarMissionParticipation2, ...]
   *
   * // Alternatively, you can specify the wallet address to retrieve participations for a specific wallet
   * const walletAddress = new web3.PublicKey("WalletAddress");
   * const participations = await nectarMissions.participations(walletAddress);
   * console.log(participations); // Output: [NectarMissionParticipation1, NectarMissionParticipation2, ...]
   */
  public async participations(wallet?: web3.PublicKey, reFetch = false) {
    const walletAddr = wallet || this.honeycomb().identity().address;
    if (!this._participations[walletAddr.toString()] || reFetch) {
      this._participations[walletAddr.toString()] =
        await this.fetch().participations(wallet);
    }
    return this._participations[walletAddr.toString()];
  }

  /**
   * Registers a new `NectarMission` or `NectarMissionParticipation` with the `NectarMissions` instance.
   * This method is used to add missions or mission participations to the cache to avoid unnecessary fetching.
   *
   * @param mission - The `NectarMission` instance to register.
   * @returns The `NectarMissions` instance with the mission or participation added to the cache.
   *
   * @example
   * const newMission = new NectarMission(...); // Replace with the actual NectarMission instance.
   * nectarMissions.register(newMission);
   *
   * // Alternatively, you can register an array of participations at once
   * const participations = [participation1, participation2, ...]; // Replace with actual NectarMissionParticipation instances
   * nectarMissions.register(participations);
   */
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

  /**
   * Initiates a recall operation for a set of `NectarMissionParticipation`.
   * This method is used to recall rewards from completed missions for a given set of participations.
   *
   * @param participations - An array of `NectarMissionParticipation` instances for which to initiate the recall.
   * @param confirmOptions - Optional transaction confirmation options.
   * @returns A promise that resolves to the transaction signature after the recall operation is complete.
   *
   * @async
   * @example
   * const participations = [participation1, participation2, ...]; // Replace with actual NectarMissionParticipation instances
   * const confirmOptions: web3.ConfirmOptions = {
   *   skipPreflight: false, // Optional, set to true to skip preflight checks
   * };
   * const recallSignature = await nectarMissions.recall(participations, confirmOptions);
   */
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

    const operation = Operation.concat(operations);
    const lookupTable = await createLookupTable(
      this.honeycomb(),
      operation.accounts
    );
    if (!lookupTable) throw new Error("Failed to create lookup table");
    const latestBlockhash = await this.honeycomb().rpc().getLatestBlockhash();
    const tx = new web3.VersionedTransaction(
      new web3.TransactionMessage({
        payerKey: this.honeycomb().identity().address,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: operation.instructions,
      }).compileToV0Message([lookupTable])
    );
    const signedTx = await this.honeycomb().identity().signTransaction(tx);
    const signature = await this.honeycomb().connection.sendRawTransaction(
      signedTx.serialize(),
      confirmOptions
    );
    await this.honeycomb().connection.confirmTransaction(
      {
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      confirmOptions?.commitment
    );
    return signature;
  }

  /**
   * Installs the `NectarMissions` instance into the provided `Honeycomb` instance.
   * This method is used internally to link the mission pool to the Honeycomb instance.
   *
   * @param honeycomb - The `Honeycomb` instance to install the mission pool into.
   * @returns The `Honeycomb` instance with the mission pool installed.
   *
   * @example
   * const honeycomb = new Honeycomb(...); // Replace with the actual Honeycomb instance.
   * nectarMissions.install(honeycomb);
   */
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

/**
 * A class that provides methods to fetch missions and mission participations associated with a `NectarMissions` instance.
 * @category Helpers
 */
class NectarMissionsFetch {
  /**
   * Creates a new `NectarMissionsFetch` instance.
   * @param _missions - The `NectarMissions` instance to fetch missions and participations for.
   */
  constructor(private _missions: NectarMissions) {}

  /**
   * Fetches all missions associated with the `NectarMissions` instance.
   * @returns A promise that resolves to an array of `NectarMission` instances representing the fetched missions.
   * @async
   */
  public async missions(): Promise<NectarMission[]> {
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

  /**
   * Fetches a specific mission associated with the `NectarMissions` instance based on its name or public key.
   * @param name - The name of the mission to fetch.
   * @param commitmentOrConfig - Optional transaction commitment or configuration for fetching mission data.
   * @returns A promise that resolves to the fetched `NectarMission` instance.
   * @async
   * @example
   * // Fetch a mission by its name
   * const missionName = "MissionABC";
   * const mission = await nectarMissions.fetch().mission(missionName);
   * console.log(mission); // Output: NectarMission instance representing the fetched mission
   *
   * // Fetch a mission by its public key
   * const missionPublicKey = new web3.PublicKey("MissionPublicKey");
   * const mission = await nectarMissions.fetch().mission(missionPublicKey);
   * console.log(mission); // Output: NectarMission instance representing the fetched mission
   */
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
  ): Promise<NectarMission | null> {
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

  /**
   * Fetches mission participations associated with the `NectarMissions` instance and optionally a specific wallet and mission.
   * @param walletAddress - The public key of the wallet for which to fetch participations.
   * If not provided, the default wallet associated with the `NectarMissions` instance will be used.
   * @param mission - The public key of the mission for which to fetch participations.
   * If not provided, all participations for the given wallet will be fetched.
   * @returns A promise that resolves to an array of `NectarMissionParticipation` instances representing the fetched participations.
   * @async
   * @example
   * // Fetch all participations for the default wallet
   * const participations = await nectarMissions.fetch().participations();
   * console.log(participations); // Output: [NectarMissionParticipation1, NectarMissionParticipation2, ...]
   *
   * // Fetch participations for a specific wallet and mission
   * const walletAddress = new web3.PublicKey("WalletAddress");
   * const missionPublicKey = new web3.PublicKey("MissionPublicKey");
   * const participations = await nectarMissions.fetch().participations(walletAddress, missionPublicKey);
   * console.log(participations); // Output: [NectarMissionParticipation1, NectarMissionParticipation2, ...]
   */
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
                      y.mint
                    )[0].equals(participation.nft)
                  )
                );
              return new NectarMissionParticipation(
                await this._missions.mission(participation.mission),
                p.pubkey,
                participation,
                //@ts-ignore
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

/**
 * A class that provides a method to create a new mission associated with a `NectarMissions` instance.
 * @category Helpers
 */
class NectarMissionsCreate {
  /**
   * Creates a new `NectarMissionsCreate` instance.
   * @param _missionPool - The `NectarMissions` instance to create a mission for.
   */
  constructor(private _missionPool: NectarMissions) {}

  /**
   * Creates a new mission associated with the `NectarMissions` instance.
   * @param args - The arguments to create the mission.
   * @param confirmOptions - Optional transaction confirmation options.
   * @returns A promise that resolves to the created `NectarMission` instance.
   * @async
   * @example
   * // Create a new mission
   * const createMissionArgs = {
   *   name: "MissionABC",
   *   description: "This is a test mission.",
   *   reward: 100,
   *   startDate: new Date("2023-07-01"),
   *   endDate: new Date("2023-07-31"),
   *   maxParticipationLimit: 1000,
   *   maxStakePerParticipant: 10,
   * };
   * const createdMission = await nectarMissions.create().mission(createMissionArgs);
   * console.log(createdMission); // Output: NectarMission instance representing the created mission
   */
  public async mission(
    args: CreateMissionArgs,
    confirmOptions?: web3.ConfirmOptions
  ): Promise<NectarMission> {
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
  constructor(
    private _pool: NectarMissions,
    readonly address: web3.PublicKey,
    private _mission: Mission
  ) {
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
    confirmOptions?: web3.ConfirmOptions
  ) {
    const operations = await Promise.all(
      nfts.map((nft, i) =>
        createParticipateOperation(this.pool().honeycomb(), {
          args: nft.args,
          mission: this,
          nft,
          isFirst: i === 0,
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

    const operation = Operation.concat(operations);

    const lookupTable = await createLookupTable(
      this.pool().honeycomb(),
      operation.accounts
    );
    if (!lookupTable) throw new Error("Failed to create lookup table");
    const latestBlockhash = await this.pool()
      .honeycomb()
      .rpc()
      .getLatestBlockhash();
    const tx = new web3.VersionedTransaction(
      new web3.TransactionMessage({
        payerKey: this.pool().honeycomb().identity().address,
        recentBlockhash: latestBlockhash.blockhash,
        instructions: operation.instructions,
      }).compileToV0Message([lookupTable])
    );
    const signedTx = await this.pool()
      .honeycomb()
      .identity()
      .signTransaction(tx);
    const signature = await this.pool()
      .honeycomb()
      .connection.sendRawTransaction(signedTx.serialize(), confirmOptions);
    await this.pool().honeycomb().connection.confirmTransaction(
      {
        signature,
        blockhash: latestBlockhash.blockhash,
        lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
      },
      confirmOptions?.commitment
    );
    return signature;

    // const preparedOperations = await this.pool()
    //   .honeycomb()
    //   .rpc()
    //   .prepareTransactions(operations.map((operation) => operation.context));

    // const firstTxResponse = await this.pool()
    //   .honeycomb()
    //   .rpc()
    //   .sendAndConfirmTransaction(preparedOperations.shift(), {
    //     commitment: "processed",
    //     ...confirmOptions,
    //   });

    // const responses = await this.pool()
    //   .honeycomb()
    //   .rpc()
    //   .sendAndConfirmTransactionsInBatches(preparedOperations, {
    //     commitment: "processed",
    //     ...confirmOptions,
    //   });
    // return [firstTxResponse, ...responses];
  }
}

/**
 * Represents a Nectar Mission Participation.
 * @category Helpers
 */
export class NectarMissionParticipation {
  /**
   * Creates a new `NectarMissionParticipation` instance.
   * @param _mission - The `NectarMission` instance that the participation belongs to.
   * @param address - The public key address of the participation.
   * @param _participation - The underlying `Participation` object representing the participation data.
   * @param _stakedNft - The `StakedNft` object representing the staked NFT associated with the participation.
   * @throws {Error} Throws an error if the participation does not belong to the mission or the staked NFT.
   */
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

  /**
   * Returns the `NectarMission` instance that the participation belongs to.
   * @returns The `NectarMission` instance.
   */
  public mission() {
    return this._mission;
  }

  /**
   * Gets the wallet address associated with the participation.
   * @returns The wallet address.
   */
  public get wallet() {
    return this._participation.wallet;
  }

  /**
   * Gets the staked NFT associated with the participation.
   * @returns The staked NFT object.
   */
  public get nft() {
    return this._stakedNft;
  }

  /**
   * Gets the address of the staked NFT associated with the participation.
   * @returns The address of the staked NFT.
   */
  public get nftAddress() {
    return getNftPda(this._stakedNft.stakingPool, this._stakedNft.mint)[0];
  }

  /**
   * Gets the end time of the participation as a `Date`.
   * @returns The end time of the participation.
   */
  public get endTime() {
    return new Date(Number(this._participation.endTime.toString()) * 1000);
  }

  /**
   * Gets the start time of the participation as a `Date`.
   * @returns The start time of the participation.
   */
  public get startTime() {
    return new Date(this.endTime.getTime() - this.mission().duration.getTime());
  }

  /**
   * Checks if the participation has ended.
   * @returns `true` if the participation has ended, `false` otherwise.
   */
  public get isEnded() {
    return this.endTime.getTime() < Date.now();
  }

  /**
   * Checks if the participation has been recalled.
   * @returns `true` if the participation has been recalled, `false` otherwise.
   */
  public get isRecalled() {
    return this._participation.isRecalled;
  }

  /**
   * Gets the rewards associated with the participation.
   * @returns An array of `ParticipationReward` or `ParticipationCurrencyRewards` objects representing the rewards.
   */
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

  /**
   * Recalls the participation from the mission for this instance.
   * @param confirmOptions - Optional transaction confirmation options.
   * @returns A promise that resolves to the transaction signature upon successful recall.
   * @async
   * @example
   * // Recall participation for this instance
   * const recallResult = await nectarMissionParticipation.recall();
   * console.log(recallResult); // Output: Transaction signature
   */
  public recall(confirmOptions?: web3.ConfirmOptions): Promise<string> {
    return this._mission.recall([this], confirmOptions);
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

/**
 * Represents a Participation Reward.
 * @category Helpers
 */
export class ParticipationReward {
  /**
   * Creates a new `ParticipationReward` instance.
   * @param _participation - The `NectarMissionParticipation` instance that the reward belongs to.
   * @param _reward - The underlying `EarnedReward` object representing the reward data.
   */
  constructor(
    protected _participation: NectarMissionParticipation,
    protected _reward: EarnedReward
  ) {}

  /**
   * Gets the amount of the reward.
   * @returns The amount of the reward.
   * @example
   * const participationReward = new ParticipationReward(participation, rewardData);
   * const amount = participationReward.amount;
   * console.log(amount); // Output: 100
   */
  public get amount() {
    return this._reward.amount;
  }

  /**
   * Checks if the reward has been collected.
   * @returns True if the reward has been collected, false otherwise.
   * @example
   * const participationReward = new ParticipationReward(participation, rewardData);
   * const isCollected = participationReward.collected;
   * console.log(isCollected); // Output: true
   */
  public get collected() {
    return this._reward.collected;
  }

  /**
   * Gets the `NectarMissionParticipation` instance associated with the reward.
   * @returns The `NectarMissionParticipation` instance.
   * @example
   * const participationReward = new ParticipationReward(participation, rewardData);
   * const participation = participationReward.participation();
   * console.log(participation.wallet); // Output: Wallet public key of the participant
   */
  public participation() {
    return this._participation;
  }

  /**
   * Checks if the reward is of type `ParticipationCurrencyRewards`.
   * @returns True if the reward is of type `ParticipationCurrencyRewards`, false otherwise.
   * @example
   * const participationReward = new ParticipationReward(participation, rewardData);
   * if (participationReward.isCurrency()) {
   *   const currencyReward = participationReward as ParticipationCurrencyRewards;
   *   const currency = currencyReward.currency();
   *   console.log(currency.symbol); // Output: "USD" (assuming rewardData.rewardType is of type "Currency")
   * }
   */
  public isCurrency(): this is ParticipationCurrencyRewards {
    return this._reward.rewardType.__kind === "Currency";
  }
}

/**
 * Represents a Participation Reward of type `ParticipationCurrencyRewards`.
 * @category Helpers
 */
export class ParticipationCurrencyRewards extends ParticipationReward {
  constructor(
    _participation: NectarMissionParticipation,
    _reward: EarnedReward
  ) {
    super(_participation, _reward);
  }

  /**
   * Get the currency associated with the reward.
   * @returns The currency object.
   * @throws An error if the reward is not of type "Currency".
   */
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

/**
 * Returns a new instance of `NectarMissions` based on the provided `args`.
 * @category Helpers
 * @param honeycomb - The `Honeycomb` instance.
 * @param args - Either a `web3.PublicKey` or a `NewMissionPoolArgs` object.
 * @returns A `NectarMissions` instance.
 * @example
 * // Create a new mission pool
 * const args: NewMissionPoolArgs = {
 *   args: {
 *     // ... (CreateMissionPoolArgs properties)
 *   },
 *   project: honeycombProject, // Your HoneycombProject instance
 * };
 * const missions = nectarMissionsModule(honeycomb, args);
 *
 * // Get an existing mission pool
 * const missionPoolAddress = new web3.PublicKey("your_mission_pool_address");
 * const missions = nectarMissionsModule(honeycomb, missionPoolAddress);
 */
export const nectarMissionsModule = (
  honeycomb: Honeycomb,
  args: web3.PublicKey | NewMissionPoolArgs
) =>
  args instanceof web3.PublicKey
    ? NectarMissions.fromAddress(honeycomb.connection, args)
    : NectarMissions.new(honeycomb, args);

/**
 * Finds all mission pools associated with a specific `HoneycombProject`.
 * @category Helpers
 * @param project - The `HoneycombProject` instance to search for mission pools.
 * @returns The updated `Honeycomb` instance with mission pools added.
 * @example
 * const project = honeycomb.project("your_project_address");
 * findProjectMissionPools(project).then((updatedHoneycomb) => {
 *   // Access the mission pools associated with the project
 *   const missions = updatedHoneycomb.missions();
 *   console.log(missions); // Output: An array of NectarMissions instances
 * });
 */
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
