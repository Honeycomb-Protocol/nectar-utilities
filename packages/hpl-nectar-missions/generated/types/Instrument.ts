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
 * This type is used to derive the {@link Instrument} type as well as the de/serializer.
 * However don't refer to it in your code but use the {@link Instrument} type instead.
 *
 * @category userTypes
 * @category enums
 * @category generated
 * @private
 */
export type InstrumentRecord = {
  Nft: { fields: [web3.PublicKey] }
  Guild: { fields: [web3.PublicKey] }
}

/**
 * Union type respresenting the Instrument data enum defined in Rust.
 *
 * NOTE: that it includes a `__kind` property which allows to narrow types in
 * switch/if statements.
 * Additionally `isInstrument*` type guards are exposed below to narrow to a specific variant.
 *
 * @category userTypes
 * @category enums
 * @category generated
 */
export type Instrument = beet.DataEnumKeyAsKind<InstrumentRecord>

export const isInstrumentNft = (
  x: Instrument
): x is Instrument & { __kind: 'Nft' } => x.__kind === 'Nft'
export const isInstrumentGuild = (
  x: Instrument
): x is Instrument & { __kind: 'Guild' } => x.__kind === 'Guild'

/**
 * @category userTypes
 * @category generated
 */
export const instrumentBeet = beet.dataEnum<InstrumentRecord>([
  [
    'Nft',
    new beet.BeetArgsStruct<InstrumentRecord['Nft']>(
      [['fields', beet.fixedSizeTuple([beetSolana.publicKey])]],
      'InstrumentRecord["Nft"]'
    ),
  ],
  [
    'Guild',
    new beet.BeetArgsStruct<InstrumentRecord['Guild']>(
      [['fields', beet.fixedSizeTuple([beetSolana.publicKey])]],
      'InstrumentRecord["Guild"]'
    ),
  ],
]) as beet.FixableBeet<Instrument, Instrument>