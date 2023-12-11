import { Commitment, PublicKey } from "@solana/web3.js";
import { OffchainParticipation } from "../types";
import { Mission, MissionPool, Participation } from "../generated";
import {
  FetchModule,
  FetchClient,
  ForceScenario,
} from "@honeycomb-protocol/hive-control";
import { offchainToSolitaParticipation } from ".";

/**
 * Extends the Honeycomb interface with the `fetch` method to access the NectarMissionsFetchClient.
 */
declare module "@honeycomb-protocol/hive-control" {
  interface FetchModule {
    missions(): NectarMissionsFetchClient;
  }
}

/**
 * Represents the Fetch Module which contains boiler plates for fetching NectarMissions accounts.
 * @category Modules
 */
export class NectarMissionsFetchClient extends FetchClient {
  /**
   * Creates a new instance of the NectarMissionsFetchClient.
   */
  constructor() {
    super();
  }

  /**
   * Installs the NectarMissionsFetchClient into the FetchModule instance.
   *
   * @param fetchModule - The FetchModule instance to install the module into.
   * @returns The modified FetchModule instance with the NectarMissionsFetchClient installed.
   */
  public install(fetchModule: FetchModule): FetchModule {
    this._fetchModule = fetchModule;
    fetchModule.missions = () => this;
    return fetchModule;
  }

  /**
   * Creates an instance of HoneycombProject using the provided connection and project address.
   * @param address - The public address of the Public Info account.
   * @param commitment The Solana block commitment.
   * @param forceFetch Wether to use cache data or forcefully refetch.
   * @returns An instance of HoneycombProject.
   */
  public async pool(
    address: PublicKey,
    commitment?: Commitment,
    forceFetch?: ForceScenario
  ): Promise<MissionPool | null> {
    try {
      return MissionPool.fromAccountInfo(
        await this.getAccount(address, { forceFetch, commitment })
      )[0];
    } catch {
      return null;
    }
  }

  /**
   * Creates an instance of HoneycombProject using the provided connection and project address.
   * @param address - The public address of the Public Info account.
   * @param commitment The Solana block commitment.
   * @param forceFetch Wether to use cache data or forcefully refetch.
   * @returns An instance of HoneycombProject.
   */
  public async mission(
    address: PublicKey,
    commitment?: Commitment,
    forceFetch?: ForceScenario
  ): Promise<Mission | null> {
    try {
      return Mission.fromAccountInfo(
        await this.getAccount(address, { forceFetch, commitment })
      )[0];
    } catch {
      return null;
    }
  }

  /**
   * Creates an instance of HoneycombProject using the provided connection and project address.
   * @param address - The public address of the Public Info account.
   * @param commitment The Solana block commitment.
   * @param forceFetch Wether to use cache data or forcefully refetch.
   * @returns An instance of HoneycombProject.
   */
  public async missions(pool: PublicKey): Promise<Mission[] | null> {
    try {
      return Mission.gpaBuilder()
        .addFilter("missionPool", pool)
        .run(this.honeycomb().processedConnection)
        .then((missions) =>
          missions
            .map((m) => {
              try {
                return Mission.fromAccountInfo(m.account)[0];
              } catch {
                return null;
              }
            })
            .filter((x) => !!x)
        );
    } catch {
      return null;
    }
  }

  /**
   * Creates an instance of HoneycombProject using the provided connection and project address.
   * @param address - The public address of the Public Info account.
   * @param commitment The Solana block commitment.
   * @param forceFetch Wether to use cache data or forcefully refetch.
   * @returns An instance of HoneycombProject.
   */
  public async participation(
    address: PublicKey,
    commitment?: Commitment,
    forceFetch?: ForceScenario
  ): Promise<Participation | null> {
    try {
      return Participation.fromAccountInfo(
        await this.getAccount(address, { forceFetch, commitment })
      )[0];
    } catch {
      return null;
    }
  }

  /**
   * Creates an instance of HoneycombProject using the provided connection and project address.
   * @param address - The public address of the Public Info account.
   * @param commitment The Solana block commitment.
   * @param forceFetch Wether to use cache data or forcefully refetch.
   * @returns An instance of HoneycombProject.
   */
  public async participations(args: {
    wallet: PublicKey;
    mission?: PublicKey;
  }): Promise<Participation[] | null>;

  /**
   * Creates an instance of HoneycombProject using the provided connection and project address.
   * @param address - The public address of the Public Info account.
   * @param commitment The Solana block commitment.
   * @param forceFetch Wether to use cache data or forcefully refetch.
   * @returns An instance of HoneycombProject.
   */
  public async participations(args: {
    pool: PublicKey;
    authToken: string;
    page: number;
    pageSize: number;
  }): Promise<Participation[] | null>;

  public async participations(
    args:
      | {
          wallet: PublicKey;
          mission?: PublicKey;
        }
      | {
          pool: PublicKey;
          authToken: string;
          page: number;
          pageSize?: number;
        }
  ): Promise<Participation[] | null> {
    if ("wallet" in args) {
      const gpaBuilder = Participation.gpaBuilder().addFilter(
        "wallet",
        args.wallet
      );
      if (args.mission) {
        gpaBuilder.addFilter("mission", args.mission);
      }
      try {
        return gpaBuilder
          .run(this.honeycomb().processedConnection)
          .then((participations) =>
            participations
              .map((m) => {
                try {
                  return Participation.fromAccountInfo(m.account)[0];
                } catch {
                  return null;
                }
              })
              .filter((x) => !!x)
          );
      } catch {
        return null;
      }
    } else {
      const publicInfo = await this.honeycomb().publicInfo();
      const offchainUrl = publicInfo.get("offchain");

      return fetch(
        `${offchainUrl}/missions/participations/${args.page}/${
          args.pageSize || 99999
        }?missionPool=${args.pool}&isRecalled=false`,
        {
          headers: {
            Authorization: `Bearer ${args.authToken}`,
          },
        }
      )
        .then((res) => res.json())
        .then((res: { data: OffchainParticipation[] }) =>
          res.data.map(offchainToSolitaParticipation)
        );
    }
  }

  /**
   * Creates an instance of HoneycombProject using the provided connection and project address.
   * @param address - The public address of the Public Info account.
   * @param commitment The Solana block commitment.
   * @param forceFetch Wether to use cache data or forcefully refetch.
   * @returns An instance of HoneycombProject.
   */
  public async participationHistory(args: {
    pool: PublicKey;
    authToken: string;
    page: number;
    pageSize: number;
  }): Promise<Participation[] | null> {
    const publicInfo = await this.honeycomb().publicInfo();
    const offchainUrl = publicInfo.get("offchain");

    return fetch(
      `${offchainUrl}/missions/participations/${args.page}/${
        args.pageSize || 99999
      }?missionPool=${args.pool}&isRecalled=true`,
      {
        headers: {
          Authorization: `Bearer ${args.authToken}`,
        },
      }
    )
      .then((res) => res.json())
      .then((res: { data: OffchainParticipation[] }) =>
        res.data.map(offchainToSolitaParticipation)
      );
  }
}

/**
 * Factory function to create a new instance of the NectarMissionsFetchClient.
 * @category Factory
 * @returns A new instance of the NectarMissionsFetchClient.
 */
export const nectarMissionsFetch = () => new NectarMissionsFetchClient();
