use {super::RewardType, anchor_lang::prelude::*, hpl_utils::Default};

/// Participation state account
#[account]
#[derive(Default)]
pub struct Participation {
    pub bump: u8,
    pub wallet: Pubkey,
    pub mission: Pubkey,
    pub nft: Pubkey,
    /// The end time of the mission in unix timestamp
    /// It is calculated by start_time + mission.duration
    pub end_time: i64,
    pub is_recalled: bool,
    pub rewards: Vec<EarnedReward>,
}
impl Default for Participation {
    const LEN: usize = 8 + 136;

    fn set_defaults(&mut self) {
        self.bump = 0;
        self.wallet = Pubkey::default();
        self.mission = Pubkey::default();
        self.nft = Pubkey::default();
        self.end_time = 0;
        self.is_recalled = false;
        self.rewards = vec![];
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub struct EarnedReward {
    pub amount: u64,
    pub reward_type: RewardType,
    pub collected: bool,
}
