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
 * This type is used to derive the {@link Event} type as well as the de/serializer.
 * However don't refer to it in your code but use the {@link Event} type instead.
 *
 * @category userTypes
 * @category enums
 * @category generated
 * @private
 */
export type EventRecord = {
  NewStaker: { address: web3.PublicKey; state: Uint8Array }
  StakerChange: { stakerAddress: web3.PublicKey; staker: Uint8Array }
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

export const isEventNewStaker = (
  x: Event
): x is Event & { __kind: 'NewStaker' } => x.__kind === 'NewStaker'
export const isEventStakerChange = (
  x: Event
): x is Event & { __kind: 'StakerChange' } => x.__kind === 'StakerChange'

/**
 * @category userTypes
 * @category generated
 */
export const eventBeet = beet.dataEnum<EventRecord>([
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
    'StakerChange',
    new beet.FixableBeetArgsStruct<EventRecord['StakerChange']>(
      [
        ['stakerAddress', beetSolana.publicKey],
        ['staker', beet.bytes],
      ],
      'EventRecord["StakerChange"]'
    ),
  ],
]) as beet.FixableBeet<Event, Event>
