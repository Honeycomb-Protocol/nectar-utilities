/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as web3 from '@solana/web3.js'
import * as beet from '@metaplex-foundation/beet'
import * as beetSolana from '@metaplex-foundation/beet-solana'
import { EarnedReward, earnedRewardBeet } from './EarnedReward'
import { GuildRole, guildRoleBeet } from './GuildRole'
/**
 * This type is used to derive the {@link CharacterUsedBy} type as well as the de/serializer.
 * However don't refer to it in your code but use the {@link CharacterUsedBy} type instead.
 *
 * @category userTypes
 * @category enums
 * @category generated
 * @private
 */
export type CharacterUsedByRecord = {
  None: void /* scalar variant */
  Staking: {
    pool: web3.PublicKey
    staker: web3.PublicKey
    stakedAt: beet.bignum
    claimedAt: beet.bignum
  }
  Mission: {
    id: web3.PublicKey
    rewards: EarnedReward[]
    endTime: beet.bignum
    rewardsCollected: boolean
  }
  Guild: { id: web3.PublicKey; role: GuildRole; order: number }
}

/**
 * Union type respresenting the CharacterUsedBy data enum defined in Rust.
 *
 * NOTE: that it includes a `__kind` property which allows to narrow types in
 * switch/if statements.
 * Additionally `isCharacterUsedBy*` type guards are exposed below to narrow to a specific variant.
 *
 * @category userTypes
 * @category enums
 * @category generated
 */
export type CharacterUsedBy = beet.DataEnumKeyAsKind<CharacterUsedByRecord>

export const isCharacterUsedByNone = (
  x: CharacterUsedBy
): x is CharacterUsedBy & { __kind: 'None' } => x.__kind === 'None'
export const isCharacterUsedByStaking = (
  x: CharacterUsedBy
): x is CharacterUsedBy & { __kind: 'Staking' } => x.__kind === 'Staking'
export const isCharacterUsedByMission = (
  x: CharacterUsedBy
): x is CharacterUsedBy & { __kind: 'Mission' } => x.__kind === 'Mission'
export const isCharacterUsedByGuild = (
  x: CharacterUsedBy
): x is CharacterUsedBy & { __kind: 'Guild' } => x.__kind === 'Guild'

/**
 * @category userTypes
 * @category generated
 */
export const characterUsedByBeet = beet.dataEnum<CharacterUsedByRecord>([
  ['None', beet.unit],

  [
    'Staking',
    new beet.BeetArgsStruct<CharacterUsedByRecord['Staking']>(
      [
        ['pool', beetSolana.publicKey],
        ['staker', beetSolana.publicKey],
        ['stakedAt', beet.i64],
        ['claimedAt', beet.i64],
      ],
      'CharacterUsedByRecord["Staking"]'
    ),
  ],

  [
    'Mission',
    new beet.FixableBeetArgsStruct<CharacterUsedByRecord['Mission']>(
      [
        ['id', beetSolana.publicKey],
        ['rewards', beet.array(earnedRewardBeet)],
        ['endTime', beet.u64],
        ['rewardsCollected', beet.bool],
      ],
      'CharacterUsedByRecord["Mission"]'
    ),
  ],

  [
    'Guild',
    new beet.BeetArgsStruct<CharacterUsedByRecord['Guild']>(
      [
        ['id', beetSolana.publicKey],
        ['role', guildRoleBeet],
        ['order', beet.u8],
      ],
      'CharacterUsedByRecord["Guild"]'
    ),
  ],
]) as beet.FixableBeet<CharacterUsedBy, CharacterUsedBy>
