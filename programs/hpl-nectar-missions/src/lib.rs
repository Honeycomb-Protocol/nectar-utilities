use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;
pub mod utils;

declare_id!("HuntaX1CmUt5EByyFPE8pMf13SpvezybmMTtjmpmGmfj");

use instructions::*;
hpl_macros::platform_gate!();

#[program]
pub mod hpl_nectar_missions {
    use super::*;

    pub fn create_mission_pool(
        ctx: Context<CreateMissionPool>,
        args: CreateMissionPoolArgs,
    ) -> Result<()> {
        hpl_macros::add_service!(hpl_hive_control::state::Service::Missions {
            pool_id: ctx.accounts.mission_pool.key(),
        });

        instructions::create_mission_pool(ctx, args)
    }

    pub fn update_mission_pool(
        ctx: Context<UpdateMissionPool>,
        args: UpdateMissionPoolArgs,
    ) -> Result<()> {
        platform_gate_cpi(
            hpl_hive_control::state::SerializableActions::ManageMissionPool,
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
        instructions::update_mission_pool(ctx, args)
    }

    pub fn create_mission(ctx: Context<CreateMission>, args: CreateMissionArgs) -> Result<()> {
        platform_gate_cpi(
            hpl_hive_control::state::SerializableActions::ManageMissionPool,
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
        instructions::create_mission(ctx, args)
    }

    pub fn update_mission(ctx: Context<UpdateMission>, args: UpdateMissionArgs) -> Result<()> {
        platform_gate_cpi(
            hpl_hive_control::state::SerializableActions::ManageMissionPool,
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
        instructions::update_mission(ctx, args)
    }

    pub fn participate(ctx: Context<Participate>, args: ParticipateArgs) -> Result<()> {
        platform_gate_cpi(
            hpl_hive_control::state::SerializableActions::PublicHigh,
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

        instructions::participate(ctx, args)
    }

    pub fn collect_rewards(ctx: Context<CollectRewards>) -> Result<()> {
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

        instructions::collect_rewards(ctx)
    }

    pub fn recall(ctx: Context<Recall>) -> Result<()> {
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

        instructions::recall(ctx)
    }
}
