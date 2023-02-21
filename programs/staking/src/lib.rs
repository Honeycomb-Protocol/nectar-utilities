pub mod errors;
pub mod instructions;
pub mod state;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("8pyniLLXEHVUJKX2h5E9DrvwTsRmSR64ucUYBg8jQgPP");

#[program]
pub mod hpl_nectar_staking {
    use super::*;

    pub fn create_staking_project(
        ctx: Context<CreateStakingProject>,
        args: CreateStakingProjectArgs,
    ) -> Result<()> {
        hpl_hive_control::cpi::add_remove_service(
            CpiContext::new(
                ctx.accounts.hive_control.to_account_info(),
                hpl_hive_control::cpi::accounts::AddRemoveService {
                    project: ctx.accounts.project.to_account_info(),
                    delegate_authority: if let Some(delegate_authority) =
                        &ctx.accounts.delegate_authority
                    {
                        Some(delegate_authority.to_account_info())
                    } else {
                        None
                    },
                    authority: ctx.accounts.authority.to_account_info(),
                    vault: ctx.accounts.vault.to_account_info(),
                    payer: ctx.accounts.payer.to_account_info(),
                    rent_sysvar: ctx.accounts.rent_sysvar.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                },
            ),
            hpl_hive_control::instructions::AddRemoveServiceArgs {
                service: hpl_hive_control::state::Service::Staking {
                    pool_id: ctx.accounts.staking_project.key(),
                },
                remove: Some(false),
            },
        )?;

        instructions::create_staking_project(ctx, args)
    }

    pub fn update_staking_project(
        ctx: Context<UpdateStakingProject>,
        args: UpdateStakingProjectArgs,
    ) -> Result<()> {
        hpl_hive_control::instructions::platform_gate(
            hpl_hive_control::constants::ACTIONS.manage_staking_project,
            &ctx.accounts.project,
            ctx.accounts.authority.key(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            &ctx.accounts.delegate_authority,
            ctx.accounts.system_program.to_account_info(),
        )?;

        instructions::update_staking_project(ctx, args)
    }

    pub fn init_multipliers(
        ctx: Context<InitMultipliers>,
        args: InitMultipliersArgs,
    ) -> Result<()> {
        hpl_hive_control::instructions::platform_gate(
            hpl_hive_control::constants::ACTIONS.manage_staking_project,
            &ctx.accounts.project,
            ctx.accounts.authority.key(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            &ctx.accounts.delegate_authority,
            ctx.accounts.system_program.to_account_info(),
        )?;

        instructions::init_multipliers(ctx, args)
    }

    pub fn add_multiplier(ctx: Context<AddMultiplier>, args: AddMultiplierArgs) -> Result<()> {
        hpl_hive_control::instructions::platform_gate(
            hpl_hive_control::constants::ACTIONS.manage_staking_project,
            &ctx.accounts.project,
            ctx.accounts.authority.key(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            &ctx.accounts.delegate_authority,
            ctx.accounts.system_program.to_account_info(),
        )?;

        instructions::add_multiplier(ctx, args)
    }

    pub fn init_nft(ctx: Context<InitNFT>) -> Result<()> {
        hpl_hive_control::instructions::platform_gate(
            hpl_hive_control::constants::ACTIONS.public_low,
            &ctx.accounts.project,
            ctx.accounts.wallet.key(),
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            &ctx.accounts.delegate_authority,
            ctx.accounts.system_program.to_account_info(),
        )?;

        instructions::init_nft(ctx)
    }

    pub fn init_staker(ctx: Context<InitStaker>) -> Result<()> {
        hpl_hive_control::instructions::platform_gate(
            hpl_hive_control::constants::ACTIONS.public_low,
            &ctx.accounts.project,
            ctx.accounts.wallet.key(),
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            &None,
            ctx.accounts.system_program.to_account_info(),
        )?;

        instructions::init_staker(ctx)
    }

    pub fn stake(ctx: Context<Stake>) -> Result<()> {
        hpl_hive_control::instructions::platform_gate(
            hpl_hive_control::constants::ACTIONS.public_low,
            &ctx.accounts.project,
            ctx.accounts.wallet.key(),
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            &None,
            ctx.accounts.system_program.to_account_info(),
        )?;

        instructions::stake(ctx)
    }

    pub fn unstake(ctx: Context<Unstake>) -> Result<()> {
        hpl_hive_control::instructions::platform_gate(
            hpl_hive_control::constants::ACTIONS.public_low,
            &ctx.accounts.project,
            ctx.accounts.wallet.key(),
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            &None,
            ctx.accounts.system_program.to_account_info(),
        )?;

        instructions::unstake(ctx)
    }

    pub fn fund_rewards(ctx: Context<FundRewards>, amount: u64) -> Result<()> {
        hpl_hive_control::instructions::platform_gate(
            hpl_hive_control::constants::ACTIONS.manage_staking_project,
            &ctx.accounts.project,
            ctx.accounts.wallet.key(),
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            &None,
            ctx.accounts.system_program.to_account_info(),
        )?;

        instructions::fund_rewards(ctx, amount)
    }

    pub fn withdraw_rewards(ctx: Context<WithdrawRewards>, amount: u64) -> Result<()> {
        hpl_hive_control::instructions::platform_gate(
            hpl_hive_control::constants::ACTIONS.withdraw_staking_rewards,
            &ctx.accounts.project,
            ctx.accounts.authority.key(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            &ctx.accounts.delegate_authority,
            ctx.accounts.system_program.to_account_info(),
        )?;

        instructions::withdraw_rewards(ctx, amount)
    }

    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
        hpl_hive_control::instructions::platform_gate(
            hpl_hive_control::constants::ACTIONS.public_high,
            &ctx.accounts.project,
            ctx.accounts.wallet.key(),
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            &None,
            ctx.accounts.system_program.to_account_info(),
        )?;

        instructions::claim_rewards(ctx)
    }

    pub fn migrate_custodial(ctx: Context<MigrateCustodial>, args: MigrateArgs) -> Result<()> {
        hpl_hive_control::instructions::platform_gate(
            hpl_hive_control::constants::ACTIONS.manage_staking_project,
            &ctx.accounts.project,
            ctx.accounts.authority.key(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            &ctx.accounts.delegate_authority,
            ctx.accounts.system_program.to_account_info(),
        )?;

        instructions::migrate_custodial(ctx, args)
    }
}
