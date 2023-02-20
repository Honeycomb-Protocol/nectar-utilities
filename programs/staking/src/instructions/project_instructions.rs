use {
    crate::{state::*, traits::Default},
    anchor_lang::prelude::*,
    anchor_spl::token::{self, Mint, Token, TokenAccount},
};

/// Accounts used in create project instruction
#[derive(Accounts)]
pub struct CreateProject<'info> {
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub key: AccountInfo<'info>,

    /// Project state account
    #[account(
      init, payer = payer,
      space = Project::LEN,
      seeds = [
        b"project".as_ref(),
        key.key().as_ref()
      ],
      bump
    )]
    pub project: Account<'info, Project>,

    /// The wallet that holds the authority over the assembler
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub authority: AccountInfo<'info>,

    /// Reward mint address to be used for the project
    pub reward_mint: Account<'info, Mint>,

    /// Reward token account used as vault
    #[account(
      init, payer = payer,
      seeds = [
        b"vault",
        project.key().as_ref(),
        reward_mint.key().as_ref()
      ],
      bump,
      token::mint = reward_mint,
      token::authority = project
    )]
    pub vault: Account<'info, TokenAccount>,

    /// The wallet that pays for the rent
    #[account(mut)]
    pub payer: Signer<'info>,

    /// NATIVE SYSTEM PROGRAM
    pub system_program: Program<'info, System>,

    /// SPL TOKEN PROGRAM
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateProjectArgs {
    pub name: String,
    pub lock_type: Option<LockType>,
    pub rewards_per_duration: u64,
    pub rewards_duration: Option<u64>,
    pub max_rewards_duration: Option<u64>,
    pub min_stake_duration: Option<u64>,
    pub cooldown_duration: Option<u64>,
    pub reset_stake_duration: Option<bool>,
    pub start_time: Option<i64>,
    pub end_time: Option<i64>,
}

/// Create a new project
pub fn create_project(ctx: Context<CreateProject>, args: CreateProjectArgs) -> Result<()> {
    let project = &mut ctx.accounts.project;
    project.set_defaults();

    project.bump = ctx.bumps["project"];
    project.vault_bump = ctx.bumps["vault"];
    project.key = ctx.accounts.key.key();
    project.authority = ctx.accounts.authority.key();
    project.reward_mint = ctx.accounts.reward_mint.key();
    project.vault = ctx.accounts.vault.key();
    project.name = args.name;
    project.lock_type = args.lock_type.unwrap_or(LockType::Freeze);
    project.rewards_per_duration = args.rewards_per_duration;
    project.rewards_duration = args.rewards_duration.unwrap_or(1);
    project.max_rewards_duration = args.max_rewards_duration;
    project.min_stake_duration = args.min_stake_duration;
    project.cooldown_duration = args.cooldown_duration;
    project.reset_stake_duration = args.reset_stake_duration.unwrap_or(true);
    project.start_time = args.start_time;
    project.end_time = args.end_time;

    Ok(())
}

/// Accounts used in update project instruction
#[derive(Accounts)]
pub struct UpdateProject<'info> {
    /// Project state account
    #[account(mut, has_one = authority)]
    pub project: Account<'info, Project>,

    /// The wallet that holds the authority over the assembler
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub new_authority: Option<AccountInfo<'info>>,

    /// Collection mint address to be used for the project
    pub collection: Option<Account<'info, Mint>>,

    /// Creator address to be used for the project
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub creator: Option<AccountInfo<'info>>,

    /// The wallet that pays for the rent
    #[account(mut)]
    pub authority: Signer<'info>,

    /// NATIVE SYSTEM PROGRAM
    pub system_program: Program<'info, System>,

    /// SYSVAR RENT
    pub rent: Sysvar<'info, Rent>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdateProjectArgs {
    pub name: Option<String>,
    pub rewards_per_duration: Option<u64>,
    pub rewards_duration: Option<u64>,
    pub max_rewards_duration: Option<u64>,
    pub min_stake_duration: Option<u64>,
    pub cooldown_duration: Option<u64>,
    pub reset_stake_duration: Option<bool>,
    pub start_time: Option<i64>,
    pub end_time: Option<i64>,
}

/// Update a project
pub fn update_project(ctx: Context<UpdateProject>, args: UpdateProjectArgs) -> Result<()> {
    let project = &mut ctx.accounts.project;

    project.name = args.name.unwrap_or(project.name.clone());
    project.rewards_per_duration = args
        .rewards_per_duration
        .unwrap_or(project.rewards_per_duration);
    project.rewards_duration = args.rewards_duration.unwrap_or(project.rewards_duration);

    project.max_rewards_duration = if args.max_rewards_duration.is_some() {
        args.max_rewards_duration
    } else {
        project.max_rewards_duration
    };
    project.min_stake_duration = if args.min_stake_duration.is_some() {
        args.min_stake_duration
    } else {
        project.min_stake_duration
    };
    project.cooldown_duration = if args.cooldown_duration.is_some() {
        args.cooldown_duration
    } else {
        project.cooldown_duration
    };
    project.reset_stake_duration = args
        .reset_stake_duration
        .unwrap_or(project.reset_stake_duration);
    project.start_time = if args.start_time.is_some() {
        args.start_time
    } else {
        project.start_time
    };
    project.end_time = if args.end_time.is_some() {
        args.end_time
    } else {
        project.end_time
    };

    if let Some(new_authority) = &ctx.accounts.new_authority {
        project.authority = new_authority.key();
    }

    if let Some(collection) = &ctx.accounts.collection {
        hpl_utils::reallocate(
            1,
            project.to_account_info(),
            ctx.accounts.authority.to_account_info(),
            &ctx.accounts.rent,
            &ctx.accounts.system_program,
        )?;
        project.collections.push(collection.key());
    }

    if let Some(creator) = &ctx.accounts.creator {
        hpl_utils::reallocate(
            1,
            project.to_account_info(),
            ctx.accounts.authority.to_account_info(),
            &ctx.accounts.rent,
            &ctx.accounts.system_program,
        )?;
        project.creators.push(creator.key());
    }

    Ok(())
}
