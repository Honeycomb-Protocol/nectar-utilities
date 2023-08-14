/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as web3 from '@solana/web3.js'
import * as beet from '@metaplex-foundation/beet'
import * as beetSolana from '@metaplex-foundation/beet-solana'
import { LockType, lockTypeBeet } from '../types/LockType'

/**
 * Arguments used to create {@link StakingPool}
 * @category Accounts
 * @category generated
 */
export type StakingPoolArgs = {
  bump: number
  tempPlaceHolder1: number
  project: web3.PublicKey
  key: web3.PublicKey
  currency: web3.PublicKey
  tempPlaceHolder2: web3.PublicKey
  lockType: LockType
  name: string
  rewardsPerDuration: beet.bignum
  rewardsDuration: beet.bignum
  maxRewardsDuration: beet.COption<beet.bignum>
  minStakeDuration: beet.COption<beet.bignum>
  cooldownDuration: beet.COption<beet.bignum>
  resetStakeDuration: boolean
  allowedMints: boolean
  totalStaked: beet.bignum
  startTime: beet.COption<beet.bignum>
  endTime: beet.COption<beet.bignum>
  collections: Uint8Array
  creators: Uint8Array
  merkleTrees: Uint8Array
}

export const stakingPoolDiscriminator = [203, 19, 214, 220, 220, 154, 24, 102]
/**
 * Holds the data for the {@link StakingPool} Account and provides de/serialization
 * functionality for that data
 *
 * @category Accounts
 * @category generated
 */
export class StakingPool implements StakingPoolArgs {
  private constructor(
    readonly bump: number,
    readonly tempPlaceHolder1: number,
    readonly project: web3.PublicKey,
    readonly key: web3.PublicKey,
    readonly currency: web3.PublicKey,
    readonly tempPlaceHolder2: web3.PublicKey,
    readonly lockType: LockType,
    readonly name: string,
    readonly rewardsPerDuration: beet.bignum,
    readonly rewardsDuration: beet.bignum,
    readonly maxRewardsDuration: beet.COption<beet.bignum>,
    readonly minStakeDuration: beet.COption<beet.bignum>,
    readonly cooldownDuration: beet.COption<beet.bignum>,
    readonly resetStakeDuration: boolean,
    readonly allowedMints: boolean,
    readonly totalStaked: beet.bignum,
    readonly startTime: beet.COption<beet.bignum>,
    readonly endTime: beet.COption<beet.bignum>,
    readonly collections: Uint8Array,
    readonly creators: Uint8Array,
    readonly merkleTrees: Uint8Array
  ) {}

  /**
   * Creates a {@link StakingPool} instance from the provided args.
   */
  static fromArgs(args: StakingPoolArgs) {
    return new StakingPool(
      args.bump,
      args.tempPlaceHolder1,
      args.project,
      args.key,
      args.currency,
      args.tempPlaceHolder2,
      args.lockType,
      args.name,
      args.rewardsPerDuration,
      args.rewardsDuration,
      args.maxRewardsDuration,
      args.minStakeDuration,
      args.cooldownDuration,
      args.resetStakeDuration,
      args.allowedMints,
      args.totalStaked,
      args.startTime,
      args.endTime,
      args.collections,
      args.creators,
      args.merkleTrees
    )
  }

  /**
   * Deserializes the {@link StakingPool} from the data of the provided {@link web3.AccountInfo}.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static fromAccountInfo(
    accountInfo: web3.AccountInfo<Buffer>,
    offset = 0
  ): [StakingPool, number] {
    return StakingPool.deserialize(accountInfo.data, offset)
  }

  /**
   * Retrieves the account info from the provided address and deserializes
   * the {@link StakingPool} from its data.
   *
   * @throws Error if no account info is found at the address or if deserialization fails
   */
  static async fromAccountAddress(
    connection: web3.Connection,
    address: web3.PublicKey,
    commitmentOrConfig?: web3.Commitment | web3.GetAccountInfoConfig
  ): Promise<StakingPool> {
    const accountInfo = await connection.getAccountInfo(
      address,
      commitmentOrConfig
    )
    if (accountInfo == null) {
      throw new Error(`Unable to find StakingPool account at ${address}`)
    }
    return StakingPool.fromAccountInfo(accountInfo, 0)[0]
  }

  /**
   * Provides a {@link web3.Connection.getProgramAccounts} config builder,
   * to fetch accounts matching filters that can be specified via that builder.
   *
   * @param programId - the program that owns the accounts we are filtering
   */
  static gpaBuilder(
    programId: web3.PublicKey = new web3.PublicKey(
      'STAkY8Zx3rfY2MUyTJkdLB5jaM47mnDpKUUWzkj5d3L'
    )
  ) {
    return beetSolana.GpaBuilder.fromStruct(programId, stakingPoolBeet)
  }

  /**
   * Deserializes the {@link StakingPool} from the provided data Buffer.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static deserialize(buf: Buffer, offset = 0): [StakingPool, number] {
    return stakingPoolBeet.deserialize(buf, offset)
  }

  /**
   * Serializes the {@link StakingPool} into a Buffer.
   * @returns a tuple of the created Buffer and the offset up to which the buffer was written to store it.
   */
  serialize(): [Buffer, number] {
    return stakingPoolBeet.serialize({
      accountDiscriminator: stakingPoolDiscriminator,
      ...this,
    })
  }

  /**
   * Returns the byteSize of a {@link Buffer} holding the serialized data of
   * {@link StakingPool} for the provided args.
   *
   * @param args need to be provided since the byte size for this account
   * depends on them
   */
  static byteSize(args: StakingPoolArgs) {
    const instance = StakingPool.fromArgs(args)
    return stakingPoolBeet.toFixedFromValue({
      accountDiscriminator: stakingPoolDiscriminator,
      ...instance,
    }).byteSize
  }

  /**
   * Fetches the minimum balance needed to exempt an account holding
   * {@link StakingPool} data from rent
   *
   * @param args need to be provided since the byte size for this account
   * depends on them
   * @param connection used to retrieve the rent exemption information
   */
  static async getMinimumBalanceForRentExemption(
    args: StakingPoolArgs,
    connection: web3.Connection,
    commitment?: web3.Commitment
  ): Promise<number> {
    return connection.getMinimumBalanceForRentExemption(
      StakingPool.byteSize(args),
      commitment
    )
  }

  /**
   * Returns a readable version of {@link StakingPool} properties
   * and can be used to convert to JSON and/or logging
   */
  pretty() {
    return {
      bump: this.bump,
      tempPlaceHolder1: this.tempPlaceHolder1,
      project: this.project.toBase58(),
      key: this.key.toBase58(),
      currency: this.currency.toBase58(),
      tempPlaceHolder2: this.tempPlaceHolder2.toBase58(),
      lockType: 'LockType.' + LockType[this.lockType],
      name: this.name,
      rewardsPerDuration: (() => {
        const x = <{ toNumber: () => number }>this.rewardsPerDuration
        if (typeof x.toNumber === 'function') {
          try {
            return x.toNumber()
          } catch (_) {
            return x
          }
        }
        return x
      })(),
      rewardsDuration: (() => {
        const x = <{ toNumber: () => number }>this.rewardsDuration
        if (typeof x.toNumber === 'function') {
          try {
            return x.toNumber()
          } catch (_) {
            return x
          }
        }
        return x
      })(),
      maxRewardsDuration: this.maxRewardsDuration,
      minStakeDuration: this.minStakeDuration,
      cooldownDuration: this.cooldownDuration,
      resetStakeDuration: this.resetStakeDuration,
      allowedMints: this.allowedMints,
      totalStaked: (() => {
        const x = <{ toNumber: () => number }>this.totalStaked
        if (typeof x.toNumber === 'function') {
          try {
            return x.toNumber()
          } catch (_) {
            return x
          }
        }
        return x
      })(),
      startTime: this.startTime,
      endTime: this.endTime,
      collections: this.collections,
      creators: this.creators,
      merkleTrees: this.merkleTrees,
    }
  }
}

/**
 * @category Accounts
 * @category generated
 */
export const stakingPoolBeet = new beet.FixableBeetStruct<
  StakingPool,
  StakingPoolArgs & {
    accountDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['accountDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['bump', beet.u8],
    ['tempPlaceHolder1', beet.u8],
    ['project', beetSolana.publicKey],
    ['key', beetSolana.publicKey],
    ['currency', beetSolana.publicKey],
    ['tempPlaceHolder2', beetSolana.publicKey],
    ['lockType', lockTypeBeet],
    ['name', beet.utf8String],
    ['rewardsPerDuration', beet.u64],
    ['rewardsDuration', beet.u64],
    ['maxRewardsDuration', beet.coption(beet.u64)],
    ['minStakeDuration', beet.coption(beet.u64)],
    ['cooldownDuration', beet.coption(beet.u64)],
    ['resetStakeDuration', beet.bool],
    ['allowedMints', beet.bool],
    ['totalStaked', beet.u64],
    ['startTime', beet.coption(beet.i64)],
    ['endTime', beet.coption(beet.i64)],
    ['collections', beet.bytes],
    ['creators', beet.bytes],
    ['merkleTrees', beet.bytes],
  ],
  StakingPool.fromArgs,
  'StakingPool'
)
