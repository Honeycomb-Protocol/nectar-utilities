pub mod compressed_stake_instructions;
pub mod multiplier_instructions;
pub mod nft_instructions;
pub mod pool_instructions;
pub mod reward_instructions;
pub mod stake_instructions;
pub mod staker_instructions;

pub use {
    compressed_stake_instructions::*, multiplier_instructions::*, nft_instructions::*,
    pool_instructions::*, reward_instructions::*, stake_instructions::*, staker_instructions::*,
};
