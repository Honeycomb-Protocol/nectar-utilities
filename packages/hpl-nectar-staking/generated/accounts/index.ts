export * from './Multipliers'
export * from './NFT'
export * from './Staker'
export * from './StakingPool'

import { Multipliers } from './Multipliers'
import { NFT } from './NFT'
import { StakingPool } from './StakingPool'
import { Staker } from './Staker'

export const accountProviders = { Multipliers, NFT, StakingPool, Staker }
