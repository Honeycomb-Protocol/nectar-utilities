export * from './Multipliers'
export * from './NFTv1'
export * from './Staker'
export * from './StakingPool'

import { Multipliers } from './Multipliers'
import { NFTv1 } from './NFTv1'
import { StakingPool } from './StakingPool'
import { Staker } from './Staker'

export const accountProviders = { Multipliers, NFTv1, StakingPool, Staker }
