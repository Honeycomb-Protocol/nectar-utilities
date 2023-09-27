use {
    crate::state::*,
    anchor_lang::prelude::*,
    hpl_events::HplEvents,
    hpl_hive_control::{program::HplHiveControl, state::Project},
    hpl_utils::traits::Default,
};

/// Accounts used in initialize staker instruction
#[derive(Accounts)]
pub struct InitStaker<'info> {
    /// StakingPool state account
    #[account(has_one = project)]
    pub staking_pool: Account<'info, StakingPool>,

    /// Staker state account
    #[account(
      init, payer = wallet,
      space = Staker::LEN,
      seeds = [
          b"staker",
          wallet.key().as_ref(),
          staking_pool.key().as_ref(),
      ],
      bump,
  )]
    pub staker: Account<'info, Staker>,

    /// The wallet that pays for the rent
    #[account(mut)]
    pub wallet: Signer<'info>,

    /// NATIVE SYSTEM PROGRAM
    pub system_program: Program<'info, System>,

    /// HPL Hive Control Program
    pub hive_control: Program<'info, HplHiveControl>,

    /// HPL Events Program
    pub hpl_events: Program<'info, HplEvents>,

    /// NATIVE CLOCK SYSVAR
    pub clock: Sysvar<'info, Clock>,

    /// NATIVE INSTRUCTIONS SYSVAR
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,

    // HIVE CONTROL
    #[account()]
    pub project: Box<Account<'info, Project>>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub vault: AccountInfo<'info>,
}

/// Initialize staker state
pub fn init_staker(ctx: Context<InitStaker>) -> Result<()> {
    let staker = &mut ctx.accounts.staker;
    staker.set_defaults();
    staker.bump = ctx.bumps["staker"];
    staker.staking_pool = ctx.accounts.staking_pool.key();
    staker.wallet = ctx.accounts.wallet.key();

    Event::new_staker(
        staker.key(),
        staker.try_to_vec().unwrap(),
        &ctx.accounts.clock,
    )
    .emit(ctx.accounts.hpl_events.to_account_info())?;
    Ok(())
}
