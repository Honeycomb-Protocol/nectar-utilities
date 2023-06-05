import * as web3 from "@solana/web3.js";
import {
  Honeycomb,
  HoneycombProject,
  Module,
} from "@honeycomb-protocol/hive-control";
import {
  AddMultiplierArgs,
  CreateStakingPoolArgs,
  Multipliers,
  MultipliersArgs,
  NFT,
  PROGRAM_ID,
  Staker,
  StakingPool,
  UpdateStakingPoolArgs,
} from "./generated";
import {
  addMultiplier,
  claimRewards,
  createStakingPool,
  fetchAvailableNfts,
  fetchRewards,
  fetchStakedNfts,
  initNft,
  initStaker,
  stake,
  unstake,
  updateStakingPool,
  withdrawRewards,
} from "./operations";
import { AvailableNft, StakedNft } from "./types";
import { getMultipliersPda, getNftPda, getStakerPda } from "./pdas";

declare module "@honeycomb-protocol/hive-control" {
  interface Honeycomb {
    //@ts-ignore
    _stakings: { [key: string]: NectarStaking };
    staking(key?: string | web3.PublicKey): NectarStaking;
  }
}

type NewStakingPoolArgs = {
  args: CreateStakingPoolArgs;
  currency: web3.PublicKey;
  collections?: web3.PublicKey[];
  creators?: web3.PublicKey[];
  multipliers?: AddMultiplierArgs[];
  multipliersDecimals?: number;
};

type UpdatePoolArgs = {
  args: UpdateStakingPoolArgs;
  collection?: web3.PublicKey;
  creator?: web3.PublicKey;
};

type StakingMultipliers = MultipliersArgs & {
  address: web3.PublicKey;
};

export class NectarStaking extends Module {
  readonly programId: web3.PublicKey = PROGRAM_ID;
  private _fetch: NectarStakingFetch;

  private _multipliers: StakingMultipliers | null = null;
  private _stakers: { [wallet: string]: Staker } = {};
  private _availableNfts: AvailableNft[] | null = null;
  private _stakedNfts: StakedNft[] | null = null;

  constructor(
    readonly poolAddress: web3.PublicKey,
    private _pool: StakingPool
  ) {
    super();
    this._fetch = new NectarStakingFetch(this);
  }

  static async fromAddress(
    connection: web3.Connection,
    poolAddress: web3.PublicKey
  ) {
    const pool = await StakingPool.fromAccountAddress(connection, poolAddress);
    return new NectarStaking(poolAddress, pool);
  }

  static async new(
    honeycomb: Honeycomb,
    args: NewStakingPoolArgs,
    confirmOptions?: web3.ConfirmOptions
  ) {
    const { poolId } = await createStakingPool(
      honeycomb,
      {
        programId: PROGRAM_ID,
        ...args,
      },
      confirmOptions
    );
    return await NectarStaking.fromAddress(
      new web3.Connection(honeycomb.connection.rpcEndpoint, "processed"),
      poolId
    );
  }

  public honeycomb() {
    return this._honeycomb;
  }

  public pool() {
    return this._pool;
  }

  public fetch() {
    return this._fetch;
  }

  public get address() {
    return this.poolAddress;
  }

  public get lockType() {
    return this._pool.lockType;
  }

  public get name() {
    return this._pool.name;
  }

  public get rewardsPerDuration() {
    return this._pool.rewardsPerDuration;
  }

  public get rewardsDuration() {
    return this._pool.rewardsDuration;
  }

  public get maxRewardsDuration() {
    return this._pool.maxRewardsDuration;
  }

  public get minStakeDuration() {
    return this._pool.minStakeDuration;
  }

  public get cooldownDuration() {
    return this._pool.cooldownDuration;
  }

  public get resetStakeDuration() {
    return this._pool.resetStakeDuration;
  }

  public get allowedMints() {
    return this._pool.allowedMints;
  }

  public get totalStaked() {
    return this._pool.totalStaked;
  }

  public get startTime() {
    return this._pool.startTime;
  }

  public get endTime() {
    return this._pool.endTime;
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

  public currency() {
    return this._honeycomb.currency(this._pool.currency);
  }

  public vault() {
    return this.currency().holderAccount(this.address);
  }

  public multipliers() {
    if (this._multipliers) {
      return Promise.resolve(this._multipliers);
    }
    return this._fetch.multipliers().then((multipliers) => {
      this._multipliers = multipliers;
      return multipliers;
    });
  }

  public async staker(
    args?: { wallet: web3.PublicKey } | { address: web3.PublicKey },
    reFetch = false
  ) {
    let address: web3.PublicKey;
    if (!args) args = { wallet: this.honeycomb().identity().publicKey };
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

  public availableNfts() {
    if (this._availableNfts) {
      return Promise.resolve(this._availableNfts);
    }
    return this._fetch.availableNfts().then((nfts) => {
      this._availableNfts = nfts;
      return nfts;
    });
  }

  public stakedNfts() {
    if (this._stakedNfts) {
      return Promise.resolve(this._stakedNfts);
    }
    return this._fetch.stakedNfts().then((nfts) => {
      this._stakedNfts = nfts;
      return nfts;
    });
  }

  public reloadData() {
    return Promise.all([
      this._fetch
        .multipliers()
        .then((multipliers) => {
          this._multipliers = multipliers;
          return multipliers;
        })
        .catch((e) => console.error(e)),
      this.staker(undefined, true).catch((e) => console.error(e)),
      this._fetch
        .availableNfts()
        .then((nfts) => {
          this._availableNfts = nfts;
          return nfts;
        })
        .catch((e) => console.error(e)),
      this._fetch
        .stakedNfts()
        .then((nfts) => {
          this._stakedNfts = nfts;
          return nfts;
        })
        .catch((e) => console.error(e)),
    ]);
  }

  public updatePool(
    args: UpdatePoolArgs,
    confirmOptions?: web3.ConfirmOptions
  ) {
    return updateStakingPool(
      this,
      {
        programId: this.programId,
        ...args,
      },
      confirmOptions
    );
  }

  public addMultiplier(
    args: AddMultiplierArgs,
    confirmOptions?: web3.ConfirmOptions
  ) {
    return addMultiplier(
      this,
      {
        args,
        programId: this.programId,
      },
      confirmOptions
    );
  }

  public withdrawRewards(amount: number, confirmOptions?: web3.ConfirmOptions) {
    return withdrawRewards(
      this,
      {
        amount,
        programId: this.programId,
      },
      confirmOptions
    );
  }

  public initStaker(confirmOptions?: web3.ConfirmOptions) {
    return initStaker(
      this._honeycomb,
      {
        programId: this.programId,
      },
      confirmOptions
    );
  }

  public initNft(mint: web3.PublicKey, confirmOptions?: web3.ConfirmOptions) {
    return initNft(
      this._honeycomb,
      {
        nftMint: mint,
        programId: this.programId,
      },
      confirmOptions
    );
  }

  public stake(nfts: AvailableNft[], confirmOptions?: web3.ConfirmOptions) {
    return stake(
      this._honeycomb,
      {
        nfts,
        programId: this.programId,
      },
      confirmOptions
    ).then((res) => this.reloadData().then(() => res));
  }

  public claim(nfts: StakedNft[], confirmOptions?: web3.ConfirmOptions) {
    return claimRewards(
      this._honeycomb,
      {
        nfts,
        programId: this.programId,
      },
      confirmOptions
    ).then((res) => this.reloadData().then(() => res));
  }

  public unstake(nfts: StakedNft[], confirmOptions?: web3.ConfirmOptions) {
    return unstake(
      this._honeycomb,
      {
        nfts,
        programId: this.programId,
      },
      confirmOptions
    ).then((res) => this.reloadData().then(() => res));
  }

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

export class NectarStakingFetch {
  constructor(private nectarStaking: NectarStaking) {}

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

  public nft(mint: web3.PublicKey) {
    const [nftAddress] = getNftPda(
      this.nectarStaking.poolAddress,
      mint,
      this.nectarStaking.programId
    );
    return NFT.fromAccountAddress(
      this.nectarStaking.honeycomb().connection,
      nftAddress
    ).then((nft) => ({
      ...nft,
      address: nftAddress,
    }));
  }

  public nftsByWallet(walletAddress?: web3.PublicKey) {
    const gpa = NFT.gpaBuilder();
    gpa.addFilter("stakingPool", this.nectarStaking.poolAddress);
    const [staker] = getStakerPda(
      this.nectarStaking.poolAddress,
      walletAddress || this.nectarStaking.honeycomb().identity().publicKey,
      this.nectarStaking.programId
    );
    gpa.addFilter("staker", staker);

    return gpa
      .run(this.nectarStaking.honeycomb().connection)
      .then((nfts) =>
        nfts.map(({ account }) => NFT.fromAccountInfo(account)[0])
      );
  }

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

  public stakedNfts(walletAddress?: web3.PublicKey) {
    return fetchStakedNfts(this.nectarStaking.honeycomb(), {
      walletAddress:
        walletAddress || this.nectarStaking.honeycomb().identity().publicKey,
      programId: this.nectarStaking.programId,
    });
  }

  public availableNfts(walletAddress?: web3.PublicKey) {
    return fetchAvailableNfts(this.nectarStaking.honeycomb(), {
      walletAddress:
        walletAddress || this.nectarStaking.honeycomb().identity().publicKey,
      programId: this.nectarStaking.programId,
    });
  }

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

export const nectarStakingModule = (
  honeycomb: Honeycomb,
  args: web3.PublicKey | NewStakingPoolArgs
) =>
  args instanceof web3.PublicKey
    ? NectarStaking.fromAddress(honeycomb.connection, args)
    : NectarStaking.new(honeycomb, args);

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
