export * from './Multipliers'
export * from './NFT'
export * from './Staker'
export * from './StakingProject'

import { Multipliers } from './Multipliers'
import { NFT } from './NFT'
import { Staker } from './Staker'
import { StakingProject } from './StakingProject'

export const accountProviders = { Multipliers, NFT, Staker, StakingProject }
