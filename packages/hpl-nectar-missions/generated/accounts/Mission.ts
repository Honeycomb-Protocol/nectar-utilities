/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as web3 from '@solana/web3.js'
import * as beet from '@metaplex-foundation/beet'
import * as beetSolana from '@metaplex-foundation/beet-solana'
import { Currency, currencyBeet } from '../types/Currency'
import { Reward, rewardBeet } from '../types/Reward'

/**
 * Arguments used to create {@link Mission}
 * @category Accounts
 * @category generated
 */
export type MissionArgs = {
  bump: number
  missionPool: web3.PublicKey
  name: string
  minXp: beet.bignum
  cost: Currency
  duration: beet.bignum
  rewards: Reward[]
}

export const missionDiscriminator = [170, 56, 116, 75, 24, 11, 109, 12]
/**
 * Holds the data for the {@link Mission} Account and provides de/serialization
 * functionality for that data
 *
 * @category Accounts
 * @category generated
 */
export class Mission implements MissionArgs {
  private constructor(
    readonly bump: number,
    readonly missionPool: web3.PublicKey,
    readonly name: string,
    readonly minXp: beet.bignum,
    readonly cost: Currency,
    readonly duration: beet.bignum,
    readonly rewards: Reward[]
  ) {}

  /**
   * Creates a {@link Mission} instance from the provided args.
   */
  static fromArgs(args: MissionArgs) {
    return new Mission(
      args.bump,
      args.missionPool,
      args.name,
      args.minXp,
      args.cost,
      args.duration,
      args.rewards
    )
  }

  /**
   * Deserializes the {@link Mission} from the data of the provided {@link web3.AccountInfo}.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static fromAccountInfo(
    accountInfo: web3.AccountInfo<Buffer>,
    offset = 0
  ): [Mission, number] {
    return Mission.deserialize(accountInfo.data, offset)
  }

  /**
   * Retrieves the account info from the provided address and deserializes
   * the {@link Mission} from its data.
   *
   * @throws Error if no account info is found at the address or if deserialization fails
   */
  static async fromAccountAddress(
    connection: web3.Connection,
    address: web3.PublicKey,
    commitmentOrConfig?: web3.Commitment | web3.GetAccountInfoConfig
  ): Promise<Mission> {
    const accountInfo = await connection.getAccountInfo(
      address,
      commitmentOrConfig
    )
    if (accountInfo == null) {
      throw new Error(`Unable to find Mission account at ${address}`)
    }
    return Mission.fromAccountInfo(accountInfo, 0)[0]
  }

  /**
   * Provides a {@link web3.Connection.getProgramAccounts} config builder,
   * to fetch accounts matching filters that can be specified via that builder.
   *
   * @param programId - the program that owns the accounts we are filtering
   */
  static gpaBuilder(
    programId: web3.PublicKey = new web3.PublicKey(
      'HuntaX1CmUt5EByyFPE8pMf13SpvezybmMTtjmpmGmfj'
    )
  ) {
    return beetSolana.GpaBuilder.fromStruct(programId, missionBeet)
  }

  /**
   * Deserializes the {@link Mission} from the provided data Buffer.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static deserialize(buf: Buffer, offset = 0): [Mission, number] {
    return missionBeet.deserialize(buf, offset)
  }

  /**
   * Serializes the {@link Mission} into a Buffer.
   * @returns a tuple of the created Buffer and the offset up to which the buffer was written to store it.
   */
  serialize(): [Buffer, number] {
    return missionBeet.serialize({
      accountDiscriminator: missionDiscriminator,
      ...this,
    })
  }

  /**
   * Returns the byteSize of a {@link Buffer} holding the serialized data of
   * {@link Mission} for the provided args.
   *
   * @param args need to be provided since the byte size for this account
   * depends on them
   */
  static byteSize(args: MissionArgs) {
    const instance = Mission.fromArgs(args)
    return missionBeet.toFixedFromValue({
      accountDiscriminator: missionDiscriminator,
      ...instance,
    }).byteSize
  }

  /**
   * Fetches the minimum balance needed to exempt an account holding
   * {@link Mission} data from rent
   *
   * @param args need to be provided since the byte size for this account
   * depends on them
   * @param connection used to retrieve the rent exemption information
   */
  static async getMinimumBalanceForRentExemption(
    args: MissionArgs,
    connection: web3.Connection,
    commitment?: web3.Commitment
  ): Promise<number> {
    return connection.getMinimumBalanceForRentExemption(
      Mission.byteSize(args),
      commitment
    )
  }

  /**
   * Returns a readable version of {@link Mission} properties
   * and can be used to convert to JSON and/or logging
   */
  pretty() {
    return {
      bump: this.bump,
      missionPool: this.missionPool.toBase58(),
      name: this.name,
      minXp: (() => {
        const x = <{ toNumber: () => number }>this.minXp
        if (typeof x.toNumber === 'function') {
          try {
            return x.toNumber()
          } catch (_) {
            return x
          }
        }
        return x
      })(),
      cost: this.cost,
      duration: (() => {
        const x = <{ toNumber: () => number }>this.duration
        if (typeof x.toNumber === 'function') {
          try {
            return x.toNumber()
          } catch (_) {
            return x
          }
        }
        return x
      })(),
      rewards: this.rewards,
    }
  }
}

/**
 * @category Accounts
 * @category generated
 */
export const missionBeet = new beet.FixableBeetStruct<
  Mission,
  MissionArgs & {
    accountDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['accountDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['bump', beet.u8],
    ['missionPool', beetSolana.publicKey],
    ['name', beet.utf8String],
    ['minXp', beet.u64],
    ['cost', currencyBeet],
    ['duration', beet.i64],
    ['rewards', beet.array(rewardBeet)],
  ],
  Mission.fromArgs,
  'Mission'
)
