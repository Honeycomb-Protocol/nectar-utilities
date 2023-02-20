use {
    crate::{state::*, traits::Default},
    anchor_lang::prelude::*,
};

/// Accounts used in initialize staker instruction
#[derive(Accounts)]
pub struct InitStaker<'info> {
    /// Project state account
    #[account(mut)]
    pub project: Account<'info, Project>,

    /// Staker state account
    #[account(
      init, payer = wallet,
      space = Staker::LEN,
      seeds = [
          b"staker",
          wallet.key().as_ref(),
          project.key().as_ref(),
      ],
      bump,
  )]
    pub staker: Account<'info, Staker>,

    /// The wallet that pays for the rent
    #[account(mut)]
    pub wallet: Signer<'info>,

    /// NATIVE SYSTEM PROGRAM
    pub system_program: Program<'info, System>,
}

/// Initialize staker state
pub fn init_staker(ctx: Context<InitStaker>) -> Result<()> {
    let staker = &mut ctx.accounts.staker;
    staker.set_defaults();
    staker.bump = ctx.bumps["staker"];
    staker.project = ctx.accounts.project.key();
    staker.wallet = ctx.accounts.wallet.key();
    Ok(())
}
