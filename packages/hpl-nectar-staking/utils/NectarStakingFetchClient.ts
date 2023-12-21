import {
  Commitment,
  GetMultipleAccountsConfig,
  PublicKey,
} from "@solana/web3.js";
import { AvailableNft, Metadata, StakedNft } from "../types";
import { Multipliers, NFTv1, Staker, StakingPool } from "../generated";
import {
  FetchModule,
  FetchClient,
  ForceScenario,
} from "@honeycomb-protocol/hive-control";
import { fetchHeliusAssets } from "./helius";
import { checkCriteria } from "./misc";

/**
 * Extends the Honeycomb interface with the `fetch` method to access the NectarStakingFetchClient.
 */
declare module "@honeycomb-protocol/hive-control" {
  interface FetchModule {
    staking(): NectarStakingFetchClient;
  }
}

/**
 * Represents the Fetch Module which contains boiler plates for fetching NectarStaking accounts.
 * @category Modules
 */
export class NectarStakingFetchClient extends FetchClient {
  /**
   * Creates a new instance of the NectarStakingFetchClient.
   */
  constructor() {
    super();
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
    commitment: Commitment = "processed",
    forceFetch?: ForceScenario
  ): Promise<StakingPool | null> {
    try {
      return StakingPool.fromAccountInfo(
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
  public async multipliers(
    address: PublicKey,
    commitment: Commitment = "processed",
    forceFetch?: ForceScenario
  ): Promise<Multipliers | null> {
    try {
      return Multipliers.fromAccountInfo(
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
  public async nft(
    address: PublicKey,
    commitment: Commitment = "processed",
    forceFetch?: ForceScenario
  ): Promise<NFTv1 | null> {
    try {
      return NFTv1.fromAccountInfo(
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
  public async nfts(
    pool: PublicKey,
    staker?: PublicKey
  ): Promise<NFTv1[] | null>;

  /**
   * Creates an instance of HoneycombProject using the provided connection and project address.
   * @param address - The public address of the Public Info account.
   * @param commitment The Solana block commitment.
   * @param forceFetch Wether to use cache data or forcefully refetch.
   * @returns An instance of HoneycombProject.
   */
  public async nfts(
    pool: PublicKey,
    mints: PublicKey[]
  ): Promise<NFTv1[] | null>;

  public async nfts(
    pool: PublicKey,
    stakerOrMints?: PublicKey | PublicKey[],
    commitment: Commitment = "processed"
  ): Promise<NFTv1[] | null> {
    if (Array.isArray(stakerOrMints)) {
      try {
        return this.honeycomb()
          .rpc()
          .getMultipleAccounts(
            stakerOrMints.map(
              (m) => this.honeycomb().pda().staking().nft(pool, m)[0]
            ),
            commitment
          )
          .then((nfts) =>
            nfts.map((account) => NFTv1.fromAccountInfo(account)[0])
          );
      } catch {
        return null;
      }
    } else {
      const gpa = NFTv1.gpaBuilder();
      gpa.addFilter("stakingPool", pool);

      if (stakerOrMints) {
        if (PublicKey.isOnCurve(stakerOrMints))
          stakerOrMints = this.honeycomb()
            .pda()
            .staking()
            .staker(pool, stakerOrMints)[0];
        gpa.addFilter("staker", stakerOrMints);
      }

      try {
        return gpa
          .run(this.honeycomb().processedConnection)
          .then((nfts) =>
            nfts.map(({ account }) => NFTv1.fromAccountInfo(account)[0])
          );
      } catch {
        return null;
      }
    }
  }

  /**
   * Creates an instance of HoneycombProject using the provided connection and project address.
   * @param address - The public address of the Public Info account.
   * @param commitment The Solana block commitment.
   * @param forceFetch Wether to use cache data or forcefully refetch.
   * @returns An instance of HoneycombProject.
   */
  public async staker(
    address: PublicKey,
    commitment: Commitment = "processed",
    forceFetch?: ForceScenario
  ): Promise<Staker | null> {
    try {
      return Staker.fromAccountInfo(
        await this.getAccount(address, { forceFetch, commitment })
      )[0];
    } catch {
      return null;
    }
  }

  public async stakedNfts(args: {
    pool: PublicKey;
    wallet: PublicKey;
    heliusRpc: string;
  }): Promise<StakedNft[] | null> {
    const pdaAccounts = await this.nfts(args.pool, args.wallet);
    if (pdaAccounts == null) return null;
    if (!pdaAccounts.length) return [];

    try {
      const metadatas = await fetchHeliusAssets(args.heliusRpc, {
        mintList: pdaAccounts.map((nft) => nft.mint),
      });

      return metadatas.map((nft) => ({
        ...nft,
        ...pdaAccounts.find((x) => x.mint.equals(nft.mint)),
      }));
    } catch {
      return null;
    }
  }

  public async availableNfts(args: {
    pool: PublicKey;
    wallet: PublicKey;
    heliusRpc: string;
    allowedMints?: PublicKey[];
  }): Promise<AvailableNft[] | null> {
    const staking = this.honeycomb().staking(args.pool);

    const ownedNfts = await Promise.all(
      staking.collections.map((collection) =>
        fetchHeliusAssets(args.heliusRpc, {
          walletAddress: args.wallet,
          collectionAddress: collection,
        })
      )
    ).then((x) => x.flat().filter((x) => !!x && !x.frozen));

    let filteredNfts: AvailableNft[] = [];

    if (staking.allowedMints) {
      const allowedMints: PublicKey[] =
        args?.allowedMints ||
        (await this.nfts(args.pool).then((nfts) => nfts.map((n) => n.mint)));

      filteredNfts = ownedNfts.filter(
        (nft) => nft.mint && allowedMints.includes(nft.mint)
      );
    }

    filteredNfts = [
      ...filteredNfts,
      ...ownedNfts.filter((nft) => checkCriteria(nft, staking)),
    ];

    let tempFilterSet = new Set();
    filteredNfts = filteredNfts.filter((nft, index, self) => {
      if (tempFilterSet.has(nft.mint)) return false;
      tempFilterSet.add(nft.mint);
      return true;
    });

    return filteredNfts;
  }

  public async rewards(nft: StakedNft, till = new Date()) {
    const staking = this.honeycomb().staking(nft.stakingPool);
    const staker = await this.staker(nft.staker);
    let secondsElapsed = till.getTime() / 1000 - Number(nft.lastClaim);

    const maxRewardsDuration =
      staking.maxRewardsDuration && Number(staking.maxRewardsDuration);
    if (maxRewardsDuration && maxRewardsDuration < secondsElapsed) {
      secondsElapsed = maxRewardsDuration;
    }

    const rewardsPerSecond =
      Number(staking.rewardsPerDuration) / Number(staking.rewardsDuration);
    let rewardsAmount = rewardsPerSecond * secondsElapsed;

    let multipliersDecimals = 1;
    let totalMultipliers = multipliersDecimals;

    const multipliers = await staking.multipliers(
      undefined,
      ForceScenario.ConsiderNull
    );
    if (multipliers) {
      multipliersDecimals = 10 ** multipliers.decimals;
      totalMultipliers = multipliersDecimals;

      let durationMultiplier = multipliersDecimals;
      for (const multiplier of multipliers.durationMultipliers) {
        if (
          multiplier.multiplierType.__kind === "StakeDuration" &&
          secondsElapsed < Number(multiplier.multiplierType.minDuration)
        ) {
          durationMultiplier = Number(multiplier.value);
        } else {
          break;
        }
      }
      durationMultiplier -= multipliersDecimals;
      totalMultipliers += durationMultiplier;

      let countMultiplier = multipliersDecimals;
      for (const multiplier of multipliers.countMultipliers) {
        if (
          multiplier.multiplierType.__kind === "NFTCount" &&
          Number(multiplier.multiplierType.minCount) <=
            Number(staker.totalStaked)
        ) {
          countMultiplier = Number(multiplier.value);
        } else {
          break;
        }
      }
      countMultiplier -= multipliersDecimals;
      totalMultipliers += countMultiplier;

      let creatorMultiplier = multipliersDecimals;
      for (const multiplier of multipliers.creatorMultipliers) {
        if (
          multiplier.multiplierType.__kind === "Creator" &&
          nft.criteria.__kind === "Creator" &&
          nft.criteria.address.equals(multiplier.multiplierType.creator)
        ) {
          creatorMultiplier = Number(multiplier.value);
          break;
        }
      }
      creatorMultiplier -= multipliersDecimals;
      totalMultipliers += creatorMultiplier;

      let collectionMultiplier = multipliersDecimals;
      for (const multiplier of multipliers.collectionMultipliers) {
        if (
          multiplier.multiplierType.__kind === "Collection" &&
          nft.criteria.__kind === "Collection" &&
          nft.criteria.address.equals(multiplier.multiplierType.collection)
        ) {
          collectionMultiplier = Number(multiplier.value);
          break;
        }
      }
      collectionMultiplier -= multipliersDecimals;
      totalMultipliers += collectionMultiplier;
    }
    rewardsAmount = (rewardsAmount * totalMultipliers) / multipliersDecimals;

    return {
      rewards: rewardsAmount,
      multipliers: totalMultipliers / multipliersDecimals,
    };
  }

  /**
   * Installs the NectarStakingFetchClient into the FetchModule instance.
   *
   * @param fetchModule - The FetchModule instance to install the module into.
   * @returns The modified FetchModule instance with the NectarStakingFetchClient installed.
   */
  public install(fetchModule: FetchModule): FetchModule {
    this._fetchModule = fetchModule;
    fetchModule.staking = () => this;
    return fetchModule;
  }
}

/**
 * Factory function to create a new instance of the NectarStakingFetchClient.
 * @category Factory
 * @returns A new instance of the NectarStakingFetchClient.
 */
export const nectarStakingFetch = () => new NectarStakingFetchClient();
