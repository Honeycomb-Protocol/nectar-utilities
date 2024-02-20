use {anchor_lang::prelude::*, hpl_toolkit::schema::*};

/// The staking_pool multiplier state account
/// PDA: ['multipliers', staking_pool]
/// Category: multiplier_state
#[account]
#[derive(ToSchema)]
pub struct Multipliers {
    pub bump: u8,

    /// The staking_pool this multiplier is associated with
    pub staking_pool: Pubkey,

    /// The decimals for multipliers
    pub decimals: u8,

    /// The duration multipliers for the staking_pool
    pub duration_multipliers: Vec<Multiplier>,

    /// The duration multipliers for the staking_pool
    pub count_multipliers: Vec<Multiplier>,

    /// The duration multipliers for the staking_pool
    pub creator_multipliers: Vec<Multiplier>,

    /// The duration multipliers for the staking_pool
    pub collection_multipliers: Vec<Multiplier>,
}
impl Multipliers {
    pub const LEN: usize = 8 + 136;

    pub fn set_defaults(&mut self) {
        self.bump = 0;
        self.staking_pool = Pubkey::default();
        self.decimals = 0;
        self.duration_multipliers = vec![];
        self.count_multipliers = vec![];
        self.creator_multipliers = vec![];
        self.collection_multipliers = vec![];
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, ToSchema)]
pub struct Multiplier {
    pub value: u64,
    pub multiplier_type: MultiplierType,
}
impl Multiplier {
    pub const LEN: usize = 48;

    pub fn set_defaults(&mut self) {
        self.value = 0;
        self.multiplier_type = MultiplierType::StakeDuration { min_duration: 0 };
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, ToSchema)]
pub enum MultiplierType {
    /// The multiplier is applied to the stake duration
    StakeDuration { min_duration: u64 },

    /// The multiplier is applied to the number of NFTs staked
    NFTCount { min_count: u64 },

    /// The multiplier is applied based on creator
    Creator { creator: Pubkey },

    /// The multiplier is applied based on collection
    Collection { collection: Pubkey },
}
