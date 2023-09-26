use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;
pub mod utils;

declare_id!("HuntaX1CmUt5EByyFPE8pMf13SpvezybmMTtjmpmGmfj");

use instructions::*;

#[program]
pub mod hpl_nectar_missions {
    use super::*;

    pub fn create_mission_pool(
        ctx: Context<CreateMissionPool>,
        args: CreateMissionPoolArgs,
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
                        Some(ctx.accounts.hive_control.to_account_info())
                    },
                    authority: ctx.accounts.authority.to_account_info(),
                    payer: ctx.accounts.payer.to_account_info(),
                    system_program: ctx.accounts.system_program.to_account_info(),
                    hpl_events: ctx.accounts.hpl_events.to_account_info(),
                    clock: ctx.accounts.clock_sysvar.to_account_info(),
                    rent_sysvar: ctx.accounts.rent_sysvar.to_account_info(),
                    instructions_sysvar: ctx.accounts.instructions_sysvar.to_account_info(),
                    vault: ctx.accounts.vault.to_account_info(),
                },
            ),
            hpl_hive_control::instructions::AddRemoveServiceArgs {
                service: hpl_hive_control::state::Service::Missions {
                    pool_id: ctx.accounts.mission_pool.key(),
                },
                remove: Some(false),
            },
        )?;

        instructions::create_mission_pool(ctx, args)
    }

    pub fn update_mission_pool(
        ctx: Context<UpdateMissionPool>,
        args: UpdateMissionPoolArgs,
    ) -> Result<()> {
        hpl_hive_control::instructions::platform_gate_fn(
            hpl_hive_control::constants::ACTIONS.manage_mission_pool,
            None,
            &ctx.accounts.project,
            ctx.accounts.authority.key(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            &ctx.accounts.delegate_authority,
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.instructions_sysvar.to_account_info(),
        )?;
        instructions::update_mission_pool(ctx, args)
    }

    pub fn create_mission(ctx: Context<CreateMission>, args: CreateMissionArgs) -> Result<()> {
        hpl_hive_control::instructions::platform_gate_fn(
            hpl_hive_control::constants::ACTIONS.manage_mission_pool,
            None,
            &ctx.accounts.project,
            ctx.accounts.authority.key(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            &ctx.accounts.delegate_authority,
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.instructions_sysvar.to_account_info(),
        )?;
        instructions::create_mission(ctx, args)
    }

    pub fn update_mission(ctx: Context<UpdateMission>, args: UpdateMissionArgs) -> Result<()> {
        hpl_hive_control::instructions::platform_gate_fn(
            hpl_hive_control::constants::ACTIONS.manage_mission_pool,
            None,
            &ctx.accounts.project,
            ctx.accounts.authority.key(),
            ctx.accounts.payer.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            &ctx.accounts.delegate_authority,
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.instructions_sysvar.to_account_info(),
        )?;
        instructions::update_mission(ctx, args)
    }

    pub fn participate(ctx: Context<Participate>, args: ParticipateArgs) -> Result<()> {
        hpl_hive_control::instructions::platform_gate_fn(
            hpl_hive_control::constants::ACTIONS.public_high,
            None,
            &ctx.accounts.project,
            ctx.accounts.wallet.key(),
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            &None,
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.instructions_sysvar.to_account_info(),
        )?;

        instructions::participate(ctx, args)
    }

    pub fn collect_rewards(ctx: Context<CollectRewards>) -> Result<()> {
        hpl_hive_control::instructions::platform_gate_fn(
            hpl_hive_control::constants::ACTIONS.fee_exempt,
            None,
            &ctx.accounts.project,
            ctx.accounts.wallet.key(),
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            &None,
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.instructions_sysvar.to_account_info(),
        )?;

        instructions::collect_rewards(ctx)
    }

    pub fn recall(ctx: Context<Recall>) -> Result<()> {
        hpl_hive_control::instructions::platform_gate_fn(
            hpl_hive_control::constants::ACTIONS.fee_exempt,
            None,
            &ctx.accounts.project,
            ctx.accounts.wallet.key(),
            ctx.accounts.wallet.to_account_info(),
            ctx.accounts.vault.to_account_info(),
            &None,
            ctx.accounts.system_program.to_account_info(),
            ctx.accounts.instructions_sysvar.to_account_info(),
        )?;

        instructions::recall(ctx)
    }

    pub fn fix_vault(ctx: Context<FixVault>) -> Result<()> {
        instructions::fix_vault(ctx)
    }
}
