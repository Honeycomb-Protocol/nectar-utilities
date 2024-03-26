import { CreateClient, CreateModule } from "@honeycomb-protocol/hive-control";
import { ConfirmOptions } from "@solana/web3.js";
import type { NewMissionArgs, NewMissionPoolArgs } from "../types";
import {
  createCreateMissionOperation,
  createCreateMissionPoolOperation,
} from "../operations";

/**
 * Extends the CreateModule interface with the `nectarMissions` method to access the NectarMissionsCreateClient.
 */
declare module "@honeycomb-protocol/hive-control" {
  interface CreateModule {
    missions(): NectarMissionsCreateClient;
  }
}

/**
 * Represents the Create Module which contains boiler plates for creating NectarMissions accounts.
 * @category Modules
 */
export class NectarMissionsCreateClient extends CreateClient {
  /**
   * Creates a new instance of the NectarMissionsCreateClient.
   */
  constructor() {
    super();
  }

  /**
   * Installs the CreateClient into the Create Module instance.
   *
   * @param createModule - The Create Module instance to install the module into.
   * @returns The modified Create Module instance with the CreateClient installed.
   */
  public install(createModule: CreateModule) {
    this._createModule = createModule;
    createModule.missions = () => this;
    return createModule;
  }

  /**
   * Creates a new StakingPool.
   * @param args The arguments for creating the stakingPool.
   * @param confirmOptions Optional confirm options for the transaction.
   */
  async pool(args: NewMissionPoolArgs, confirmOptions?: ConfirmOptions) {
    const { missionPool, operation } = await createCreateMissionPoolOperation(
      this.honeycomb(),
      args
    );
    const [context] = await operation.send(confirmOptions);
    return {
      address: missionPool,
      context,
    };
  }

  /**
   * Creates a new StakingPool.
   * @param args The arguments for creating the stakingPool.
   * @param confirmOptions Optional confirm options for the transaction.
   */
  async mission(args: NewMissionArgs, confirmOptions?: ConfirmOptions) {
    const { operation, mission } = await createCreateMissionOperation(
      this.honeycomb(),
      args
    );
    const [context] = await operation.send(confirmOptions);
    return {
      address: mission,
      context,
    };
  }
}

/**
 * Factory function to create a new instance of the NectarMissionsCreateClient.
 * @category Factory
 * @returns A new instance of the NectarMissionsCreateClient.
 */
export const nectarMissionsCreate = () => new NectarMissionsCreateClient();
