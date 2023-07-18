use {anchor_lang::prelude::*, hpl_utils::Default};

/// Mission account holding the details about mission
#[account]
#[derive(Debug)]
pub struct Mission {
    pub bump: u8,
    pub mission_pool: Pubkey,
    pub name: String,
    pub min_xp: u64,
    pub cost: Currency,
    /// The duration of the mission in seconds
    pub duration: i64,
    pub rewards: Vec<Reward>,
}
impl Default for Mission {
    const LEN: usize = 8 + 112;

    fn set_defaults(&mut self) {
        self.bump = 0;
        self.mission_pool = Pubkey::default();
        self.name = String::default();
        self.min_xp = 0;
        self.cost = Currency {
            amount: 0,
            address: Pubkey::default(),
        };
        self.duration = 0;
        self.rewards = vec![];
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct Currency {
    pub amount: u64,
    pub address: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct Reward {
    pub min: u64,
    pub max: u64,
    pub reward_type: RewardType,
}
impl Reward {
    pub const LEN: usize = 8 + 56;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum RewardType {
    Xp,
    Currency { address: Pubkey },
}
