/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as beet from '@metaplex-foundation/beet'
import { CharacterUsedBy, characterUsedByBeet } from './CharacterUsedBy'
export type CollectRewardsArgs = {
  root: number[] /* size: 32 */
  leafIdx: number
  sourceHash: number[] /* size: 32 */
  usedBy: CharacterUsedBy
}

/**
 * @category userTypes
 * @category generated
 */
export const collectRewardsArgsBeet =
  new beet.FixableBeetArgsStruct<CollectRewardsArgs>(
    [
      ['root', beet.uniformFixedSizeArray(beet.u8, 32)],
      ['leafIdx', beet.u32],
      ['sourceHash', beet.uniformFixedSizeArray(beet.u8, 32)],
      ['usedBy', characterUsedByBeet],
    ],
    'CollectRewardsArgs'
  )
