use {crate::traits::*, anchor_lang::prelude::*};

/// The project multiplier state account
#[account]
pub struct Staker {
    pub bump: u8,

    /// The project this multiplier is associated with
    pub project: Pubkey,

    /// The wallet that owns this staker account
    pub wallet: Pubkey,

    /// The total amount of tokens staked
    pub total_staked: u64,
}
impl Default for Staker {
    const LEN: usize = 8 + 80;

    fn set_defaults(&mut self) {
        self.bump = 0;
        self.project = Pubkey::default();
        self.wallet = Pubkey::default();
        self.total_staked = 0;
    }
}
