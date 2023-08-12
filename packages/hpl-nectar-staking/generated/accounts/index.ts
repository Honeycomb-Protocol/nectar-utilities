export * from './Multipliers'
export * from './NFT'
export * from './NFTv1'
export * from './Staker'
export * from './StakingPool'

import { Multipliers } from './Multipliers'
import { NFT } from './NFT'
import { NFTv1 } from './NFTv1'
import { StakingPool } from './StakingPool'
import { Staker } from './Staker'

export const accountProviders = { Multipliers, NFT, NFTv1, StakingPool, Staker }
