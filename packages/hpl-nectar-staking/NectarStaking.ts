import * as web3 from "@solana/web3.js";
import * as beet from "@metaplex-foundation/beet";
import { Honeycomb, Module } from "@honeycomb-protocol/hive-control";
import {
  AddMultiplierArgs,
  CreateStakingPoolArgs,
  LockType,
  Multipliers,
  NFT,
  PROGRAM_ID,
  StakingPool,
  UpdateStakingPoolArgs,
} from "./generated";
import {
  addMultiplier,
  claimRewards,
  createStakingPool,
  fetchAvailableNfts,
  fetchStakedNfts,
  fetchStaker,
  fundRewards,
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
    staking(): NectarStaking;
  }
}

type NewStakingPoolArgs = {
  args: CreateStakingPoolArgs;
  rewardMint: web3.PublicKey;
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

export class NectarStaking implements Module {
  readonly programId: web3.PublicKey = PROGRAM_ID;
  private _honeycomb: Honeycomb;
  private _fetch: NectarStakingFetch;

  readonly rewardMint: web3.PublicKey;
  readonly vault: web3.PublicKey;
  readonly lockType: LockType;
  readonly name: string;
  readonly rewardsPerDuration: beet.bignum;
  readonly rewardsDuration: beet.bignum;
  readonly maxRewardsDuration: beet.COption<beet.bignum>;
  readonly minStakeDuration: beet.COption<beet.bignum>;
  readonly cooldownDuration: beet.COption<beet.bignum>;
  readonly resetStakeDuration: boolean;
  readonly allowedMints: boolean;
  readonly totalStaked: beet.bignum;
  readonly startTime: beet.COption<beet.bignum>;
  readonly endTime: beet.COption<beet.bignum>;
  readonly collections: Uint8Array;
  readonly creators: Uint8Array;

  constructor(
    readonly poolAddress: web3.PublicKey,
    private _pool: StakingPool
  ) {
    this.rewardMint = _pool.rewardMint;
    this.vault = _pool.vault;
    this.lockType = _pool.lockType;
    this.name = _pool.name;
    this.rewardsPerDuration = _pool.rewardsPerDuration;
    this.rewardsDuration = _pool.rewardsDuration;
    this.maxRewardsDuration = _pool.maxRewardsDuration;
    this.minStakeDuration = _pool.minStakeDuration;
    this.cooldownDuration = _pool.cooldownDuration;
    this.resetStakeDuration = _pool.resetStakeDuration;
    this.allowedMints = _pool.allowedMints;
    this.totalStaked = _pool.totalStaked;
    this.startTime = _pool.startTime;
    this.endTime = _pool.endTime;
    this.collections = _pool.collections;
    this.creators = _pool.creators;

    this._fetch = new NectarStakingFetch(this);
  }

  static async fromAddress(
    connection: web3.Connection,
    poolAddress: web3.PublicKey
  ) {
    const pool = await StakingPool.fromAccountAddress(connection, poolAddress);
    return new NectarStaking(poolAddress, pool);
  }

  static async new(honeycomb: Honeycomb, args: NewStakingPoolArgs) {
    const { poolAddress } = await createStakingPool(honeycomb, {
      programId: PROGRAM_ID,
      ...args,
    });
    return await NectarStaking.fromAddress(
      new web3.Connection(honeycomb.connection.rpcEndpoint, "processed"),
      poolAddress
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

  public updatePool(args: UpdatePoolArgs) {
    return updateStakingPool(this._honeycomb, {
      programId: this.programId,
      ...args,
    });
  }

  public addMultiplier(args: AddMultiplierArgs) {
    return addMultiplier(this._honeycomb, {
      args,
      programId: this.programId,
    });
  }

  public fundRewards(amount: number) {
    return fundRewards(this._honeycomb, {
      amount,
      programId: this.programId,
    });
  }

  public withdrawRewards(amount: number) {
    return withdrawRewards(this._honeycomb, {
      amount,
      programId: this.programId,
    });
  }

  public initStaker() {
    return initStaker(this._honeycomb, {
      programId: this.programId,
    });
  }

  public initNft(mint: web3.PublicKey) {
    return initNft(this._honeycomb, {
      nftMint: mint,
      programId: this.programId,
    });
  }

  public stake(...nfts: AvailableNft[]) {
    return stake(this._honeycomb, {
      nfts,
      programId: this.programId,
    });
  }

  public claim(...nfts: StakedNft[]) {
    return claimRewards(this._honeycomb, {
      nfts,
      programId: this.programId,
    });
  }

  public unstake(...nfts: StakedNft[]) {
    return unstake(this._honeycomb, {
      nfts,
      programId: this.programId,
    });
  }

  public install(honeycomb: Honeycomb): Honeycomb {
    honeycomb.staking = () => this;
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
    ).then((multipliers) => ({
      ...multipliers,
      address: multipliersAddress,
    }));
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

  public staker(walletAddress?: web3.PublicKey) {
    return fetchStaker(this.nectarStaking.honeycomb(), {
      walletAddress:
        walletAddress || this.nectarStaking.honeycomb().identity().publicKey,
      programId: this.nectarStaking.programId,
    });
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
}

export const nectarStakingModule = (
  honeycomb: Honeycomb,
  args: web3.PublicKey | NewStakingPoolArgs
) =>
  args instanceof web3.PublicKey
    ? NectarStaking.fromAddress(honeycomb.connection, args)
    : NectarStaking.new(honeycomb, args);

// const project = new Honeycomb();
// project.use(await nectarStakingModule(project.metaplex, web3.PublicKey.default))
