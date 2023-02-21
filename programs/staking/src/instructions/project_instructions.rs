use {
    crate::state::*,
    anchor_lang::prelude::*,
    anchor_spl::token::{self, Mint, Token, TokenAccount},
    hpl_hive_control::{
        program::HplHiveControl,
        state::{DelegateAuthority, Project},
    },
    hpl_utils::traits::Default,
};

/// Accounts used in create staking_project instruction
#[derive(Accounts)]
pub struct CreateStakingProject<'info> {
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub key: AccountInfo<'info>,

    /// StakingProject state account
    #[account(
      init, payer = payer,
      space = StakingProject::LEN,
      seeds = [
        b"staking_project".as_ref(),
        project.key().as_ref(),
        key.key().as_ref()
      ],
      bump
    )]
    pub staking_project: Box<Account<'info, StakingProject>>,

    /// Reward mint address to be used for the staking_project
    pub reward_mint: Box<Account<'info, Mint>>,

    /// Reward token account used as vault
    #[account(
      init, payer = payer,
      seeds = [
        b"vault",
        staking_project.key().as_ref(),
        reward_mint.key().as_ref()
      ],
      bump,
      token::mint = reward_mint,
      token::authority = staking_project
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    /// The wallet that holds the authority over the assembler
    pub authority: Signer<'info>,

    /// The wallet that pays for the rent
    #[account(mut)]
    pub payer: Signer<'info>,

    /// NATIVE SYSTEM PROGRAM
    pub system_program: Program<'info, System>,

    /// SPL TOKEN PROGRAM
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,

    /// NATIVE RENT SYSVAR
    pub rent_sysvar: Sysvar<'info, Rent>,

    // HIVE CONTROL
    #[account()]
    pub project: Box<Account<'info, Project>>,
    #[account()]
    pub delegate_authority: Option<Account<'info, DelegateAuthority>>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub vault: AccountInfo<'info>,
    pub hive_control: Program<'info, HplHiveControl>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateStakingProjectArgs {
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

/// Create a new staking_project
pub fn create_staking_project(
    ctx: Context<CreateStakingProject>,
    args: CreateStakingProjectArgs,
) -> Result<()> {
    let staking_project = &mut ctx.accounts.staking_project;
    staking_project.set_defaults();

    staking_project.bump = ctx.bumps["staking_project"];
    staking_project.vault_bump = ctx.bumps["vault"];
    staking_project.project = ctx.accounts.project.key();
    staking_project.key = ctx.accounts.key.key();
    staking_project.reward_mint = ctx.accounts.reward_mint.key();
    staking_project.vault = ctx.accounts.reward_vault.key();
    staking_project.name = args.name;
    staking_project.lock_type = args.lock_type.unwrap_or(LockType::Freeze);
    staking_project.rewards_per_duration = args.rewards_per_duration;
    staking_project.rewards_duration = args.rewards_duration.unwrap_or(1);
    staking_project.max_rewards_duration = args.max_rewards_duration;
    staking_project.min_stake_duration = args.min_stake_duration;
    staking_project.cooldown_duration = args.cooldown_duration;
    staking_project.reset_stake_duration = args.reset_stake_duration.unwrap_or(true);
    staking_project.start_time = args.start_time;
    staking_project.end_time = args.end_time;

    Ok(())
}

/// Accounts used in update staking_project instruction
#[derive(Accounts)]
pub struct UpdateStakingProject<'info> {
    /// StakingProject state account
    #[account(mut, has_one = project)]
    pub staking_project: Account<'info, StakingProject>,

    /// Collection mint address to be used for the staking_project
    pub collection: Option<Account<'info, Mint>>,

    /// Creator address to be used for the staking_project
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub creator: Option<AccountInfo<'info>>,

    /// The wallet that holds authority for this action
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The wallet that pays for the rent
    #[account(mut)]
    pub payer: Signer<'info>,

    /// NATIVE SYSTEM PROGRAM
    pub system_program: Program<'info, System>,

    /// SYSVAR RENT
    pub rent: Sysvar<'info, Rent>,

    // HIVE CONTROL
    #[account()]
    pub project: Box<Account<'info, Project>>,
    #[account()]
    pub delegate_authority: Option<Account<'info, DelegateAuthority>>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub vault: AccountInfo<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdateStakingProjectArgs {
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

/// Update a staking_project
pub fn update_staking_project(
    ctx: Context<UpdateStakingProject>,
    args: UpdateStakingProjectArgs,
) -> Result<()> {
    let staking_project = &mut ctx.accounts.staking_project;

    staking_project.name = args.name.unwrap_or(staking_project.name.clone());
    staking_project.rewards_per_duration = args
        .rewards_per_duration
        .unwrap_or(staking_project.rewards_per_duration);
    staking_project.rewards_duration = args
        .rewards_duration
        .unwrap_or(staking_project.rewards_duration);

    staking_project.max_rewards_duration = if args.max_rewards_duration.is_some() {
        args.max_rewards_duration
    } else {
        staking_project.max_rewards_duration
    };
    staking_project.min_stake_duration = if args.min_stake_duration.is_some() {
        args.min_stake_duration
    } else {
        staking_project.min_stake_duration
    };
    staking_project.cooldown_duration = if args.cooldown_duration.is_some() {
        args.cooldown_duration
    } else {
        staking_project.cooldown_duration
    };
    staking_project.reset_stake_duration = args
        .reset_stake_duration
        .unwrap_or(staking_project.reset_stake_duration);
    staking_project.start_time = if args.start_time.is_some() {
        args.start_time
    } else {
        staking_project.start_time
    };
    staking_project.end_time = if args.end_time.is_some() {
        args.end_time
    } else {
        staking_project.end_time
    };

    if let Some(collection) = &ctx.accounts.collection {
        hpl_utils::reallocate(
            1,
            staking_project.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            &ctx.accounts.rent,
            &ctx.accounts.system_program,
        )?;
        staking_project.collections.push(collection.key());
    }

    if let Some(creator) = &ctx.accounts.creator {
        hpl_utils::reallocate(
            1,
            staking_project.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            &ctx.accounts.rent,
            &ctx.accounts.system_program,
        )?;
        staking_project.creators.push(creator.key());
    }

    Ok(())
}
