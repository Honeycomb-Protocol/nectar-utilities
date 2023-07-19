use {
    crate::state::*,
    anchor_lang::prelude::*,
    hpl_hive_control::state::{DelegateAuthority, Project},
    hpl_utils::traits::Default,
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

    /// RENT SYSVAR
    pub rent_sysvar: Sysvar<'info, Rent>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateMissionArgs {
    pub name: String,
    pub min_xp: u64,
    pub cost: Currency,
    /// The duration of the mission in seconds
    pub duration: i64,
    pub rewards: Vec<Reward>,
}

/// Create a new mission
pub fn create_mission(ctx: Context<CreateMission>, args: CreateMissionArgs) -> Result<()> {
    let mission = &mut ctx.accounts.mission;
    mission.set_defaults();

    mission.bump = ctx.bumps["mission"];
    mission.mission_pool = ctx.accounts.mission_pool.key();
    mission.name = args.name;
    mission.min_xp = args.min_xp;
    mission.cost = args.cost;
    mission.duration = args.duration;

    hpl_utils::reallocate(
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
