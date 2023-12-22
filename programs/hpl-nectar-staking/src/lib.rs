pub mod bubblegum;
pub mod errors;
pub mod instructions;
pub mod state;

use {anchor_lang::prelude::*, instructions::*, state::NFTUsedBy};

declare_id!("MiNESdRXUSmWY7NkAKdW9nMkjJZCaucguY3MDvkSmr6");
hpl_macros::platform_gate!();

#[program]
pub mod hpl_nectar_staking {
    use super::*;

    pub fn create_staking_pool(
        ctx: Context<CreateStakingPool>,
        args: CreateStakingPoolArgs,
    ) -> Result<()> {
        hpl_macros::add_service!(hpl_hive_control::state::Service::Staking {
            pool_id: ctx.accounts.staking_pool.key(),
        });

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

    pub fn init_nft(ctx: Context<InitNFT>) -> Result<()> {
        msg!("Initializing NFT");
        platform_gate_cpi(
            hpl_hive_control::state::SerializableActions::PublicLow,
            None,
            ctx.accounts.project.to_account_info(),
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            &ctx.accounts.delegate_authority,
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.hive_control.to_account_info(),
            ctx.accounts.instructions_sysvar.to_account_info(),
        )?;

        instructions::init_nft(ctx)
    }

    pub fn init_cnft<'info>(
        ctx: Context<'_, '_, '_, 'info, InitCNFT<'info>>,
        args: CNFTArgs,
    ) -> Result<()> {
        msg!("Initializing cNFT");
        platform_gate_cpi(
            hpl_hive_control::state::SerializableActions::PublicLow,
            None,
            ctx.accounts.project.to_account_info(),
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            &ctx.accounts.delegate_authority,
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.hive_control.to_account_info(),
            ctx.accounts.instructions_sysvar.to_account_info(),
        )?;

        instructions::init_cnft(ctx, args)
    }

    pub fn use_nft<'info>(ctx: Context<UseNft>, used_by: NFTUsedBy) -> Result<()> {
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

        instructions::use_nft(ctx, used_by)
    }

    pub fn close_nft(ctx: Context<CloseNft>) -> Result<()> {
        platform_gate_cpi(
            hpl_hive_control::state::SerializableActions::ManageStakingPool,
            None,
            ctx.accounts.project.to_account_info(),
            ctx.accounts.authority.to_account_info(),
            ctx.accounts.authority.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            &None,
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.hive_control.to_account_info(),
            ctx.accounts.instructions_sysvar.to_account_info(),
        )?;

        instructions::close_nft(ctx)
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

    pub fn stake(ctx: Context<Stake>) -> Result<()> {
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

        instructions::stake(ctx)
    }

    pub fn unstake(ctx: Context<Unstake>) -> Result<()> {
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

        instructions::unstake(ctx)
    }

    pub fn stake_cnft<'info>(
        ctx: Context<'_, '_, '_, 'info, StakeCNFT<'info>>,
        args: CNFTArgs,
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

        instructions::stake_cnft(ctx, args)
    }

    pub fn unstake_cnft<'info>(
        ctx: Context<'_, '_, '_, 'info, UnstakeCNFT<'info>>,
        args: CNFTArgs,
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

        instructions::unstake_cnft(ctx, args)
    }

    pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
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

        instructions::claim_rewards(ctx)
    }

    pub fn distribute_rewards(ctx: Context<DistriuteRewards>) -> Result<()> {
        platform_gate_cpi(
            hpl_hive_control::state::SerializableActions::ManageStakingPool,
            None,
            ctx.accounts.project.to_account_info(),
            ctx.accounts.authority.to_account_info(),
            ctx.accounts.authority.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            &None,
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.hive_control.to_account_info(),
            ctx.accounts.instructions_sysvar.to_account_info(),
        )?;

        instructions::distribute_rewards(ctx)
    }
}
