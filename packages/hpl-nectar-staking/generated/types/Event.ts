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
 * This type is used to derive the {@link Event} type as well as the de/serializer.
 * However don't refer to it in your code but use the {@link Event} type instead.
 *
 * @category userTypes
 * @category enums
 * @category generated
 * @private
 */
export type EventRecord = {
  NewNft: { address: web3.PublicKey; state: Uint8Array }
  NftUsed: { address: web3.PublicKey; state: Uint8Array }
  NewStaker: { address: web3.PublicKey; state: Uint8Array }
  Stake: {
    nftAddress: web3.PublicKey
    nft: Uint8Array
    stakerAddress: web3.PublicKey
    staker: Uint8Array
  }
  Unstake: {
    nftAddress: web3.PublicKey
    nft: Uint8Array
    stakerAddress: web3.PublicKey
    staker: Uint8Array
  }
  ClaimRewards: {
    nftAddress: web3.PublicKey
    nft: Uint8Array
    stakerAddress: web3.PublicKey
    amount: beet.bignum
  }
}

/**
 * Union type respresenting the Event data enum defined in Rust.
 *
 * NOTE: that it includes a `__kind` property which allows to narrow types in
 * switch/if statements.
 * Additionally `isEvent*` type guards are exposed below to narrow to a specific variant.
 *
 * @category userTypes
 * @category enums
 * @category generated
 */
export type Event = beet.DataEnumKeyAsKind<EventRecord>

export const isEventNewNft = (x: Event): x is Event & { __kind: 'NewNft' } =>
  x.__kind === 'NewNft'
export const isEventNftUsed = (x: Event): x is Event & { __kind: 'NftUsed' } =>
  x.__kind === 'NftUsed'
export const isEventNewStaker = (
  x: Event
): x is Event & { __kind: 'NewStaker' } => x.__kind === 'NewStaker'
export const isEventStake = (x: Event): x is Event & { __kind: 'Stake' } =>
  x.__kind === 'Stake'
export const isEventUnstake = (x: Event): x is Event & { __kind: 'Unstake' } =>
  x.__kind === 'Unstake'
export const isEventClaimRewards = (
  x: Event
): x is Event & { __kind: 'ClaimRewards' } => x.__kind === 'ClaimRewards'

/**
 * @category userTypes
 * @category generated
 */
export const eventBeet = beet.dataEnum<EventRecord>([
  [
    'NewNft',
    new beet.FixableBeetArgsStruct<EventRecord['NewNft']>(
      [
        ['address', beetSolana.publicKey],
        ['state', beet.bytes],
      ],
      'EventRecord["NewNft"]'
    ),
  ],

  [
    'NftUsed',
    new beet.FixableBeetArgsStruct<EventRecord['NftUsed']>(
      [
        ['address', beetSolana.publicKey],
        ['state', beet.bytes],
      ],
      'EventRecord["NftUsed"]'
    ),
  ],

  [
    'NewStaker',
    new beet.FixableBeetArgsStruct<EventRecord['NewStaker']>(
      [
        ['address', beetSolana.publicKey],
        ['state', beet.bytes],
      ],
      'EventRecord["NewStaker"]'
    ),
  ],

  [
    'Stake',
    new beet.FixableBeetArgsStruct<EventRecord['Stake']>(
      [
        ['nftAddress', beetSolana.publicKey],
        ['nft', beet.bytes],
        ['stakerAddress', beetSolana.publicKey],
        ['staker', beet.bytes],
      ],
      'EventRecord["Stake"]'
    ),
  ],

  [
    'Unstake',
    new beet.FixableBeetArgsStruct<EventRecord['Unstake']>(
      [
        ['nftAddress', beetSolana.publicKey],
        ['nft', beet.bytes],
        ['stakerAddress', beetSolana.publicKey],
        ['staker', beet.bytes],
      ],
      'EventRecord["Unstake"]'
    ),
  ],

  [
    'ClaimRewards',
    new beet.FixableBeetArgsStruct<EventRecord['ClaimRewards']>(
      [
        ['nftAddress', beetSolana.publicKey],
        ['nft', beet.bytes],
        ['stakerAddress', beetSolana.publicKey],
        ['amount', beet.u64],
      ],
      'EventRecord["ClaimRewards"]'
    ),
  ],
]) as beet.FixableBeet<Event, Event>
