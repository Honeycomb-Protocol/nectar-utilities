import { PublicKey } from "@solana/web3.js";
import { PdaClient, PdaModule } from "@honeycomb-protocol/hive-control";
import { PROGRAM_ID } from "../generated";

/**
 * Extends the Honeycomb interface with the `pda` method to access the NectarStakingPdas.
 */
declare module "@honeycomb-protocol/hive-control" {
  interface PdaModule {
    staking: () => NectarStakingPdas;
  }
}

/**
 * Represents the Fetch Module which contains boiler plates for pda generations.
 * @category Modules
 */
export class NectarStakingPdas extends PdaClient {
  readonly defaultProgramId = PROGRAM_ID;

  /**
   * Creates a new instance of the NectarStakingPdas.
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
    pdaModule.staking = () => this;
    return pdaModule;
  }

  /**
   * Calculates the Program Derived Address (PDA) for a stakingPool account.
   * @category Helpers
   * @param project The project address.
   * @param key The stakingPool key.
   * @param programId The program ID for which the PDA is calculated. Default is the nectar staking program ID.
   * @returns The PDA for the stakingPool account.
   */
  stakingPool = (
    project: PublicKey,
    key: PublicKey,
    programId: PublicKey = this.defaultProgramId
  ) => {
    const buffers = [
      Buffer.from("staking_pool"),
      project.toBuffer(),
      key.toBuffer(),
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
  staker = (
    pool: PublicKey,
    wallet: PublicKey,
    programId: PublicKey = this.defaultProgramId
  ) => {
    const buffers = [Buffer.from("staker"), pool.toBuffer(), wallet.toBuffer()];
    return PdaModule.findProgramAddressSyncWithSeeds(buffers, programId);
  };

  /**
   * Calculates the Program Derived Address (PDA) for an nft account.
   * @category Helpers
   * @param pool The stakingPool address.
   * @param mint The mint address.
   * @param programId The program ID for which the PDA is calculated. Default is the nectar staking program ID.
   * @returns The PDA for the stakingPool account.
   */
  nft = (
    pool: PublicKey,
    mint: PublicKey,
    programId: PublicKey = this.defaultProgramId
  ) => {
    const buffers = [Buffer.from("nft"), mint.toBuffer(), pool.toBuffer()];
    return PdaModule.findProgramAddressSyncWithSeeds(buffers, programId);
  };

  /**
   * Calculates the Program Derived Address (PDA) for an nft deposit account.
   * @category Helpers
   * @param mint The mint address.
   * @param programId The program ID for which the PDA is calculated. Default is the nectar staking program ID.
   * @returns The PDA for the stakingPool account.
   */
  deposit = (mint: PublicKey, programId: PublicKey = this.defaultProgramId) => {
    const buffers = [Buffer.from("deposit"), mint.toBuffer()];
    return PdaModule.findProgramAddressSyncWithSeeds(buffers, programId);
  };

  /**
   * Calculates the Program Derived Address (PDA) for an nft account.
   * @category Helpers
   * @param pool The stakingPool address.
   * @param programId The program ID for which the PDA is calculated. Default is the nectar staking program ID.
   * @returns The PDA for the stakingPool account.
   */
  multipliers = (
    pool: PublicKey,
    programId: PublicKey = this.defaultProgramId
  ) => {
    const buffers = [Buffer.from("multipliers"), pool.toBuffer()];
    return PdaModule.findProgramAddressSyncWithSeeds(buffers, programId);
  };
}

/**
 * Factory function to create a new instance of the NectarStakingPdas.
 * @category Factory
 * @returns A new instance of the NectarStakingPdas.
 */
export const nectarStakingPdas = () => new NectarStakingPdas();
