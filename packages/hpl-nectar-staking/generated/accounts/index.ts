export * from './Multipliers'
export * from './Staker'
export * from './StakingPool'

import { Multipliers } from './Multipliers'
import { StakingPool } from './StakingPool'
import { Staker } from './Staker'

export const accountProviders = { Multipliers, StakingPool, Staker }
