// import * as web3 from "@solana/web3.js";
// import {
//   CreateMissionArgs,
//   MissionPool,
//   PROGRAM_ID,
//   Participation,
//   UpdateMissionPoolArgs,
// } from "./generated";
// import {
//   ForceScenario,
//   Honeycomb,
//   HoneycombProject,
//   Module,
//   Operation,
//   SendBulkOptions,
// } from "@honeycomb-protocol/hive-control";
// import { NectarStaking, StakedNft } from "@honeycomb-protocol/nectar-staking";
// import {
//   creatRecallOperation,
//   createUpdateMissionPoolOperation,
// } from "./operations";
// import {
//   nectarMissionsCreate,
//   nectarMissionsFetch,
//   nectarMissionsPdas,
// } from "./utils";
// import type { ItemOrArray, NewMissionPoolArgs } from "./types";
// import { NectarMission } from "./Mission";
// import {
//   NectarMissionParticipation,
//   NectarMissionParticipationGuild,
//   NectarMissionParticipationNft,
// } from "./Participation";
// import { BuzzGuild, BuzzGuildKit } from "@honeycomb-protocol/buzz-guild";

// /**
//  * The module declaration for `@honeycomb-protocol/hive-control`.
//  *
//  * @category Module
//  * This module extends the `Honeycomb` interface to add support for missions in the Honeycomb Protocol.
//  */
// declare module "@honeycomb-protocol/hive-control" {
//   /**
//    * The `Honeycomb` interface is extended to include missions-related methods and properties.
//    */
//   interface Honeycomb {
//     /**
//      * An object that holds instances of `NectarMissions`, indexed by their addresses as strings.
//      */
//     _missions: { [key: string]: NectarMissions };

//     /**
//      * Retrieves a specific instance of `NectarMissions` associated with a mission pool using its key or public key.
//      *
//      * @param key - The key or public key of the mission pool to retrieve.
//      * @returns A `NectarMissions` instance representing the requested mission pool.
//      *
//      * @example
//      * const missionPoolKey = "MissionPool1"; // The key or public key of the mission pool
//      * const missionPool = honeycomb.missions(missionPoolKey);
//      * console.log(missionPool); // Output: NectarMissions instance for MissionPool1
//      *
//      * // Alternatively, you can use the public key directly to fetch the mission pool.
//      * const missionPoolPublicKey = new web3.PublicKey("MissionPoolPublicKey");
//      * const missionPool = honeycomb.missions(missionPoolPublicKey);
//      * console.log(missionPool); // Output: NectarMissions instance for MissionPoolPublicKey
//      */
//     missions(key?: string | web3.PublicKey): NectarMissions;
//   }
// }
// /**
//  * The `NectarMissions` class represents a collection of missions in the Honeycomb Protocol.
//  * This class extends the `Module` class and provides methods to interact with missions,
//  * such as creating new missions, updating existing missions, fetching missions, etc.
//  * @category Module
//  */
// export class NectarMissions extends Module<
//   "recall" | "participate",
//   {
//     mission: NectarMission;
//     participations: Map<string, NectarMissionParticipation>;
//   }
// > {
//   /**
//    * The program ID associated with the NectarMissions module.
//    */
//   public readonly programId = PROGRAM_ID;

//   /**
//    * Creates a new `NectarMissions` instance.
//    *
//    * @param address - The public key of the NectarMissions account on the blockchain.
//    * @param _pool - The associated `MissionPool` instance representing the mission pool.
//    */
//   constructor(private _pool: MissionPool) {
//     super();
//   }

//   /**
//    * Creates a new `NectarMissions` instance from the given address on the blockchain.
//    *
//    * @param connection - The Solana connection instance to use for interacting with the blockchain.
//    * @param address - The public key of the NectarMissions account on the blockchain.
//    * @param commitmentOrConfig - Optional commitment level or GetAccountInfoConfig object for fetching account data.
//    * @returns A new `NectarMissions` instance representing the mission pool.
//    *
//    * @async
//    * @example
//    * const connection = new web3.Connection("https://api.mainnet-beta.solana.com");
//    * const address = new web3.PublicKey("..."); // Replace with the actual address of the NectarMissions account.
//    * const missionPool = await NectarMissions.fromAddress(connection, address);
//    */
//   static async fromAddress(
//     honeycomb: Honeycomb,
//     address: web3.PublicKey,
//     commitment?: web3.Commitment,
//     forceFetch?: ForceScenario
//   ) {
//     honeycomb.fetch().register(nectarMissionsFetch());
//     const pool = await honeycomb
//       .fetch()
//       .missions()
//       .pool(address, commitment, forceFetch);
//     return new NectarMissions(pool);
//   }

//   /**
//    * Creates a new mission pool in the Honeycomb Protocol and returns the corresponding `NectarMissions` instance.
//    *
//    * @param honeycomb - The `Honeycomb` instance to use for the transaction.
//    * @param args - The `NewMissionPoolArgs` object containing the necessary data to create the mission pool.
//    * @param confirmOptions - Optional transaction confirmation options.
//    * @returns A new `NectarMissions` instance representing the newly created mission pool.
//    *
//    * @async
//    * @example
//    * const honeycomb = new Honeycomb(...); // Replace with the actual Honeycomb instance.
//    * const args: NewMissionPoolArgs = {
//    *   args: {
//    *     name: "Mission Pool 1",
//    *     ... (other properties from CreateMissionPoolArgs)
//    *     stakingPools: [stakingPool1, stakingPool2],
//    *     creators: [creator1, creator2],
//    *   },
//    *   project: honeycombProject, // Optional, if not provided, it will use the default project
//    * };
//    * const missionPool = await NectarMissions.new(honeycomb, args);
//    */
//   static async new(
//     honeycomb: Honeycomb,
//     args: NewMissionPoolArgs,
//     confirmOptions?: web3.ConfirmOptions
//   ) {
//     honeycomb.pda().register(nectarMissionsPdas());
//     honeycomb.create().register(nectarMissionsCreate());
//     const { address } = await honeycomb
//       .create()
//       .missions()
//       .pool(args, confirmOptions);
//     return NectarMissions.fromAddress(honeycomb, address);
//   }

//   /**
//    * Updates an existing mission pool with new data.
//    *
//    * @param args - The `UpdateMissionPoolArgs` object containing the data to update the mission pool.
//    * @param confirmOptions - Optional transaction confirmation options.
//    * @returns A promise that resolves to the transaction signature after the update is complete.
//    *
//    * @async
//    * @example
//    * const args: UpdateMissionPoolArgs = {
//    *   name: "Updated Mission Pool",
//    *   ... (other properties to update the mission pool)
//    *   stakingPool, // Optional, specify if you want to change the stakingPool
//    * };
//    * const confirmOptions: web3.ConfirmOptions = {
//    *   skipPreflight: false, // Optional, set to true to skip preflight checks
//    * };
//    * await nectarMissions.update(args, confirmOptions);
//    */
//   public async update(
//     args: UpdateMissionPoolArgs & {
//       stakingPool?: web3.PublicKey;
//     },
//     confirmOptions?: web3.ConfirmOptions
//   ) {
//     const { operation } = await createUpdateMissionPoolOperation(
//       this.honeycomb(),
//       {
//         args,
//         programId: PROGRAM_ID,
//         project: this.project().address,
//         missionPool: this.address,
//         stakingPool: args.stakingPool,
//       }
//     );
//     return operation.send(confirmOptions);
//   }

//   public get address() {
//     return this.honeycomb()
//       .pda()
//       .missions()
//       .pool(this.project().address, this.name)[0];
//   }

//   /**
//    * Returns the name of the mission pool.
//    *
//    * @returns The name of the mission pool.
//    *
//    * @example
//    * const poolName = nectarMissions.name;
//    * console.log(poolName); // Output: "Mission Pool 1"
//    */
//   public get name() {
//     return this._pool.name;
//   }

//   /**
//    * Returns the `HoneycombProject` associated with the mission pool.
//    *
//    * @returns The `HoneycombProject` associated with the mission pool.
//    *
//    * @example
//    * const project = nectarMissions.project();
//    * console.log(project); // Output: HoneycombProject instance representing the project
//    */
//   public project() {
//     return this._honeycomb.project(this._pool.project);
//   }

//   /**
//    * Get the all the staking pools associated with the mission pool.
//    *
//    * @returns The `NectarStaking` instances associated with the mission pool.
//    */
//   public stakingPools(): NectarStaking[] {
//     return [...this._pool.stakingPools].map((x) =>
//       this.honeycomb().staking(
//         (
//           this.project().services[x] as {
//             __kind: "Staking";
//             poolId: web3.PublicKey;
//           }
//         ).poolId
//       )
//     );
//   }

//   public stakedNfts(): Promise<StakedNft[]> {
//     return Promise.all(
//       this.stakingPools().map((pool) => pool.stakedNfts())
//     ).then((x) => x.flat());
//   }

//   /**
//    * Get the all the staking pools associated with the mission pool.
//    *
//    * @returns The `NectarStaking` instances associated with the mission pool.
//    */
//   public guildKits(): BuzzGuildKit[] {
//     return [...this._pool.guildKits].map((x) =>
//       this.honeycomb().guildKit(
//         (
//           this.project().services[x] as {
//             __kind: "GuildKit";
//             kitId: web3.PublicKey;
//           }
//         ).kitId
//       )
//     );
//   }

//   public guilds(): Promise<BuzzGuild[]> {
//     return Promise.all(this.guildKits().map((kit) => kit.guilds())).then((x) =>
//       x.flat()
//     );
//   }

//   public async add(
//     args: CreateMissionArgs,
//     confirmOptions?: web3.ConfirmOptions
//   ) {
//     const { address } = await this.honeycomb().create().missions().mission(
//       {
//         args,
//         pool: this.address,
//         project: this.project().address,
//       },
//       confirmOptions
//     );
//     return this.mission(
//       address,
//       confirmOptions?.commitment || "processed",
//       ForceScenario.Force
//     );
//   }
//   public get newMission() {
//     return this.add;
//   }

//   /**
//    * Retrieves a specific mission associated with the mission pool by its name or public key.
//    *
//    * @param name - The name of the mission or the public key of the mission account.
//    * @param reFetch - Set to `true` to force fetching the mission from the blockchain, even if cached.
//    * @param commitmentOrConfig - Optional commitment level or GetAccountInfoConfig object for fetching account data.
//    * @returns A promise that resolves to the `NectarMission` instance representing the requested mission.
//    *
//    * @async
//    * @example
//    * const missionName = "Mission1"; // The name of the mission or the public key of the mission account
//    * const mission = await nectarMissions.mission(missionName);
//    * console.log(mission); // Output: NectarMission instance for Mission1
//    *
//    * // Alternatively, you can use the public key directly to fetch the mission.
//    * const missionPublicKey = new web3.PublicKey("MissionPublicKey");
//    * const mission = await nectarMissions.mission(missionPublicKey);
//    * console.log(mission); // Output: NectarMission instance for MissionPublicKey
//    */
//   public async mission(
//     name: string,
//     commitment?: web3.Commitment,
//     forceFetch?: ForceScenario
//   ): Promise<NectarMission>;

//   public async mission(
//     address: web3.PublicKey,
//     commitment?: web3.Commitment,
//     forceFetch?: ForceScenario
//   ): Promise<NectarMission>;

//   public async mission(
//     nameOrAddress: web3.PublicKey | string,
//     commitment: web3.Commitment = "processed",
//     forceFetch = ForceScenario.NoForce
//   ): Promise<NectarMission> {
//     return this.cache.getOrFetch(
//       "mission",
//       this.honeycomb().identity().address.toString(),
//       () =>
//         this.honeycomb()
//           .fetch()
//           .missions()
//           .mission(
//             typeof nameOrAddress == "string"
//               ? this.honeycomb()
//                   .pda()
//                   .missions()
//                   .mission(this.address, nameOrAddress)[0]
//               : nameOrAddress,
//             commitment,
//             forceFetch
//           )
//           .then((mission) => new NectarMission(this, mission)),
//       forceFetch
//     );
//   }

//   /**
//    * Retrieves all missions associated with the mission pool.
//    *
//    * @param reFetch - Set to `true` to force fetching missions from the blockchain, even if cached.
//    * @returns An array of `NectarMission` instances representing the missions associated with the mission pool.
//    *
//    * @async
//    * @example
//    * const missions = await nectarMissions.missions();
//    * console.log(missions); // Output: [NectarMission1, NectarMission2, ...]
//    */
//   public async missions(forceFetch = ForceScenario.NoForce) {
//     const missions = this.cache.get("mission");
//     if (missions.length === 0 || forceFetch == ForceScenario.Force) {
//       await this.honeycomb()
//         .fetch()
//         .missions()
//         .missions(this.address)
//         .then((missions) =>
//           missions.forEach((mission) => {
//             const nectarMission = new NectarMission(this, mission);
//             this.cache.set(
//               "mission",
//               nectarMission.address.toString(),
//               nectarMission
//             );
//           })
//         );
//     }
//     return this.cache.get("mission");
//   }

//   private async fetchParticipationsUsing(
//     fetch: () => Promise<Participation[]>,
//     forceFetch = ForceScenario.NoForce
//   ) {
//     const missions = await this.missions().then((missions) =>
//       missions.reduce(
//         (acc, mission) => ({ ...acc, [mission.address.toString()]: mission }),
//         {} as { [key: string]: NectarMission }
//       )
//     );

//     const stakedNfts = await this.stakedNfts();
//     const guilds = await this.guilds();
//     const item = this.cache.get(
//       "participations",
//       this.honeycomb().identity().address.toString()
//     );
//     if (!item || item.size === 0 || forceFetch === ForceScenario.Force) {
//       await fetch().then((participations) =>
//         this.cache.updateSync(
//           "participations",
//           this.honeycomb().identity().address.toString(),
//           (participationsMap) => {
//             participationsMap = new Map();
//             participations.forEach((_participation) => {
//               if (
//                 !Object.keys(missions).includes(
//                   _participation.mission.toString()
//                 )
//               )
//                 return;
//               const participation =
//                 _participation.instrument.__kind === "Nft"
//                   ? new NectarMissionParticipationNft(
//                       missions[_participation.mission.toString()],
//                       _participation,
//                       stakedNfts.find((n) =>
//                         this.honeycomb()
//                           .pda()
//                           .staking()
//                           .nft(n.stakingPool, n.mint)[0]
//                           .equals(_participation.instrument.fields[0])
//                       )
//                     )
//                   : new NectarMissionParticipationGuild(
//                       missions[_participation.mission.toString()],
//                       _participation,
//                       guilds.find((g) =>
//                         g.address.equals(_participation.instrument.fields[0])
//                       )
//                     );
//               participationsMap.set(
//                 participation.address.toString() +
//                   participation.endTime.getTime(),
//                 participation
//               );
//             });
//             return participationsMap;
//           }
//         )
//       );
//     }

//     return Array.from(
//       this.cache
//         .get("participations", this.honeycomb().identity().address.toString())
//         .values()
//     );
//   }

//   /**
//    * Retrieves mission participations for a given wallet address associated with the mission pool.
//    *
//    * @param wallet - The public key of the wallet for which to retrieve mission participations.
//    * If not provided, the default wallet associated with the `Honeycomb` instance will be used.
//    * @param reFetch - Set to `true` to force fetching participations from the blockchain, even if cached.
//    * @returns An array of `NectarMissionParticipation` instances representing the mission participations
//    * associated with the wallet.
//    *
//    * @async
//    * @example
//    * // Retrieve mission participations for the default wallet
//    * const participations = await nectarMissions.participations();
//    * console.log(participations); // Output: [NectarMissionParticipation1, NectarMissionParticipation2, ...]
//    *
//    * // Alternatively, you can specify the wallet address to retrieve participations for a specific wallet
//    * const walletAddress = new web3.PublicKey("WalletAddress");
//    * const participations = await nectarMissions.participations(walletAddress);
//    * console.log(participations); // Output: [NectarMissionParticipation1, NectarMissionParticipation2, ...]
//    */
//   public async participations(
//     argsOrforceFetch?:
//       | ForceScenario
//       | {
//           authToken?: string;
//           wallets?: string[];
//           page: number;
//           pageSize: number;
//           forceFetch?: ForceScenario;
//         }
//   ) {
//     return this.fetchParticipationsUsing(
//       () =>
//         typeof argsOrforceFetch === "object"
//           ? this.honeycomb()
//               .fetch()
//               .missions()
//               .participations({
//                 pool: this.address,
//                 ...argsOrforceFetch,
//               })
//           : this.honeycomb().fetch().missions().participations({
//               wallet: this.honeycomb().identity().address,
//             }),
//       typeof argsOrforceFetch === "object"
//         ? argsOrforceFetch.forceFetch
//         : argsOrforceFetch
//     );
//   }

//   /**
//    * Retrieves mission participations for a given wallet address associated with the mission pool.
//    *
//    * @param wallet - The public key of the wallet for which to retrieve mission participations.
//    * If not provided, the default wallet associated with the `Honeycomb` instance will be used.
//    * @param reFetch - Set to `true` to force fetching participations from the blockchain, even if cached.
//    * @returns An array of `NectarMissionParticipation` instances representing the mission participations
//    * associated with the wallet.
//    *
//    * @async
//    * @example
//    * // Retrieve mission participations for the default wallet
//    * const participations = await nectarMissions.participations();
//    * console.log(participations); // Output: [NectarMissionParticipation1, NectarMissionParticipation2, ...]
//    *
//    * // Alternatively, you can specify the wallet address to retrieve participations for a specific wallet
//    * const walletAddress = new web3.PublicKey("WalletAddress");
//    * const participations = await nectarMissions.participations(walletAddress);
//    * console.log(participations); // Output: [NectarMissionParticipation1, NectarMissionParticipation2, ...]
//    */
//   public async history(args: {
//     authToken?: string;
//     wallets?: string[];
//     page: number;
//     pageSize: number;
//     forceFetch?: ForceScenario;
//   }) {
//     return this.fetchParticipationsUsing(
//       () =>
//         this.honeycomb()
//           .fetch()
//           .missions()
//           .participationHistory({
//             pool: this.address,
//             ...args,
//           }),
//       args.forceFetch
//     );
//   }

//   /**
//    * Registers a new `NectarMission` or `NectarMissionParticipation` with the `NectarMissions` instance.
//    * This method is used to add missions or mission participations to the cache to avoid unnecessary fetching.
//    *
//    * @param mission - The `NectarMission` instance to register.
//    * @returns The `NectarMissions` instance with the mission or participation added to the cache.
//    *
//    * @example
//    * const newMission = new NectarMission(...); // Replace with the actual NectarMission instance.
//    * nectarMissions.register(newMission);
//    *
//    * // Alternatively, you can register an array of participations at once
//    * const participations = [participation1, participation2, ...]; // Replace with actual NectarMissionParticipation instances
//    * nectarMissions.register(participations);
//    */
//   public register(mission: NectarMission): NectarMissions;
//   public register(participations: NectarMissionParticipation[]): NectarMissions;
//   public register(
//     arg: ItemOrArray<NectarMission> | ItemOrArray<NectarMissionParticipation>
//   ) {
//     if (Array.isArray(arg)) {
//       arg.forEach((x) => this.register(x));
//     } else {
//       if (arg instanceof NectarMission) {
//         this.cache.set("mission", arg.address.toString(), arg);
//       } else if (arg instanceof NectarMissionParticipation) {
//         this.cache.updateSync(
//           "participations",
//           arg.wallet.toString(),
//           (participationsMap) => {
//             participationsMap.set(arg.address.toString(), arg);
//             return participationsMap;
//           }
//         );
//       } else {
//         throw new Error("Unrecognized item");
//       }
//     }
//     return this;
//   }

//   /**
//    * Initiates a recall operation for a set of `NectarMissionParticipation`.
//    * This method is used to recall rewards from completed missions for a given set of participations.
//    *
//    * @param participations - An array of `NectarMissionParticipation` instances for which to initiate the recall.
//    * @param confirmOptions - Optional transaction confirmation options.
//    * @returns A promise that resolves to the transaction signature after the recall operation is complete.
//    *
//    * @async
//    * @example
//    * const participations = [participation1, participation2, ...]; // Replace with actual NectarMissionParticipation instances
//    * const confirmOptions: web3.ConfirmOptions = {
//    *   skipPreflight: false, // Optional, set to true to skip preflight checks
//    * };
//    * const recallSignature = await nectarMissions.recall(participations, confirmOptions);
//    */
//   public async recall(
//     participations: NectarMissionParticipation[],
//     options: web3.ConfirmOptions & SendBulkOptions = {}
//   ) {
//     const operations = await Promise.all(
//       participations.map((participation, i) =>
//         creatRecallOperation(
//           this.honeycomb(),
//           {
//             participation,
//             programId: this.programId,
//           },
//           this.getLuts("recall")
//         ).then(({ operation }) => operation)
//       )
//     );

//     return Operation.sendBulk(this.honeycomb(), operations, {
//       prepareAllAtOnce: participations.length < 2,
//       ...options,
//     });
//   }

//   /**
//    * Installs the `NectarMissions` instance into the provided `Honeycomb` instance.
//    * This method is used internally to link the mission pool to the Honeycomb instance.
//    *
//    * @param honeycomb - The `Honeycomb` instance to install the mission pool into.
//    * @returns The `Honeycomb` instance with the mission pool installed.
//    *
//    * @example
//    * const honeycomb = new Honeycomb(...); // Replace with the actual Honeycomb instance.
//    * nectarMissions.install(honeycomb);
//    */
//   public install(honeycomb: Honeycomb): Honeycomb {
//     if (!honeycomb._missions) {
//       honeycomb._missions = {};
//       honeycomb.pda().register(nectarMissionsPdas());
//       honeycomb.fetch().register(nectarMissionsFetch());
//       honeycomb.create().register(nectarMissionsCreate());
//     }

//     this._honeycomb = honeycomb;
//     honeycomb._missions[this.address.toString()] = this;

//     honeycomb.missions = (key?: string | web3.PublicKey) => {
//       if (key) {
//         return honeycomb._missions[
//           key instanceof web3.PublicKey ? key.toString() : key
//         ];
//       } else {
//         return this;
//       }
//     };

//     return honeycomb;
//   }
// }

// /**
//  * Returns a new instance of `NectarMissions` based on the provided `args`.
//  * @category Helpers
//  * @param honeycomb - The `Honeycomb` instance.
//  * @param args - Either a `web3.PublicKey` or a `NewMissionPoolArgs` object.
//  * @returns A `NectarMissions` instance.
//  * @example
//  * // Create a new mission pool
//  * const args: NewMissionPoolArgs = {
//  *   args: {
//  *     // ... (CreateMissionPoolArgs properties)
//  *   },
//  *   project: honeycombProject, // Your HoneycombProject instance
//  * };
//  * const missions = nectarMissionsModule(honeycomb, args);
//  *
//  * // Get an existing mission pool
//  * const missionPoolAddress = new web3.PublicKey("your_mission_pool_address");
//  * const missions = nectarMissionsModule(honeycomb, missionPoolAddress);
//  */
// export const nectarMissionsModule = (
//   honeycomb: Honeycomb,
//   args: web3.PublicKey | NewMissionPoolArgs
// ) =>
//   args instanceof web3.PublicKey
//     ? NectarMissions.fromAddress(honeycomb, args)
//     : NectarMissions.new(honeycomb, args);

// /**
//  * Finds all mission pools associated with a specific `HoneycombProject`.
//  * @category Helpers
//  * @param project - The `HoneycombProject` instance to search for mission pools.
//  * @returns The updated `Honeycomb` instance with mission pools added.
//  * @example
//  * const project = honeycomb.project("your_project_address");
//  * findProjectMissionPools(project).then((updatedHoneycomb) => {
//  *   // Access the mission pools associated with the project
//  *   const missions = updatedHoneycomb.missions();
//  *   console.log(missions); // Output: An array of NectarMissions instances
//  * });
//  */
// export const findProjectMissionPools = (project: HoneycombProject) =>
//   MissionPool.gpaBuilder()
//     .addFilter("project", project.address)
//     .run(project.honeycomb().processedConnection)
//     .then((currencies) =>
//       currencies.map((c) => {
//         try {
//           project
//             .honeycomb()
//             .use(new NectarMissions(MissionPool.fromAccountInfo(c.account)[0]));
//         } catch (e) {
//           console.error(e);
//           return null;
//         }
//       })
//     )
//     .then((_) => project.honeycomb());
