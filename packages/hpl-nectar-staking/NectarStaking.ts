import * as web3 from "@solana/web3.js";
import {
  Honeycomb,
  HoneycombProject,
  Module,
  Operation,
} from "@honeycomb-protocol/hive-control";
import {
  AddMultiplierArgs,
  CreateStakingPoolArgs,
  Multipliers,
  MultipliersArgs,
  NFTv1,
  PROGRAM_ID,
  Staker,
  StakingPool,
  UpdateStakingPoolArgs,
} from "./generated";
import {
  createAddMultiplierOperation,
  createClaimRewardsOperation,
  createCreateStakingPoolOperation,
  createInitNFTOperation,
  createInitStakerOperation,
  createStakeOperation,
  createUnstakeOperation,
  createUpdatePoolOperation,
  createWithdrawRewardsOperation,
  fetchAvailableNfts,
  fetchRewards,
  fetchStakedNfts,
} from "./operations";
import { AvailableNft, StakedNft } from "./types";
import { getMultipliersPda, getNftPda, getStakerPda } from "./pdas";
import { HplCurrency } from "@honeycomb-protocol/currency-manager";
import { createLookupTable } from "./utils";

declare module "@honeycomb-protocol/hive-control" {
  interface Honeycomb {
    //@ts-ignore
    _stakings: { [key: string]: NectarStaking };
    staking(key?: string | web3.PublicKey): NectarStaking;
  }
}

/**
 * Represents the arguments for creating a new staking pool.
 * @category Types
 */
type NewStakingPoolArgs = {
  args: CreateStakingPoolArgs;
  project: HoneycombProject;
  currency: HplCurrency;
  collections?: web3.PublicKey[];
  creators?: web3.PublicKey[];
  multipliers?: AddMultiplierArgs[];
  multipliersDecimals?: number;
};

/**
 * Represents the arguments for updating a staking pool.
 * @category Types
 */
type UpdatePoolArgs = {
  args: UpdateStakingPoolArgs;
  collection?: web3.PublicKey;
  creator?: web3.PublicKey;
  merkleTree?: web3.PublicKey;
  currency?: web3.PublicKey;
};

/**
 * Represents data for staking multipliers.
 * @category Types
 */
type StakingMultipliers = MultipliersArgs & {
  address: web3.PublicKey;
};

/**
 * Represents the Nectar Staking module in the Honeycomb Protocol.
 * Allows users to interact with staking pools, claim rewards, and manage staked NFTs.
 * @category Modules
 */
export class NectarStaking extends Module {
  readonly programId: web3.PublicKey = PROGRAM_ID;
  private _fetch: NectarStakingFetch;

  private _multipliers: StakingMultipliers | null = null;
  private _stakers: { [wallet: string]: Staker } = {};
  private _availableNfts: AvailableNft[] | null = null;
  private _stakedNfts: StakedNft[] | null = null;

  /**
   * TODO: move helius rpc to hive-control
   */
  public helius_rpc: string =
    "https://rpc.helius.xyz/?api-key=014b4690-ef6d-4cab-b9e9-d3ec73610d52";

  /**
   * Create a new instance of NectarStaking based on the provided address.
   * @param poolAddress - The address of the staking pool.
   * @param pool - The staking pool details.
   */
  constructor(
    readonly poolAddress: web3.PublicKey,
    private _pool: StakingPool
  ) {
    super();
    this._fetch = new NectarStakingFetch(this);
  }

  /**
   * Create a new instance of NectarStaking based on the provided address.
   * @param connection - The Solana connection object.
   * @param poolAddress - The address of the staking pool.
   * @param commitmentOrConfig - Optional parameter for the commitment or account info config.
   * @returns A new NectarStaking instance.
   */
  static async fromAddress(
    connection: web3.Connection,
    poolAddress: web3.PublicKey,
    commitmentOrConfig?: web3.Commitment | web3.GetAccountInfoConfig
  ) {
    const pool = await StakingPool.fromAccountAddress(
      connection,
      poolAddress,
      commitmentOrConfig
    );
    return new NectarStaking(poolAddress, pool);
  }

  /**
   * Create a new NectarStaking instance with the provided arguments.
   * @param honeycomb - The Honeycomb instance.
   * @param args - The arguments for creating a new staking pool.
   * @param confirmOptions - Optional transaction confirmation options.
   * @returns A new NectarStaking instance representing the created staking pool.
   */
  static async new(
    honeycomb: Honeycomb,
    args: NewStakingPoolArgs,
    confirmOptions?: web3.ConfirmOptions
  ) {
    const { stakingPool, operation } = await createCreateStakingPoolOperation(
      honeycomb,
      {
        programId: PROGRAM_ID,
        ...args,
      }
    );
    await operation.send(confirmOptions);
    return await NectarStaking.fromAddress(
      new web3.Connection(honeycomb.connection.rpcEndpoint, "processed"),
      stakingPool
    );
  }

  /**
   * Get the Honeycomb instance associated with this NectarStaking.
   * @returns The Honeycomb instance.
   */
  public honeycomb() {
    return this._honeycomb;
  }

  /**
   * Get the staking pool details.
   * @returns The staking pool details.
   */
  public pool() {
    return this._pool;
  }

  /**
   * Get the NectarStakingFetch instance to fetch data related to staking pools and NFTs.
   * @returns The NectarStakingFetch instance.
   */
  public fetch() {
    return this._fetch;
  }

  /**
   * Get the address of the staking pool.
   * @returns The address of the staking pool.
   */
  public get address() {
    return this.poolAddress;
  }

  /**
   * Get the lock type of the staking pool.
   */
  public get lockType() {
    return this._pool.lockType;
  }

  /**
   * Get the name of the staking pool.
   */
  public get name() {
    return this._pool.name;
  }
  /**
   * Get the rewards per duration for the staking pool.
   */
  public get rewardsPerDuration() {
    return this._pool.rewardsPerDuration;
  }

  /**
   * Get the rewards duration for the staking pool.
   */
  public get rewardsDuration() {
    return this._pool.rewardsDuration;
  }

  /**
   * Get the maximum rewards duration for the staking pool.
   */
  public get maxRewardsDuration() {
    return this._pool.maxRewardsDuration;
  }

  /**
   * Get the minimum stake duration for the staking pool.
   */
  public get minStakeDuration() {
    return this._pool.minStakeDuration;
  }

  /**
   * Get the cooldown duration for the staking pool.
   */
  public get cooldownDuration() {
    return this._pool.cooldownDuration;
  }

  /**
   * Get the reset stake duration for the staking pool.
   */
  public get resetStakeDuration() {
    return this._pool.resetStakeDuration;
  }

  /**
   * Get the allowed mints for the staking pool.
   */
  public get allowedMints() {
    return this._pool.allowedMints;
  }

  /**
   * Get the total staked amount in the staking pool.
   */
  public get totalStaked() {
    return this._pool.totalStaked;
  }

  /**
   * Get the start time of the staking pool.
   */
  public get startTime() {
    return this._pool.startTime;
  }

  /**
   * Get the end time of the staking pool.
   */
  public get endTime() {
    return this._pool.endTime;
  }

  /**
   * Get the collections associated with the staking pool.
   */
  public get collections() {
    return [...this._pool.collections].map(
      (i) => this.project().collections[i]
    );
  }

  /**
   * Get the creators associated with the staking pool.
   */
  public get creators() {
    return [...this._pool.creators].map((i) => this.project().creators[i]);
  }

  /**
   * Get the merkle trees associated with the staking pool.
   */
  public get merkleTrees() {
    return [...this._pool.merkleTrees].map(
      (i) => this.project().merkleTrees[i]
    );
  }

  /**
   * Get the HoneycombProject associated with this staking pool.
   * @returns The HoneycombProject instance.
   */
  public project() {
    return this._honeycomb.project(this._pool.project);
  }

  /**
   * Get the HplCurrency associated with this staking pool.
   * @returns The HplCurrency instance.
   */
  public currency() {
    return this._honeycomb.currency(this._pool.currency);
  }

  /**
   * Get the vault of the staking pool currency.
   * @returns The vault account address.
   */
  public vault() {
    return this.currency().holderAccount(this.address);
  }

  /**
   * Get the multipliers associated with the staking pool.
   * @param reFetch - If true, re-fetch the data from the blockchain.
   * @returns A Promise that resolves with the multipliers data.
   */
  public async multipliers(reFetch = false) {
    if (!this._multipliers || reFetch) {
      this._multipliers = await this.fetch().multipliers();
    }
    return this._multipliers;
  }

  /**
   * Get the staker associated with the staking pool.
   * @param args - Optional object containing either wallet address or staker address.
   * @param reFetch - If true, re-fetch the data from the blockchain.
   * @returns A Promise that resolves with the Staker instance.
   */
  public async staker(
    args?: { wallet: web3.PublicKey } | { address: web3.PublicKey },
    reFetch = false
  ) {
    let address: web3.PublicKey;
    if (!args) args = { wallet: this.honeycomb().identity().address };
    if ("wallet" in args) {
      address = getStakerPda(this.address, args.wallet, this.programId)[0];
    } else {
      address = args.address;
    }
    if (!this._stakers[address.toString()] || reFetch) {
      this._stakers[address.toString()] = await this.fetch().staker(args);
    }
    return this._stakers[address.toString()];
  }

  /**
   * Fetch the available NFTs for staking in the staking pool.
   * @param reFetch - If true, re-fetch the data from the blockchain.
   * @returns A Promise that resolves with the available NFTs data.
   */
  public async availableNfts(reFetch = false) {
    if (!this._availableNfts || reFetch) {
      this._availableNfts = await this.fetch().availableNfts();
    }
    return this._availableNfts;
  }

  /**
   * Fetch the staked NFTs in the staking pool.
   * @param reFetch - If true, re-fetch the data from the blockchain.
   * @returns A Promise that resolves with the staked NFTs data.
   */
  public async stakedNfts(reFetch = false) {
    if (!this._stakedNfts || reFetch) {
      this._stakedNfts = await this.fetch().stakedNfts();
    }
    return this._stakedNfts;
  }

  /**
   * Reload the data associated with the staking pool, including multipliers, stakers, available NFTs, and staked NFTs.
   * @returns A Promise that resolves when all data is reloaded.
   */
  public reloadData() {
    return Promise.all([
      this.multipliers(true).catch((e) => console.error(e)),
      this.staker(undefined, true).catch((e) => console.error(e)),
      this.availableNfts(true).catch((e) => console.error(e)),
      this.stakedNfts(true).catch((e) => console.error(e)),
    ]);
  }

  /**
   * Update the staking pool with new parameters.
   * @param args - The arguments for updating the staking pool.
   * @param confirmOptions - Optional transaction confirmation options.
   * @returns A Promise that resolves with the context of the transaction.
   */
  public async updatePool(
    args: UpdatePoolArgs,
    confirmOptions?: web3.ConfirmOptions
  ) {
    const { operation } = await createUpdatePoolOperation(this.honeycomb(), {
      project: this.project().address,
      stakingPool: this.address,
      programId: this.programId,
      ...args,
    });
    const context = await operation.send(confirmOptions);
    return context;
  }

  /**
   * Add a new multiplier to the staking pool.
   * @param args - The arguments for adding the multiplier.
   * @param confirmOptions - Optional transaction confirmation options.
   * @returns A promise that resolves when the transaction is confirmed.
   */
  public async addMultiplier(
    args: AddMultiplierArgs,
    confirmOptions?: web3.ConfirmOptions
  ) {
    const { operation } = await createAddMultiplierOperation(this.honeycomb(), {
      args,
      project: this.project().address,
      stakingPool: this.address,
      programId: this.programId,
    });
    return operation.send(confirmOptions);
  }

  /**
   * Withdraw rewards from the staking pool.
   * @param amount - The amount of rewards to withdraw.
   * @param receiverWallet - Optional receiver wallet address, defaults to the identity wallet address.
   * @param confirmOptions - Optional transaction confirmation options.
   * @returns A promise that resolves when the transaction is confirmed.
   */
  public async withdrawRewards(
    amount: number,
    receiverWallet?: web3.PublicKey,
    confirmOptions?: web3.ConfirmOptions
  ) {
    const { operation } = await createWithdrawRewardsOperation(
      this.honeycomb(),
      {
        receiverWallet: receiverWallet || this.honeycomb().identity().address,
        stakingPool: this,
        amount,
        programId: this.programId,
      }
    );
    return operation.send(confirmOptions);
  }

  /**
   * Initialize the staker account for the staking pool.
   * @param confirmOptions - Optional transaction confirmation options.
   * @returns A promise that resolves when the transaction is confirmed.
   */
  public async initStaker(confirmOptions?: web3.ConfirmOptions) {
    const { operation } = await createInitStakerOperation(this.honeycomb(), {
      stakingPool: this,
      programId: this.programId,
    });
    return operation.send(confirmOptions);
  }

  /**
   * Initialize an NFT for the staking pool.
   * @param mint - The address of the NFT mint.
   * @param confirmOptions - Optional transaction confirmation options.
   * @returns A promise that resolves when the transaction is confirmed.
   */
  public async initNft(
    nft: AvailableNft,
    confirmOptions?: web3.ConfirmOptions
  ) {
    const { operation } = await createInitNFTOperation(this.honeycomb(), {
      stakingPool: this,
      nft,
      programId: this.programId,
    });
    return operation.send(confirmOptions);
  }

  /**
   * Stake NFTs in the staking pool.
   * @param nfts - The NFTs to stake.
   * @param confirmOptions - Optional transaction confirmation options.
   * @returns A promise that resolves with an array of responses for the transactions.
   */
  public async stake(
    nfts: AvailableNft[],
    confirmOptions?: web3.ConfirmOptions
  ) {
    const operations = (
      await Promise.all(
        nfts.map((nft, i) =>
          createStakeOperation(this.honeycomb(), {
            stakingPool: this,
            nft,
            isFirst: i == 0,
            programId: this.programId,
          }).then(({ operation }) => operation)
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

    // const operations = await Promise.all(
    //   nfts.map((nft, i) =>
    //     createStakeOperation(this.honeycomb(), {
    //       stakingPool: this,
    //       nft,
    //       isFirst: i == 0,
    //       programId: this.programId,
    //     })
    //   )
    // );

    // const preparedOperations = await this.honeycomb()
    //   .rpc()
    //   .prepareTransactions(
    //     operations.map(({ operation }) => operation.context)
    //   );

    // const firstTxResponse = await this.honeycomb()
    //   .rpc()
    //   .sendAndConfirmTransaction(preparedOperations.shift(), {
    //     commitment: "processed",
    //     ...confirmOptions,
    //   });

    // const responses = await this.honeycomb()
    //   .rpc()
    //   .sendAndConfirmTransactionsInBatches(preparedOperations, {
    //     commitment: "processed",
    //     ...confirmOptions,
    //   });
    // return [firstTxResponse, ...responses];
  }

  /**
   * Claim rewards for staked NFTs.
   * @param nfts - The staked NFTs to claim rewards for.
   * @param confirmOptions - Optional transaction confirmation options.
   * @returns A promise that resolves with an array of responses for the transactions.
   */
  public async claim(nfts: StakedNft[], confirmOptions?: web3.ConfirmOptions) {
    const operations = await Promise.all(
      nfts.map((nft, i) =>
        createClaimRewardsOperation(this.honeycomb(), {
          stakingPool: this,
          nft,
          isFirst: i == 0,
          programId: this.programId,
        })
      )
    );

    const preparedOperations = await this.honeycomb()
      .rpc()
      .prepareTransactions(
        operations.map(({ operation }) => operation.context)
      );

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

  /**
   * Unstake NFTs from the staking pool.
   * @param nfts - The staked NFTs to unstake.
   * @param confirmOptions - Optional transaction confirmation options.
   * @returns A promise that resolves with an array of responses for the transactions.
   */
  public async unstake(
    nfts: StakedNft[],
    confirmOptions?: web3.ConfirmOptions
  ) {
    const operations = await Promise.all(
      nfts.map((nft, i) =>
        createUnstakeOperation(this.honeycomb(), {
          stakingPool: this,
          nft,
          isFirst: i == 0,
          programId: this.programId,
        })
      )
    );

    const preparedOperations = await this.honeycomb()
      .rpc()
      .prepareTransactions(
        operations.map(({ operation }) => operation.context)
      );

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

  /**
   * Install the NectarStaking module into the Honeycomb instance.
   * @param honeycomb - The Honeycomb instance to install the module into.
   * @returns The updated Honeycomb instance with the NectarStaking module installed.
   */
  public install(honeycomb: Honeycomb): Honeycomb {
    if (!honeycomb._stakings) {
      honeycomb._stakings = {};
    }
    //@ts-ignore
    honeycomb._stakings[this.poolAddress.toString()] = this;

    //@ts-ignore
    honeycomb.staking = (key?: string | web3.PublicKey) => {
      if (key) {
        return honeycomb._stakings[
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
 * Represents the API for fetching data related to staking pools and NFTs.
 * @category Helpers
 */
export class NectarStakingFetch {
  constructor(private nectarStaking: NectarStaking) {}

  /**
   * Fetch the multipliers associated with the staking pool.
   * @returns A Promise that resolves with the multipliers data.
   */
  public multipliers() {
    const [multipliersAddress] = getMultipliersPda(
      this.nectarStaking.poolAddress,
      this.nectarStaking.programId
    );
    return Multipliers.fromAccountAddress(
      this.nectarStaking.honeycomb().connection,
      multipliersAddress
    ).then(
      (multipliers) =>
        ({
          ...multipliers,
          address: multipliersAddress,
        } as StakingMultipliers)
    );
  }

  /**
   * Fetch data for a specific NFT mint.
   * @param mint - The address of the NFT mint.
   * @returns A Promise that resolves with the NFT data.
   */
  public nft(mint: web3.PublicKey) {
    const [nftAddress] = getNftPda(
      this.nectarStaking.poolAddress,
      mint,
      this.nectarStaking.programId
    );
    return NFTv1.fromAccountAddress(
      this.nectarStaking.honeycomb().connection,
      nftAddress
    ).then((nft) => ({
      ...nft,
      address: nftAddress,
    }));
  }

  /**
   * Fetch all NFTs staked by a specific wallet in the staking pool.
   * @param walletAddress - The address of the wallet to fetch staked NFTs for.
   * @returns A Promise that resolves with an array of staked NFTs.
   */
  public nftsByWallet(walletAddress?: web3.PublicKey) {
    const gpa = NFTv1.gpaBuilder();
    gpa.addFilter("stakingPool", this.nectarStaking.poolAddress);
    const [staker] = getStakerPda(
      this.nectarStaking.poolAddress,
      walletAddress || this.nectarStaking.honeycomb().identity().address,
      this.nectarStaking.programId
    );
    gpa.addFilter("staker", staker);

    return gpa
      .run(this.nectarStaking.honeycomb().connection)
      .then((nfts) =>
        nfts.map(({ account }) => NFTv1.fromAccountInfo(account)[0])
      );
  }

  /**
   * Fetch a staker's account information.
   * @param args - The arguments to identify the staker (wallet address or account address).
   * @returns A Promise that resolves with the staker's account information.
   */
  public staker(
    args: { wallet: web3.PublicKey } | { address: web3.PublicKey }
  ) {
    let address: web3.PublicKey;
    if ("wallet" in args) {
      address = getStakerPda(
        this.nectarStaking.poolAddress,
        args.wallet,
        this.nectarStaking.programId
      )[0];
    } else {
      address = args.address;
    }
    return Staker.fromAccountAddress(
      this.nectarStaking.honeycomb().connection,
      address
    );
  }

  /**
   * Fetch all staked NFTs of a specific wallet in the staking pool.
   * @param walletAddress - The address of the wallet to fetch staked NFTs for.
   * @returns A Promise that resolves with an array of staked NFTs.
   */
  public stakedNfts(walletAddress?: web3.PublicKey) {
    return fetchStakedNfts(this.nectarStaking.honeycomb(), {
      walletAddress:
        walletAddress || this.nectarStaking.honeycomb().identity().address,
      programId: this.nectarStaking.programId,
    });
  }

  /**
   * Fetch all available NFTs that can be staked in the staking pool.
   * @param walletAddress - The address of the wallet to fetch available NFTs for.
   * @returns A Promise that resolves with an array of available NFTs.
   */
  public availableNfts(walletAddress?: web3.PublicKey) {
    return fetchAvailableNfts(this.nectarStaking.honeycomb(), {
      stakingPool: this.nectarStaking.address,
      walletAddress:
        walletAddress || this.nectarStaking.honeycomb().identity().address,
      programId: this.nectarStaking.programId,
    });
  }

  /**
   * Fetch rewards data for a list of staked NFTs.
   * @param stakedNfts - An array of staked NFTs for which rewards data is to be fetched.
   * @returns A Promise that resolves with an array of rewards data.
   */
  public rewards(stakedNfts: StakedNft[]) {
    return Promise.all(
      stakedNfts.map(async (nft) =>
        fetchRewards(this.nectarStaking, {
          staker: await this.nectarStaking.staker({ address: nft.staker }),
          nft,
        })
      )
    );
  }
}

/**
 * Creates a new NectarStaking instance or retrieves an existing one from the provided Honeycomb instance.
 * If a web3.PublicKey is provided as the `args`, it will retrieve the existing NectarStaking instance
 * associated with that pool address. Otherwise, it will create a new staking pool using the provided arguments.
 * @category Factory
 * @param honeycomb - The Honeycomb instance.
 * @param args - Either a web3.PublicKey representing an existing staking pool address, or an object of type NewStakingPoolArgs for creating a new staking pool.
 * @returns A Promise that resolves with the NectarStaking instance representing the created or retrieved staking pool.
 */
export const nectarStakingModule = (
  honeycomb: Honeycomb,
  args: web3.PublicKey | NewStakingPoolArgs
) =>
  args instanceof web3.PublicKey
    ? NectarStaking.fromAddress(honeycomb.connection, args)
    : NectarStaking.new(honeycomb, args);

/**
 * Find staking pools associated with a specific HoneycombProject instance.
 * It searches for staking pools that have the project's address as the associated project.
 * @category Factory
 * @param project - The HoneycombProject instance.
 * @returns A Promise that resolves with the updated Honeycomb instance with staking pool data.
 */
export const findProjectStakingPools = (project: HoneycombProject) =>
  StakingPool.gpaBuilder()
    .addFilter("project", project.address)
    .run(project.honeycomb().connection)
    .then((currencies) =>
      currencies.map((c) => {
        try {
          project
            .honeycomb()
            .use(
              new NectarStaking(
                c.pubkey,
                StakingPool.fromAccountInfo(c.account)[0]
              )
            );
        } catch {
          return null;
        }
      })
    )
    .then((_) => project.honeycomb());
