pub mod errors;
pub mod instructions;
pub mod state;

use {anchor_lang::prelude::*, instructions::*};

declare_id!("MiNESdRXUSmWY7NkAKdW9nMkjJZCaucguY3MDvkSmr6");
hpl_toolkit::platform_gate!();

#[cfg(not(feature = "cpi"))]
use hpl_toolkit::schema::*;
#[cfg_attr(
    not(feature = "cpi"),
    account_schemas_ix_injector(StakingPool, Multipliers, Staker)
)]
#[program]
pub mod hpl_nectar_staking {
    use super::*;

    pub fn create_staking_pool(
        ctx: Context<CreateStakingPool>,
        args: CreateStakingPoolArgs,
    ) -> Result<()> {
        // hpl_toolkit::add_service!(hpl_hive_control::state::Service::Staking {
        //     pool_id: ctx.accounts.staking_pool.key(),
        // });

        instructions::create_staking_pool(ctx, args)
    }

    pub fn update_staking_pool(
        ctx: Context<UpdateStakingPool>,
        args: UpdateStakingPoolArgs,
    ) -> Result<()> {
        platform_gate_cpi(
            hpl_hive_control::state::SerializableActions::ManageStakingPool,
            None,
            ctx.accounts.project.to_account_info(),
            ctx.accounts.authority.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            &ctx.accounts.delegate_authority,
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.hive_control.to_account_info(),
            ctx.accounts.instructions_sysvar.to_account_info(),
        )?;

        instructions::update_staking_pool(ctx, args)
    }

    pub fn init_multipliers(
        ctx: Context<InitMultipliers>,
        args: InitMultipliersArgs,
    ) -> Result<()> {
        platform_gate_cpi(
            hpl_hive_control::state::SerializableActions::ManageStakingPool,
            None,
            ctx.accounts.project.to_account_info(),
            ctx.accounts.authority.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            &ctx.accounts.delegate_authority,
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.hive_control.to_account_info(),
            ctx.accounts.instructions_sysvar.to_account_info(),
        )?;

        instructions::init_multipliers(ctx, args)
    }

    pub fn add_multiplier(ctx: Context<AddMultiplier>, args: AddMultiplierArgs) -> Result<()> {
        platform_gate_cpi(
            hpl_hive_control::state::SerializableActions::ManageStakingPool,
            None,
            ctx.accounts.project.to_account_info(),
            ctx.accounts.authority.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            &ctx.accounts.delegate_authority,
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.hive_control.to_account_info(),
            ctx.accounts.instructions_sysvar.to_account_info(),
        )?;

        instructions::add_multiplier(ctx, args)
    }

    pub fn init_staker(ctx: Context<InitStaker>) -> Result<()> {
        platform_gate_cpi(
            hpl_hive_control::state::SerializableActions::PublicLow,
            None,
            ctx.accounts.project.to_account_info(),
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            &None,
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.hive_control.to_account_info(),
            ctx.accounts.instructions_sysvar.to_account_info(),
        )?;

        instructions::init_staker(ctx)
    }

    pub fn stake<'info>(
        ctx: Context<'_, '_, '_, 'info, Stake<'info>>,
        args: StakeArgs,
    ) -> Result<()> {
        platform_gate_cpi(
            hpl_hive_control::state::SerializableActions::PublicLow,
            None,
            ctx.accounts.project.to_account_info(),
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            &None,
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.hive_control.to_account_info(),
            ctx.accounts.instructions_sysvar.to_account_info(),
        )?;

        instructions::stake(ctx, args)
    }

    pub fn unstake<'info>(
        ctx: Context<'_, '_, '_, 'info, Unstake<'info>>,
        args: StakeArgs,
    ) -> Result<()> {
        platform_gate_cpi(
            hpl_hive_control::state::SerializableActions::PublicLow,
            None,
            ctx.accounts.project.to_account_info(),
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            &None,
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.hive_control.to_account_info(),
            ctx.accounts.instructions_sysvar.to_account_info(),
        )?;

        instructions::unstake(ctx, args)
    }

    pub fn claim_rewards<'info>(
        ctx: Context<'_, '_, '_, 'info, ClaimRewards<'info>>,
        args: ClaimRewardsArgs,
    ) -> Result<()> {
        platform_gate_cpi(
            hpl_hive_control::state::SerializableActions::FeeExempt,
            None,
            ctx.accounts.project.to_account_info(),
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            &None,
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.hive_control.to_account_info(),
            ctx.accounts.instructions_sysvar.to_account_info(),
        )?;

        instructions::claim_rewards(ctx, args)
    }
}
