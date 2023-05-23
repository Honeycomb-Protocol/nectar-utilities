/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as web3 from '@solana/web3.js'
import * as beetSolana from '@metaplex-foundation/beet-solana'
import * as beet from '@metaplex-foundation/beet'
/**
 * This type is used to derive the {@link RewardType} type as well as the de/serializer.
 * However don't refer to it in your code but use the {@link RewardType} type instead.
 *
 * @category userTypes
 * @category enums
 * @category generated
 * @private
 */
export type RewardTypeRecord = {
  Xp: void /* scalar variant */
  Currency: { address: web3.PublicKey }
}

/**
 * Union type respresenting the RewardType data enum defined in Rust.
 *
 * NOTE: that it includes a `__kind` property which allows to narrow types in
 * switch/if statements.
 * Additionally `isRewardType*` type guards are exposed below to narrow to a specific variant.
 *
 * @category userTypes
 * @category enums
 * @category generated
 */
export type RewardType = beet.DataEnumKeyAsKind<RewardTypeRecord>

export const isRewardTypeXp = (
  x: RewardType
): x is RewardType & { __kind: 'Xp' } => x.__kind === 'Xp'
export const isRewardTypeCurrency = (
  x: RewardType
): x is RewardType & { __kind: 'Currency' } => x.__kind === 'Currency'

/**
 * @category userTypes
 * @category generated
 */
export const rewardTypeBeet = beet.dataEnum<RewardTypeRecord>([
  ['Xp', beet.unit],

  [
    'Currency',
    new beet.BeetArgsStruct<RewardTypeRecord['Currency']>(
      [['address', beetSolana.publicKey]],
      'RewardTypeRecord["Currency"]'
    ),
  ],
]) as beet.FixableBeet<RewardType, RewardType>
