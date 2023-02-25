/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as web3 from '@solana/web3.js'
import * as beet from '@metaplex-foundation/beet'
import * as beetSolana from '@metaplex-foundation/beet-solana'

/**
 * Arguments used to create {@link Staker}
 * @category Accounts
 * @category generated
 */
export type StakerArgs = {
  bump: number
  stakingPool: web3.PublicKey
  wallet: web3.PublicKey
  totalStaked: beet.bignum
}

export const stakerDiscriminator = [171, 229, 193, 85, 67, 177, 151, 4]
/**
 * Holds the data for the {@link Staker} Account and provides de/serialization
 * functionality for that data
 *
 * @category Accounts
 * @category generated
 */
export class Staker implements StakerArgs {
  private constructor(
    readonly bump: number,
    readonly stakingPool: web3.PublicKey,
    readonly wallet: web3.PublicKey,
    readonly totalStaked: beet.bignum
  ) {}

  /**
   * Creates a {@link Staker} instance from the provided args.
   */
  static fromArgs(args: StakerArgs) {
    return new Staker(
      args.bump,
      args.stakingPool,
      args.wallet,
      args.totalStaked
    )
  }

  /**
   * Deserializes the {@link Staker} from the data of the provided {@link web3.AccountInfo}.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static fromAccountInfo(
    accountInfo: web3.AccountInfo<Buffer>,
    offset = 0
  ): [Staker, number] {
    return Staker.deserialize(accountInfo.data, offset)
  }

  /**
   * Retrieves the account info from the provided address and deserializes
   * the {@link Staker} from its data.
   *
   * @throws Error if no account info is found at the address or if deserialization fails
   */
  static async fromAccountAddress(
    connection: web3.Connection,
    address: web3.PublicKey,
    commitmentOrConfig?: web3.Commitment | web3.GetAccountInfoConfig
  ): Promise<Staker> {
    const accountInfo = await connection.getAccountInfo(
      address,
      commitmentOrConfig
    )
    if (accountInfo == null) {
      throw new Error(`Unable to find Staker account at ${address}`)
    }
    return Staker.fromAccountInfo(accountInfo, 0)[0]
  }

  /**
   * Provides a {@link web3.Connection.getProgramAccounts} config builder,
   * to fetch accounts matching filters that can be specified via that builder.
   *
   * @param programId - the program that owns the accounts we are filtering
   */
  static gpaBuilder(
    programId: web3.PublicKey = new web3.PublicKey(
      '9nVqFEhHT5UG1Nf3sLWhrHjBwJtwNL9FCvEwquZtQjxa'
    )
  ) {
    return beetSolana.GpaBuilder.fromStruct(programId, stakerBeet)
  }

  /**
   * Deserializes the {@link Staker} from the provided data Buffer.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static deserialize(buf: Buffer, offset = 0): [Staker, number] {
    return stakerBeet.deserialize(buf, offset)
  }

  /**
   * Serializes the {@link Staker} into a Buffer.
   * @returns a tuple of the created Buffer and the offset up to which the buffer was written to store it.
   */
  serialize(): [Buffer, number] {
    return stakerBeet.serialize({
      accountDiscriminator: stakerDiscriminator,
      ...this,
    })
  }

  /**
   * Returns the byteSize of a {@link Buffer} holding the serialized data of
   * {@link Staker}
   */
  static get byteSize() {
    return stakerBeet.byteSize
  }

  /**
   * Fetches the minimum balance needed to exempt an account holding
   * {@link Staker} data from rent
   *
   * @param connection used to retrieve the rent exemption information
   */
  static async getMinimumBalanceForRentExemption(
    connection: web3.Connection,
    commitment?: web3.Commitment
  ): Promise<number> {
    return connection.getMinimumBalanceForRentExemption(
      Staker.byteSize,
      commitment
    )
  }

  /**
   * Determines if the provided {@link Buffer} has the correct byte size to
   * hold {@link Staker} data.
   */
  static hasCorrectByteSize(buf: Buffer, offset = 0) {
    return buf.byteLength - offset === Staker.byteSize
  }

  /**
   * Returns a readable version of {@link Staker} properties
   * and can be used to convert to JSON and/or logging
   */
  pretty() {
    return {
      bump: this.bump,
      stakingPool: this.stakingPool.toBase58(),
      wallet: this.wallet.toBase58(),
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
    }
  }
}

/**
 * @category Accounts
 * @category generated
 */
export const stakerBeet = new beet.BeetStruct<
  Staker,
  StakerArgs & {
    accountDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['accountDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['bump', beet.u8],
    ['stakingPool', beetSolana.publicKey],
    ['wallet', beetSolana.publicKey],
    ['totalStaked', beet.u64],
  ],
  Staker.fromArgs,
  'Staker'
)
