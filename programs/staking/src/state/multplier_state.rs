use {crate::traits::*, anchor_lang::prelude::*};

/// The project multiplier state account
#[account]
pub struct Multipliers {
    pub bump: u8,

    /// The project this multiplier is associated with
    pub project: Pubkey,

    /// The decimals for multipliers
    pub decimals: u8,

    /// The duration multipliers for the project
    pub duration_multipliers: Vec<Multiplier>,

    /// The duration multipliers for the project
    pub count_multipliers: Vec<Multiplier>,

    /// The duration multipliers for the project
    pub creator_multipliers: Vec<Multiplier>,

    /// The duration multipliers for the project
    pub collection_multipliers: Vec<Multiplier>,
}
impl Default for Multipliers {
    const LEN: usize = 8 + 136;

    fn set_defaults(&mut self) {
        self.bump = 0;
        self.project = Pubkey::default();
        self.decimals = 0;
        self.duration_multipliers = vec![];
        self.count_multipliers = vec![];
        self.creator_multipliers = vec![];
        self.collection_multipliers = vec![];
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct Multiplier {
    pub value: u64,
    pub multiplier_type: MultiplierType,
}
impl Default for Multiplier {
    const LEN: usize = 48;

    fn set_defaults(&mut self) {
        self.value = 0;
        self.multiplier_type = MultiplierType::StakeDuration { min_duration: 0 };
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
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
