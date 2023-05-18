/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as web3 from '@solana/web3.js'
import * as beet from '@metaplex-foundation/beet'
import * as beetSolana from '@metaplex-foundation/beet-solana'
import { EarnedReward, earnedRewardBeet } from '../types/EarnedReward'

/**
 * Arguments used to create {@link Participation}
 * @category Accounts
 * @category generated
 */
export type ParticipationArgs = {
  bump: number
  wallet: web3.PublicKey
  mission: web3.PublicKey
  nft: web3.PublicKey
  endTime: beet.bignum
  isRecalled: boolean
  rewards: EarnedReward[]
}

export const participationDiscriminator = [237, 154, 142, 46, 143, 63, 189, 18]
/**
 * Holds the data for the {@link Participation} Account and provides de/serialization
 * functionality for that data
 *
 * @category Accounts
 * @category generated
 */
export class Participation implements ParticipationArgs {
  private constructor(
    readonly bump: number,
    readonly wallet: web3.PublicKey,
    readonly mission: web3.PublicKey,
    readonly nft: web3.PublicKey,
    readonly endTime: beet.bignum,
    readonly isRecalled: boolean,
    readonly rewards: EarnedReward[]
  ) {}

  /**
   * Creates a {@link Participation} instance from the provided args.
   */
  static fromArgs(args: ParticipationArgs) {
    return new Participation(
      args.bump,
      args.wallet,
      args.mission,
      args.nft,
      args.endTime,
      args.isRecalled,
      args.rewards
    )
  }

  /**
   * Deserializes the {@link Participation} from the data of the provided {@link web3.AccountInfo}.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static fromAccountInfo(
    accountInfo: web3.AccountInfo<Buffer>,
    offset = 0
  ): [Participation, number] {
    return Participation.deserialize(accountInfo.data, offset)
  }

  /**
   * Retrieves the account info from the provided address and deserializes
   * the {@link Participation} from its data.
   *
   * @throws Error if no account info is found at the address or if deserialization fails
   */
  static async fromAccountAddress(
    connection: web3.Connection,
    address: web3.PublicKey,
    commitmentOrConfig?: web3.Commitment | web3.GetAccountInfoConfig
  ): Promise<Participation> {
    const accountInfo = await connection.getAccountInfo(
      address,
      commitmentOrConfig
    )
    if (accountInfo == null) {
      throw new Error(`Unable to find Participation account at ${address}`)
    }
    return Participation.fromAccountInfo(accountInfo, 0)[0]
  }

  /**
   * Provides a {@link web3.Connection.getProgramAccounts} config builder,
   * to fetch accounts matching filters that can be specified via that builder.
   *
   * @param programId - the program that owns the accounts we are filtering
   */
  static gpaBuilder(
    programId: web3.PublicKey = new web3.PublicKey(
      'CW2fmed6FRSwoQMBcUDkvbUUHNQXMDgW4zk9Kwn56RRr'
    )
  ) {
    return beetSolana.GpaBuilder.fromStruct(programId, participationBeet)
  }

  /**
   * Deserializes the {@link Participation} from the provided data Buffer.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static deserialize(buf: Buffer, offset = 0): [Participation, number] {
    return participationBeet.deserialize(buf, offset)
  }

  /**
   * Serializes the {@link Participation} into a Buffer.
   * @returns a tuple of the created Buffer and the offset up to which the buffer was written to store it.
   */
  serialize(): [Buffer, number] {
    return participationBeet.serialize({
      accountDiscriminator: participationDiscriminator,
      ...this,
    })
  }

  /**
   * Returns the byteSize of a {@link Buffer} holding the serialized data of
   * {@link Participation} for the provided args.
   *
   * @param args need to be provided since the byte size for this account
   * depends on them
   */
  static byteSize(args: ParticipationArgs) {
    const instance = Participation.fromArgs(args)
    return participationBeet.toFixedFromValue({
      accountDiscriminator: participationDiscriminator,
      ...instance,
    }).byteSize
  }

  /**
   * Fetches the minimum balance needed to exempt an account holding
   * {@link Participation} data from rent
   *
   * @param args need to be provided since the byte size for this account
   * depends on them
   * @param connection used to retrieve the rent exemption information
   */
  static async getMinimumBalanceForRentExemption(
    args: ParticipationArgs,
    connection: web3.Connection,
    commitment?: web3.Commitment
  ): Promise<number> {
    return connection.getMinimumBalanceForRentExemption(
      Participation.byteSize(args),
      commitment
    )
  }

  /**
   * Returns a readable version of {@link Participation} properties
   * and can be used to convert to JSON and/or logging
   */
  pretty() {
    return {
      bump: this.bump,
      wallet: this.wallet.toBase58(),
      mission: this.mission.toBase58(),
      nft: this.nft.toBase58(),
      endTime: (() => {
        const x = <{ toNumber: () => number }>this.endTime
        if (typeof x.toNumber === 'function') {
          try {
            return x.toNumber()
          } catch (_) {
            return x
          }
        }
        return x
      })(),
      isRecalled: this.isRecalled,
      rewards: this.rewards,
    }
  }
}

/**
 * @category Accounts
 * @category generated
 */
export const participationBeet = new beet.FixableBeetStruct<
  Participation,
  ParticipationArgs & {
    accountDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['accountDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['bump', beet.u8],
    ['wallet', beetSolana.publicKey],
    ['mission', beetSolana.publicKey],
    ['nft', beetSolana.publicKey],
    ['endTime', beet.i64],
    ['isRecalled', beet.bool],
    ['rewards', beet.array(earnedRewardBeet)],
  ],
  Participation.fromArgs,
  'Participation'
)
