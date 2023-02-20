pub mod errors;
pub mod instructions;
pub mod state;
pub mod traits;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("8pyniLLXEHVUJKX2h5E9DrvwTsRmSR64ucUYBg8jQgPP");

#[program]
pub mod staking {
    use super::*;

    pub fn create_project(ctx: Context<CreateProject>, args: CreateProjectArgs) -> Result<()> {
        instructions::create_project(ctx, args)
    }

    pub fn update_project(ctx: Context<UpdateProject>, args: UpdateProjectArgs) -> Result<()> {
        instructions::update_project(ctx, args)
    }

    pub fn init_multipliers(
        ctx: Context<InitMultipliers>,
        args: InitMultipliersArgs,
    ) -> Result<()> {
        instructions::init_multipliers(ctx, args)
    }

    pub fn add_multiplier(ctx: Context<AddMultiplier>, args: AddMultiplierArgs) -> Result<()> {
        instructions::add_multiplier(ctx, args)
    }

    pub fn init_nft(ctx: Context<InitNFT>) -> Result<()> {
        instructions::init_nft(ctx)
    }

    pub fn init_staker(ctx: Context<InitStaker>) -> Result<()> {
        instructions::init_staker(ctx)
    }

    pub fn stake(ctx: Context<Stake>) -> Result<()> {
        instructions::stake(ctx)
    }

    pub fn unstake(ctx: Context<Unstake>) -> Result<()> {
        instructions::unstake(ctx)
    }

    pub fn fund_rewards(ctx: Context<FundRewards>, amount: u64) -> Result<()> {
        instructions::fund_rewards(ctx, amount)
    }

    pub fn withdraw_rewards(ctx: Context<WithdrawRewards>, amount: u64) -> Result<()> {
        instructions::withdraw_rewards(ctx, amount)
    }

    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        instructions::claim_rewards(ctx)
    }

    pub fn migrate_custodial(ctx: Context<MigrateCustodial>, args: MigrateArgs) -> Result<()> {
        instructions::migrate_custodial(ctx, args)
    }
}
