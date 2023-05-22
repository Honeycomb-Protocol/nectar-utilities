/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as beet from '@metaplex-foundation/beet'
import { RewardType, rewardTypeBeet } from './RewardType'
export type Reward = {
  min: beet.bignum
  max: beet.bignum
  rewardType: RewardType
}

/**
 * @category userTypes
 * @category generated
 */
export const rewardBeet = new beet.FixableBeetArgsStruct<Reward>(
  [
    ['min', beet.u64],
    ['max', beet.u64],
    ['rewardType', rewardTypeBeet],
  ],
  'Reward'
)