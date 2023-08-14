use {anchor_lang::prelude::*, hpl_utils::traits::*};

/// The NFT collection staking_pool state account
/// PDA: ['staking_pool', project, key]
/// Category: staking_pool_state
#[account]
pub struct StakingPool {
    pub bump: u8,
    pub temp_place_holder_1: u8,
    pub project: Pubkey,
    pub key: Pubkey,

    /// The mint of the token distributed to stakers
    pub currency: Pubkey,

    /// The account owning tokens distributed to stakers
    pub temp_place_holder_2: Pubkey,

    /// Lock type { Freeze, Custody }
    pub lock_type: LockType,

    /// name of the staking_pool
    pub name: String,

    /// The rewards per selected duration
    pub rewards_per_duration: u64,

    /// The duration of the rewards in seconds
    pub rewards_duration: u64,

    /// The maximum duration of the rewards in seconds
    pub max_rewards_duration: Option<u64>,

    /// The minimum stake duration in seconds
    pub min_stake_duration: Option<u64>,

    /// Cooldown duration in seconds
    pub cooldown_duration: Option<u64>,

    /// Flag to reset stake duration on restaking
    pub reset_stake_duration: bool,

    /// Allowed mints only
    pub allowed_mints: bool,

    /// Total staked nfts
    pub total_staked: u64,

    /// The unix_timestamp when the statking starts
    pub start_time: Option<i64>,

    /// The unix_timestamp when the statking ends
    pub end_time: Option<i64>,

    /// The collection mint addresses to be used for the staking_pool
    pub collections: Vec<u8>,

    /// The creator addresses to be used for the staking_pool
    pub creators: Vec<u8>,

    /// The merkle tress for cNFTs
    pub merkle_trees: Vec<u8>,
}
impl Default for StakingPool {
    const LEN: usize = 8 + 268;

    fn set_defaults(&mut self) {
        self.bump = 0;
        self.temp_place_holder_1 = 0;
        self.project = Pubkey::default();
        self.key = Pubkey::default();
        self.currency = Pubkey::default();
        self.temp_place_holder_2 = Pubkey::default();
        self.lock_type = LockType::Freeze;
        self.name = "".to_string();
        self.rewards_per_duration = 0;
        self.rewards_duration = 1;
        self.max_rewards_duration = None;
        self.min_stake_duration = None;
        self.cooldown_duration = None;
        self.reset_stake_duration = true;
        self.allowed_mints = false;
        self.total_staked = 0;
        self.start_time = None;
        self.end_time = None;
        self.collections = vec![];
        self.creators = vec![];
        self.merkle_trees = vec![];
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq)]
pub enum LockType {
    Freeze,
    Custoday,
}
