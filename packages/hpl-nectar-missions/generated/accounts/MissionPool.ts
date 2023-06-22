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
 * Arguments used to create {@link MissionPool}
 * @category Accounts
 * @category generated
 */
export type MissionPoolArgs = {
  bump: number
  project: web3.PublicKey
  name: string
  factionsMerkleRoot: number[] /* size: 32 */
  randomizerRound: number
  collections: Uint8Array
  creators: Uint8Array
}

export const missionPoolDiscriminator = [106, 55, 99, 194, 178, 110, 104, 188]
/**
 * Holds the data for the {@link MissionPool} Account and provides de/serialization
 * functionality for that data
 *
 * @category Accounts
 * @category generated
 */
export class MissionPool implements MissionPoolArgs {
  private constructor(
    readonly bump: number,
    readonly project: web3.PublicKey,
    readonly name: string,
    readonly factionsMerkleRoot: number[] /* size: 32 */,
    readonly randomizerRound: number,
    readonly collections: Uint8Array,
    readonly creators: Uint8Array
  ) {}

  /**
   * Creates a {@link MissionPool} instance from the provided args.
   */
  static fromArgs(args: MissionPoolArgs) {
    return new MissionPool(
      args.bump,
      args.project,
      args.name,
      args.factionsMerkleRoot,
      args.randomizerRound,
      args.collections,
      args.creators
    )
  }

  /**
   * Deserializes the {@link MissionPool} from the data of the provided {@link web3.AccountInfo}.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static fromAccountInfo(
    accountInfo: web3.AccountInfo<Buffer>,
    offset = 0
  ): [MissionPool, number] {
    return MissionPool.deserialize(accountInfo.data, offset)
  }

  /**
   * Retrieves the account info from the provided address and deserializes
   * the {@link MissionPool} from its data.
   *
   * @throws Error if no account info is found at the address or if deserialization fails
   */
  static async fromAccountAddress(
    connection: web3.Connection,
    address: web3.PublicKey,
    commitmentOrConfig?: web3.Commitment | web3.GetAccountInfoConfig
  ): Promise<MissionPool> {
    const accountInfo = await connection.getAccountInfo(
      address,
      commitmentOrConfig
    )
    if (accountInfo == null) {
      throw new Error(`Unable to find MissionPool account at ${address}`)
    }
    return MissionPool.fromAccountInfo(accountInfo, 0)[0]
  }

  /**
   * Provides a {@link web3.Connection.getProgramAccounts} config builder,
   * to fetch accounts matching filters that can be specified via that builder.
   *
   * @param programId - the program that owns the accounts we are filtering
   */
  static gpaBuilder(
    programId: web3.PublicKey = new web3.PublicKey(
      'HUNTopv9dHDdTPPMV1SfKZAxjXtuM4ic2PVEWPbsi9Z2'
    )
  ) {
    return beetSolana.GpaBuilder.fromStruct(programId, missionPoolBeet)
  }

  /**
   * Deserializes the {@link MissionPool} from the provided data Buffer.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static deserialize(buf: Buffer, offset = 0): [MissionPool, number] {
    return missionPoolBeet.deserialize(buf, offset)
  }

  /**
   * Serializes the {@link MissionPool} into a Buffer.
   * @returns a tuple of the created Buffer and the offset up to which the buffer was written to store it.
   */
  serialize(): [Buffer, number] {
    return missionPoolBeet.serialize({
      accountDiscriminator: missionPoolDiscriminator,
      ...this,
    })
  }

  /**
   * Returns the byteSize of a {@link Buffer} holding the serialized data of
   * {@link MissionPool} for the provided args.
   *
   * @param args need to be provided since the byte size for this account
   * depends on them
   */
  static byteSize(args: MissionPoolArgs) {
    const instance = MissionPool.fromArgs(args)
    return missionPoolBeet.toFixedFromValue({
      accountDiscriminator: missionPoolDiscriminator,
      ...instance,
    }).byteSize
  }

  /**
   * Fetches the minimum balance needed to exempt an account holding
   * {@link MissionPool} data from rent
   *
   * @param args need to be provided since the byte size for this account
   * depends on them
   * @param connection used to retrieve the rent exemption information
   */
  static async getMinimumBalanceForRentExemption(
    args: MissionPoolArgs,
    connection: web3.Connection,
    commitment?: web3.Commitment
  ): Promise<number> {
    return connection.getMinimumBalanceForRentExemption(
      MissionPool.byteSize(args),
      commitment
    )
  }

  /**
   * Returns a readable version of {@link MissionPool} properties
   * and can be used to convert to JSON and/or logging
   */
  pretty() {
    return {
      bump: this.bump,
      project: this.project.toBase58(),
      name: this.name,
      factionsMerkleRoot: this.factionsMerkleRoot,
      randomizerRound: this.randomizerRound,
      collections: this.collections,
      creators: this.creators,
    }
  }
}

/**
 * @category Accounts
 * @category generated
 */
export const missionPoolBeet = new beet.FixableBeetStruct<
  MissionPool,
  MissionPoolArgs & {
    accountDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['accountDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['bump', beet.u8],
    ['project', beetSolana.publicKey],
    ['name', beet.utf8String],
    ['factionsMerkleRoot', beet.uniformFixedSizeArray(beet.u8, 32)],
    ['randomizerRound', beet.u8],
    ['collections', beet.bytes],
    ['creators', beet.bytes],
  ],
  MissionPool.fromArgs,
  'MissionPool'
)
