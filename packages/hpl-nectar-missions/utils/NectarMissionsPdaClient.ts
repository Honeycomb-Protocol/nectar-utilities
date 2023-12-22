import { PublicKey } from "@solana/web3.js";
import { PdaClient, PdaModule } from "@honeycomb-protocol/hive-control";
import { PROGRAM_ID } from "../generated";

/**
 * Extends the Honeycomb interface with the `pda` method to access the NectarMissionsPdas.
 */
declare module "@honeycomb-protocol/hive-control" {
  interface PdaModule {
    missions: () => NectarMissionsPdas;
  }
}

/**
 * Represents the Fetch Module which contains boiler plates for pda generations.
 * @category Modules
 */
export class NectarMissionsPdas extends PdaClient {
  readonly defaultProgramId = PROGRAM_ID;

  /**
   * Creates a new instance of the NectarMissionsPdas.
   */
  constructor() {
    super();
  }

  /**
   * Install this client in the PdaModule.
   * Every derived module class must implement this method.
   * @param pdaModule The PdaModule instance to install the client in.
   * @returns The updated PdaModule instance with the installed client.
   */
  public install(pdaModule: PdaModule): PdaModule {
    pdaModule.missions = () => this;
    return pdaModule;
  }

  /**
   * Calculates the Program Derived Address (PDA) for a staker account.
   * @category Helpers
   * @param pool The stakingPool address.
   * @param wallet The wallet address.
   * @param programId The program ID for which the PDA is calculated. Default is the nectar staking program ID.
   * @returns The PDA for the stakingPool account.
   */
  pool = (
    project: PublicKey,
    name: string,
    programId: PublicKey = this.defaultProgramId
  ) => {
    const buffers = [
      Buffer.from("mission_pool"),
      project.toBuffer(),
      Buffer.from(name),
    ];
    return PdaModule.findProgramAddressSyncWithSeeds(buffers, programId);
  };

  /**
   * Calculates the Program Derived Address (PDA) for a staker account.
   * @category Helpers
   * @param pool The stakingPool address.
   * @param wallet The wallet address.
   * @param programId The program ID for which the PDA is calculated. Default is the nectar staking program ID.
   * @returns The PDA for the stakingPool account.
   */
  mission = (
    pool: PublicKey,
    name: string,
    programId: PublicKey = this.defaultProgramId
  ) => {
    const buffers = [
      Buffer.from("mission"),
      pool.toBuffer(),
      Buffer.from(name),
    ];
    return PdaModule.findProgramAddressSyncWithSeeds(buffers, programId);
  };

  /**
   * Calculates the Program Derived Address (PDA) for a staker account.
   * @category Helpers
   * @param pool The stakingPool address.
   * @param wallet The wallet address.
   * @param programId The program ID for which the PDA is calculated. Default is the nectar staking program ID.
   * @returns The PDA for the stakingPool account.
   */
  participation = (
    instrument: PublicKey,
    programId: PublicKey = this.defaultProgramId
  ) => {
    const buffers = [Buffer.from("participation"), instrument.toBuffer()];
    return PdaModule.findProgramAddressSyncWithSeeds(buffers, programId);
  };
}

/**
 * Factory function to create a new instance of the NectarMissionsPdas.
 * @category Factory
 * @returns A new instance of the NectarMissionsPdas.
 */
export const nectarMissionsPdas = () => new NectarMissionsPdas();
