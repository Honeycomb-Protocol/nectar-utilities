use {
    crate::state::*,
    anchor_lang::prelude::*,
    hpl_hive_control::{
        program::HplHiveControl,
        state::{DelegateAuthority, Project},
    },
};

/// Accounts used in create mission instruction
#[derive(Accounts)]
#[instruction(args: CreateMissionArgs)]
pub struct CreateMission<'info> {
    #[account()]
    pub project: Box<Account<'info, Project>>,

    /// Mission state account
    #[account(has_one = project)]
    pub mission_pool: Box<Account<'info, MissionPool>>,

    /// Mission state account
    #[account(
        init, payer = payer,
        space = Mission::LEN,
        seeds = [
          b"mission".as_ref(),
          mission_pool.key().as_ref(),
          args.name.as_bytes(),
        ],
        bump
      )]
    pub mission: Box<Account<'info, Mission>>,

    /// [Option] Project delegate authority
    #[account(has_one = authority)]
    pub delegate_authority: Option<Account<'info, DelegateAuthority>>,

    /// The wallet that holds the authority over the assembler
    pub authority: Signer<'info>,

    /// The wallet that pays for the rent
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub vault: AccountInfo<'info>,

    /// SYSTEM PROGRAM
    pub system_program: Program<'info, System>,

    /// HPL Hive Control Program
    pub hive_control: Program<'info, HplHiveControl>,

    /// RENT SYSVAR
    pub rent_sysvar: Sysvar<'info, Rent>,

    /// NATIVE INSTRUCTIONS SYSVAR
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateMissionArgs {
    pub name: String,
    pub min_xp: u64,
    pub cost: Currency,
    pub requirement: MissionRequirement,
    pub rewards: Vec<Reward>,
}

/// Create a new mission
pub fn create_mission(ctx: Context<CreateMission>, args: CreateMissionArgs) -> Result<()> {
    let mission = &mut ctx.accounts.mission;
    mission.set_defaults();

    mission.bump = ctx.bumps.mission;
    mission.project = ctx.accounts.project.key();
    mission.mission_pool = ctx.accounts.mission_pool.key();
    mission.name = args.name;
    mission.min_xp = args.min_xp;
    mission.cost = args.cost;
    mission.requirement = args.requirement;

    hpl_toolkit::utils::reallocate(
        (Reward::LEN * args.rewards.len()) as isize,
        mission.to_account_info(),
        ctx.accounts.payer.to_account_info(),
        &ctx.accounts.rent_sysvar,
        &ctx.accounts.system_program,
    )?;

    mission.rewards = args.rewards;

    // msg!("JSON Mission: {:?}", mission);
    Ok(())
}

/// Accounts used in create mission instruction
#[derive(Accounts)]
pub struct UpdateMission<'info> {
    #[account()]
    pub project: Box<Account<'info, Project>>,

    /// Missions pool account
    #[account(has_one = project)]
    pub mission_pool: Box<Account<'info, MissionPool>>,

    /// Mission state account
    #[account(mut, has_one = mission_pool)]
    pub mission: Box<Account<'info, Mission>>,

    /// [Option] Project delegate authority
    #[account(has_one = authority)]
    pub delegate_authority: Option<Account<'info, DelegateAuthority>>,

    /// The wallet that holds the authority over the assembler
    pub authority: Signer<'info>,

    /// The wallet that pays for the rent
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub vault: AccountInfo<'info>,

    /// SYSTEM PROGRAM
    pub system_program: Program<'info, System>,

    /// HPL Hive Control Program
    pub hive_control: Program<'info, HplHiveControl>,

    /// RENT SYSVAR
    pub rent_sysvar: Sysvar<'info, Rent>,

    /// NATIVE INSTRUCTIONS SYSVAR
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdateMissionArgs {
    pub name: Option<String>,
    pub min_xp: Option<u64>,
    pub cost: Option<Currency>,
    /// The duration of the mission in seconds
    pub requirement: Option<MissionRequirement>,
    pub remove_all_rewards: Option<bool>,
    pub add_rewards: Option<Vec<Reward>>,
    pub remove_reward_indices: Option<Vec<u8>>,
}

/// Create a new mission
pub fn update_mission(ctx: Context<UpdateMission>, args: UpdateMissionArgs) -> Result<()> {
    let mission = &mut ctx.accounts.mission;
    mission.name = args.name.unwrap_or(mission.name.clone());
    mission.min_xp = args.min_xp.unwrap_or(mission.min_xp);
    mission.cost = args.cost.unwrap_or(mission.cost.clone());
    mission.requirement = args.requirement.unwrap_or(mission.requirement.clone());

    if args.remove_all_rewards.is_some() && args.remove_all_rewards.unwrap() {
        let curr_len = mission.rewards.len();
        mission.rewards = vec![];
        let diff = curr_len - mission.rewards.len();
        hpl_toolkit::utils::reallocate(
            (Reward::LEN * diff) as isize * -1,
            mission.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            &ctx.accounts.rent_sysvar,
            &ctx.accounts.system_program,
        )?;
    } else if let Some(indices) = args.remove_reward_indices {
        let curr_len = mission.rewards.len();
        mission.rewards = mission
            .rewards
            .iter()
            .enumerate()
            .filter(|(i, _)| indices.contains(&(*i as u8)))
            .map(|(_, val)| val.clone())
            .collect::<Vec<_>>();

        let diff = curr_len - mission.rewards.len();
        hpl_toolkit::utils::reallocate(
            (Reward::LEN * diff) as isize * -1,
            mission.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            &ctx.accounts.rent_sysvar,
            &ctx.accounts.system_program,
        )?;
    }

    if let Some(rewards) = args.add_rewards {
        hpl_toolkit::utils::reallocate(
            (Reward::LEN * rewards.len()) as isize,
            mission.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            &ctx.accounts.rent_sysvar,
            &ctx.accounts.system_program,
        )?;

        let mut temp = rewards.clone();
        mission.rewards.append(&mut temp);
    }

    Ok(())
}
