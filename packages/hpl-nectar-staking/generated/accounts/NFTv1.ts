/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as web3 from '@solana/web3.js'
import * as beet from '@metaplex-foundation/beet'
import * as beetSolana from '@metaplex-foundation/beet-solana'
import { NFTCriteria, nFTCriteriaBeet } from '../types/NFTCriteria'
import { NFTUsedBy, nFTUsedByBeet } from '../types/NFTUsedBy'

/**
 * Arguments used to create {@link NFTv1}
 * @category Accounts
 * @category generated
 */
export type NFTv1Args = {
  bump: number
  stakingPool: web3.PublicKey
  staker: web3.PublicKey
  mint: web3.PublicKey
  lastClaim: beet.bignum
  stakedAt: beet.bignum
  lastStakedAt: beet.bignum
  lastUnstakedAt: beet.bignum
  isCompressed: boolean
  criteria: NFTCriteria
  usedBy: NFTUsedBy
}

export const nFTv1Discriminator = [14, 107, 251, 202, 115, 175, 205, 221]
/**
 * Holds the data for the {@link NFTv1} Account and provides de/serialization
 * functionality for that data
 *
 * @category Accounts
 * @category generated
 */
export class NFTv1 implements NFTv1Args {
  private constructor(
    readonly bump: number,
    readonly stakingPool: web3.PublicKey,
    readonly staker: web3.PublicKey,
    readonly mint: web3.PublicKey,
    readonly lastClaim: beet.bignum,
    readonly stakedAt: beet.bignum,
    readonly lastStakedAt: beet.bignum,
    readonly lastUnstakedAt: beet.bignum,
    readonly isCompressed: boolean,
    readonly criteria: NFTCriteria,
    readonly usedBy: NFTUsedBy
  ) {}

  /**
   * Creates a {@link NFTv1} instance from the provided args.
   */
  static fromArgs(args: NFTv1Args) {
    return new NFTv1(
      args.bump,
      args.stakingPool,
      args.staker,
      args.mint,
      args.lastClaim,
      args.stakedAt,
      args.lastStakedAt,
      args.lastUnstakedAt,
      args.isCompressed,
      args.criteria,
      args.usedBy
    )
  }

  /**
   * Deserializes the {@link NFTv1} from the data of the provided {@link web3.AccountInfo}.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static fromAccountInfo(
    accountInfo: web3.AccountInfo<Buffer>,
    offset = 0
  ): [NFTv1, number] {
    return NFTv1.deserialize(accountInfo.data, offset)
  }

  /**
   * Retrieves the account info from the provided address and deserializes
   * the {@link NFTv1} from its data.
   *
   * @throws Error if no account info is found at the address or if deserialization fails
   */
  static async fromAccountAddress(
    connection: web3.Connection,
    address: web3.PublicKey,
    commitmentOrConfig?: web3.Commitment | web3.GetAccountInfoConfig
  ): Promise<NFTv1> {
    const accountInfo = await connection.getAccountInfo(
      address,
      commitmentOrConfig
    )
    if (accountInfo == null) {
      throw new Error(`Unable to find NFTv1 account at ${address}`)
    }
    return NFTv1.fromAccountInfo(accountInfo, 0)[0]
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
    return beetSolana.GpaBuilder.fromStruct(programId, nFTv1Beet)
  }

  /**
   * Deserializes the {@link NFTv1} from the provided data Buffer.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static deserialize(buf: Buffer, offset = 0): [NFTv1, number] {
    return nFTv1Beet.deserialize(buf, offset)
  }

  /**
   * Serializes the {@link NFTv1} into a Buffer.
   * @returns a tuple of the created Buffer and the offset up to which the buffer was written to store it.
   */
  serialize(): [Buffer, number] {
    return nFTv1Beet.serialize({
      accountDiscriminator: nFTv1Discriminator,
      ...this,
    })
  }

  /**
   * Returns the byteSize of a {@link Buffer} holding the serialized data of
   * {@link NFTv1} for the provided args.
   *
   * @param args need to be provided since the byte size for this account
   * depends on them
   */
  static byteSize(args: NFTv1Args) {
    const instance = NFTv1.fromArgs(args)
    return nFTv1Beet.toFixedFromValue({
      accountDiscriminator: nFTv1Discriminator,
      ...instance,
    }).byteSize
  }

  /**
   * Fetches the minimum balance needed to exempt an account holding
   * {@link NFTv1} data from rent
   *
   * @param args need to be provided since the byte size for this account
   * depends on them
   * @param connection used to retrieve the rent exemption information
   */
  static async getMinimumBalanceForRentExemption(
    args: NFTv1Args,
    connection: web3.Connection,
    commitment?: web3.Commitment
  ): Promise<number> {
    return connection.getMinimumBalanceForRentExemption(
      NFTv1.byteSize(args),
      commitment
    )
  }

  /**
   * Returns a readable version of {@link NFTv1} properties
   * and can be used to convert to JSON and/or logging
   */
  pretty() {
    return {
      bump: this.bump,
      stakingPool: this.stakingPool.toBase58(),
      staker: this.staker.toBase58(),
      mint: this.mint.toBase58(),
      lastClaim: (() => {
        const x = <{ toNumber: () => number }>this.lastClaim
        if (typeof x.toNumber === 'function') {
          try {
            return x.toNumber()
          } catch (_) {
            return x
          }
        }
        return x
      })(),
      stakedAt: (() => {
        const x = <{ toNumber: () => number }>this.stakedAt
        if (typeof x.toNumber === 'function') {
          try {
            return x.toNumber()
          } catch (_) {
            return x
          }
        }
        return x
      })(),
      lastStakedAt: (() => {
        const x = <{ toNumber: () => number }>this.lastStakedAt
        if (typeof x.toNumber === 'function') {
          try {
            return x.toNumber()
          } catch (_) {
            return x
          }
        }
        return x
      })(),
      lastUnstakedAt: (() => {
        const x = <{ toNumber: () => number }>this.lastUnstakedAt
        if (typeof x.toNumber === 'function') {
          try {
            return x.toNumber()
          } catch (_) {
            return x
          }
        }
        return x
      })(),
      isCompressed: this.isCompressed,
      criteria: this.criteria.__kind,
      usedBy: 'NFTUsedBy.' + NFTUsedBy[this.usedBy],
    }
  }
}

/**
 * @category Accounts
 * @category generated
 */
export const nFTv1Beet = new beet.FixableBeetStruct<
  NFTv1,
  NFTv1Args & {
    accountDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['accountDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['bump', beet.u8],
    ['stakingPool', beetSolana.publicKey],
    ['staker', beetSolana.publicKey],
    ['mint', beetSolana.publicKey],
    ['lastClaim', beet.i64],
    ['stakedAt', beet.i64],
    ['lastStakedAt', beet.i64],
    ['lastUnstakedAt', beet.i64],
    ['isCompressed', beet.bool],
    ['criteria', nFTCriteriaBeet],
    ['usedBy', nFTUsedByBeet],
  ],
  NFTv1.fromArgs,
  'NFTv1'
)
