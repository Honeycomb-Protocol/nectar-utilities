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
 * Arguments used to create {@link NFT}
 * @category Accounts
 * @category generated
 */
export type NFTArgs = {
  bump: number
  stakingProject: web3.PublicKey
  staker: web3.PublicKey
  mint: web3.PublicKey
  creator: web3.PublicKey
  collection: web3.PublicKey
  lastClaim: beet.bignum
  stakedAt: beet.bignum
  lastStakedAt: beet.bignum
  lastUnstakedAt: beet.bignum
}

export const nFTDiscriminator = [88, 10, 146, 176, 101, 11, 40, 217]
/**
 * Holds the data for the {@link NFT} Account and provides de/serialization
 * functionality for that data
 *
 * @category Accounts
 * @category generated
 */
export class NFT implements NFTArgs {
  private constructor(
    readonly bump: number,
    readonly stakingProject: web3.PublicKey,
    readonly staker: web3.PublicKey,
    readonly mint: web3.PublicKey,
    readonly creator: web3.PublicKey,
    readonly collection: web3.PublicKey,
    readonly lastClaim: beet.bignum,
    readonly stakedAt: beet.bignum,
    readonly lastStakedAt: beet.bignum,
    readonly lastUnstakedAt: beet.bignum
  ) {}

  /**
   * Creates a {@link NFT} instance from the provided args.
   */
  static fromArgs(args: NFTArgs) {
    return new NFT(
      args.bump,
      args.stakingProject,
      args.staker,
      args.mint,
      args.creator,
      args.collection,
      args.lastClaim,
      args.stakedAt,
      args.lastStakedAt,
      args.lastUnstakedAt
    )
  }

  /**
   * Deserializes the {@link NFT} from the data of the provided {@link web3.AccountInfo}.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static fromAccountInfo(
    accountInfo: web3.AccountInfo<Buffer>,
    offset = 0
  ): [NFT, number] {
    return NFT.deserialize(accountInfo.data, offset)
  }

  /**
   * Retrieves the account info from the provided address and deserializes
   * the {@link NFT} from its data.
   *
   * @throws Error if no account info is found at the address or if deserialization fails
   */
  static async fromAccountAddress(
    connection: web3.Connection,
    address: web3.PublicKey,
    commitmentOrConfig?: web3.Commitment | web3.GetAccountInfoConfig
  ): Promise<NFT> {
    const accountInfo = await connection.getAccountInfo(
      address,
      commitmentOrConfig
    )
    if (accountInfo == null) {
      throw new Error(`Unable to find NFT account at ${address}`)
    }
    return NFT.fromAccountInfo(accountInfo, 0)[0]
  }

  /**
   * Provides a {@link web3.Connection.getProgramAccounts} config builder,
   * to fetch accounts matching filters that can be specified via that builder.
   *
   * @param programId - the program that owns the accounts we are filtering
   */
  static gpaBuilder(
    programId: web3.PublicKey = new web3.PublicKey(
      '5CLnmLaVPfKKZUFZyLoXaVgwCDNZ43bt3ssNRiLxUnPG'
    )
  ) {
    return beetSolana.GpaBuilder.fromStruct(programId, nFTBeet)
  }

  /**
   * Deserializes the {@link NFT} from the provided data Buffer.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static deserialize(buf: Buffer, offset = 0): [NFT, number] {
    return nFTBeet.deserialize(buf, offset)
  }

  /**
   * Serializes the {@link NFT} into a Buffer.
   * @returns a tuple of the created Buffer and the offset up to which the buffer was written to store it.
   */
  serialize(): [Buffer, number] {
    return nFTBeet.serialize({
      accountDiscriminator: nFTDiscriminator,
      ...this,
    })
  }

  /**
   * Returns the byteSize of a {@link Buffer} holding the serialized data of
   * {@link NFT}
   */
  static get byteSize() {
    return nFTBeet.byteSize
  }

  /**
   * Fetches the minimum balance needed to exempt an account holding
   * {@link NFT} data from rent
   *
   * @param connection used to retrieve the rent exemption information
   */
  static async getMinimumBalanceForRentExemption(
    connection: web3.Connection,
    commitment?: web3.Commitment
  ): Promise<number> {
    return connection.getMinimumBalanceForRentExemption(
      NFT.byteSize,
      commitment
    )
  }

  /**
   * Determines if the provided {@link Buffer} has the correct byte size to
   * hold {@link NFT} data.
   */
  static hasCorrectByteSize(buf: Buffer, offset = 0) {
    return buf.byteLength - offset === NFT.byteSize
  }

  /**
   * Returns a readable version of {@link NFT} properties
   * and can be used to convert to JSON and/or logging
   */
  pretty() {
    return {
      bump: this.bump,
      stakingProject: this.stakingProject.toBase58(),
      staker: this.staker.toBase58(),
      mint: this.mint.toBase58(),
      creator: this.creator.toBase58(),
      collection: this.collection.toBase58(),
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
    }
  }
}

/**
 * @category Accounts
 * @category generated
 */
export const nFTBeet = new beet.BeetStruct<
  NFT,
  NFTArgs & {
    accountDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['accountDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['bump', beet.u8],
    ['stakingProject', beetSolana.publicKey],
    ['staker', beetSolana.publicKey],
    ['mint', beetSolana.publicKey],
    ['creator', beetSolana.publicKey],
    ['collection', beetSolana.publicKey],
    ['lastClaim', beet.i64],
    ['stakedAt', beet.i64],
    ['lastStakedAt', beet.i64],
    ['lastUnstakedAt', beet.i64],
  ],
  NFT.fromArgs,
  'NFT'
)
