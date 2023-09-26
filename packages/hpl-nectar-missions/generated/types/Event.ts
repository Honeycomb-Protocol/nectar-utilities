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
  NewParticipation: { address: web3.PublicKey; state: Uint8Array }
  CollectParticipationReward: {
    address: web3.PublicKey
    index: number
    state: Uint8Array
  }
  RecallParticipation: { address: web3.PublicKey; state: Uint8Array }
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

export const isEventNewParticipation = (
  x: Event
): x is Event & { __kind: 'NewParticipation' } =>
  x.__kind === 'NewParticipation'
export const isEventCollectParticipationReward = (
  x: Event
): x is Event & { __kind: 'CollectParticipationReward' } =>
  x.__kind === 'CollectParticipationReward'
export const isEventRecallParticipation = (
  x: Event
): x is Event & { __kind: 'RecallParticipation' } =>
  x.__kind === 'RecallParticipation'

/**
 * @category userTypes
 * @category generated
 */
export const eventBeet = beet.dataEnum<EventRecord>([
  [
    'NewParticipation',
    new beet.FixableBeetArgsStruct<EventRecord['NewParticipation']>(
      [
        ['address', beetSolana.publicKey],
        ['state', beet.bytes],
      ],
      'EventRecord["NewParticipation"]'
    ),
  ],

  [
    'CollectParticipationReward',
    new beet.FixableBeetArgsStruct<EventRecord['CollectParticipationReward']>(
      [
        ['address', beetSolana.publicKey],
        ['index', beet.u8],
        ['state', beet.bytes],
      ],
      'EventRecord["CollectParticipationReward"]'
    ),
  ],

  [
    'RecallParticipation',
    new beet.FixableBeetArgsStruct<EventRecord['RecallParticipation']>(
      [
        ['address', beetSolana.publicKey],
        ['state', beet.bytes],
      ],
      'EventRecord["RecallParticipation"]'
    ),
  ],
]) as beet.FixableBeet<Event, Event>
