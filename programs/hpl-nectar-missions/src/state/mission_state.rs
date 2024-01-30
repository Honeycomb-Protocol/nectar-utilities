use {
    anchor_lang::prelude::*, 
    hpl_utils::Default,
};

/// Mission account holding the details about mission
/// PDA: ['mission', project, name]
/// Category: mission_state
#[account]
// #[derive(Debug)]
pub struct Mission {
    pub bump: u8, // 1
    pub mission_pool: Pubkey, // 32
    pub name: String, // 40
    pub min_xp: u64, // 8
    pub cost: Currency, // 40
    pub requirement: MissionRequirement, // 1 (variant) + 8 (u64) -  (only time for now)
    pub rewards: Vec<Reward>, // 4 (vec) + (1 (variant) + 32 (pubkey)) * n
}
impl Default for Mission {
    const LEN: usize = 8 + 1 + 32 + 40 + 8 + 40 + 9;
    
    fn set_defaults(&mut self) {

        const ONE_WEEK_IN_SECONDS: u64 = 60 * 60 * 24 * 7;

        self.bump = 0;
        self.mission_pool = Pubkey::default();
        self.name = String::default();
        self.min_xp = 0;
        self.cost = Currency {
            amount: 0,
            address: Pubkey::default(),
        };
        self.requirement = MissionRequirement::Time { 
            duration: ONE_WEEK_IN_SECONDS,
        };
        self.rewards = vec![];
    }
}

impl Mission {
    pub fn get_duration(&self) -> u64 {
        match self.requirement {
            MissionRequirement::Time { duration } => duration,
            // Uncomment this code when we add more requirement types
            // _ => panic!("Mission requirement is not time"),
        }
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct Currency {
    pub amount: u64,
    pub address: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum MissionRequirement {
    Time {
        /// The duration of the mission in unix timestamp (in seconds)
        duration: u64,
    },
    // Add task requirement later down the line
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

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, Eq, PartialEq)]
pub enum RewardType {
    Xp,
    Currency { address: Pubkey },
}
