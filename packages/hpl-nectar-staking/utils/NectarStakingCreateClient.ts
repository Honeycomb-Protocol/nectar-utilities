// import { CreateClient, CreateModule } from "@honeycomb-protocol/hive-control";
// import { ConfirmOptions, PublicKey } from "@solana/web3.js";
// import { PROGRAM_ID } from "../generated";
// import type { NewStakingPoolArgs } from "../types";
// import {
//   createCreateStakingPoolOperation,
//   createInitStakerOperation,
// } from "../operations";

// /**
//  * Extends the CreateModule interface with the `nectarStaking` method to access the NectarStakingCreateClient.
//  */
// declare module "@honeycomb-protocol/hive-control" {
//   interface CreateModule {
//     staking(): NectarStakingCreateClient;
//   }
// }

// /**
//  * Represents the Create Module which contains boiler plates for creating NectarStaking accounts.
//  * @category Modules
//  */
// export class NectarStakingCreateClient extends CreateClient {
//   /**
//    * Creates a new instance of the NectarStakingCreateClient.
//    */
//   constructor() {
//     super();
//   }

//   /**
//    * Creates a new StakingPool.
//    * @param args The arguments for creating the stakingPool.
//    * @param confirmOptions Optional confirm options for the transaction.
//    */
//   async pool(args: NewStakingPoolArgs, confirmOptions?: ConfirmOptions) {
//     const { stakingPool, operation } = await createCreateStakingPoolOperation(
//       this.honeycomb(),
//       {
//         programId: PROGRAM_ID,
//         ...args,
//       }
//     );
//     const [context] = await operation.send(confirmOptions);
//     return {
//       stakingPool,
//       context,
//     };
//   }

//   /**
//    * Creates a new StakingPool.
//    * @param args The arguments for creating the stakingPool.
//    * @param confirmOptions Optional confirm options for the transaction.
//    */
//   async staker(
//     pool: PublicKey,
//     wallet: PublicKey,
//     confirmOptions?: ConfirmOptions
//   ) {
//     const { project } = await this.honeycomb().fetch().staking().pool(pool);
//     const { operation } = await createInitStakerOperation(this.honeycomb(), {
//       project,
//       pool,
//       wallet,
//     });
//     return operation.send(confirmOptions);
//   }

//   /**
//    * Installs the CreateClient into the Create Module instance.
//    *
//    * @param createModule - The Create Module instance to install the module into.
//    * @returns The modified Create Module instance with the CreateClient installed.
//    */
//   public install(createModule: CreateModule) {
//     this._createModule = createModule;
//     createModule.staking = () => this;
//     return createModule;
//   }
// }

// /**
//  * Factory function to create a new instance of the NectarStakingCreateClient.
//  * @category Factory
//  * @returns A new instance of the NectarStakingCreateClient.
//  */
// export const nectarStakingCreate = () => new NectarStakingCreateClient();
