use {
    crate::state::*, anchor_lang::prelude::*, hpl_hive_control::state::Project,
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
    Ok(())
}
