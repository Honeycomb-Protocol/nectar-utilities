use {super::RewardType, anchor_lang::prelude::*, hpl_utils::Default};

/// Participation state account
/// PDA: ['participation', nft]
/// Category: participation_state
#[account]
#[derive(PartialEq, Eq, Debug)]
pub struct Participation {
    pub bump: u8, // Not needed anymore
    pub wallet: Pubkey, // Not needed, present in character
    pub mission: Pubkey,
    pub instrument: Instrument, // Not needed, present in character
    /// The end time of the mission in unix timestamp
    /// It is calculated by start_time + mission.duration
    pub end_time: i64, // Replace with enum, time-based or task based (task based is not defined yet)
    pub is_recalled: bool, // Not needed, present in character
    pub rewards: Vec<EarnedReward>,
}
impl Default for Participation {
    const LEN: usize = 8 + 136;

    fn set_defaults(&mut self) {
        self.bump = 0;
        self.wallet = Pubkey::default();
        self.mission = Pubkey::default();
        self.end_time = 0;
        self.is_recalled = false;
        self.rewards = vec![];
        self.instrument = Instrument::Nft(Pubkey::default());
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Eq, Clone, Debug)]
pub struct EarnedReward {
    pub amount: u64, // Store delta here
    pub reward_type: RewardType, // change to reward_idx, compression purposes. Represents which reward is being picked from the rewards vec.
    pub collected: bool, // Remove, we'll remove this from the vec if the reward is colleted
}

#[derive(AnchorSerialize, AnchorDeserialize, PartialEq, Eq, Clone, Debug)]
pub enum Instrument {
    Nft(Pubkey),
    Guild(Pubkey),
}
