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

/// Accounts used in create staking_pool instruction
#[derive(Accounts)]
pub struct CreateStakingPool<'info> {
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub key: AccountInfo<'info>,

    /// StakingPool state account
    #[account(
      init, payer = payer,
      space = StakingPool::LEN,
      seeds = [
        b"staking_pool".as_ref(),
        project.key().as_ref(),
        key.key().as_ref()
      ],
      bump
    )]
    pub staking_pool: Box<Account<'info, StakingPool>>,

    /// Reward mint address to be used for the staking_pool
    pub reward_mint: Box<Account<'info, Mint>>,

    /// Reward token account used as vault
    #[account(
      init, payer = payer,
      seeds = [
        b"vault",
        staking_pool.key().as_ref(),
        reward_mint.key().as_ref()
      ],
      bump,
      token::mint = reward_mint,
      token::authority = staking_pool
    )]
    pub reward_vault: Account<'info, TokenAccount>,

    /// HIVE CONTROL
    #[account(mut)]
    pub project: Box<Account<'info, Project>>,

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

    /// SPL TOKEN PROGRAM
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,

    /// HIVE CONTROL PROGRAM
    pub hive_control: Program<'info, HplHiveControl>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateStakingPoolArgs {
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

/// Create a new staking_pool
pub fn create_staking_pool(
    ctx: Context<CreateStakingPool>,
    args: CreateStakingPoolArgs,
) -> Result<()> {
    let staking_pool = &mut ctx.accounts.staking_pool;
    staking_pool.set_defaults();

    staking_pool.bump = ctx.bumps["staking_pool"];
    staking_pool.vault_bump = ctx.bumps["reward_vault"];
    staking_pool.project = ctx.accounts.project.key();
    staking_pool.key = ctx.accounts.key.key();
    staking_pool.reward_mint = ctx.accounts.reward_mint.key();
    staking_pool.vault = ctx.accounts.reward_vault.key();
    staking_pool.name = args.name;
    staking_pool.lock_type = args.lock_type.unwrap_or(LockType::Freeze);
    staking_pool.rewards_per_duration = args.rewards_per_duration;
    staking_pool.rewards_duration = args.rewards_duration.unwrap_or(1);
    staking_pool.max_rewards_duration = args.max_rewards_duration;
    staking_pool.min_stake_duration = args.min_stake_duration;
    staking_pool.cooldown_duration = args.cooldown_duration;
    staking_pool.reset_stake_duration = args.reset_stake_duration.unwrap_or(true);
    staking_pool.start_time = args.start_time;
    staking_pool.end_time = args.end_time;

    Ok(())
}

/// Accounts used in update staking_pool instruction
#[derive(Accounts)]
pub struct UpdateStakingPool<'info> {
    /// StakingPool state account
    #[account(mut, has_one = project)]
    pub staking_pool: Account<'info, StakingPool>,

    /// Collection mint address to be used for the staking_pool
    pub collection: Option<Account<'info, Mint>>,

    /// Creator address to be used for the staking_pool
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
    #[account(has_one = authority)]
    pub delegate_authority: Option<Account<'info, DelegateAuthority>>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub vault: AccountInfo<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdateStakingPoolArgs {
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

/// Update a staking_pool
pub fn update_staking_pool(
    ctx: Context<UpdateStakingPool>,
    args: UpdateStakingPoolArgs,
) -> Result<()> {
    let staking_pool = &mut ctx.accounts.staking_pool;

    staking_pool.name = args.name.unwrap_or(staking_pool.name.clone());
    staking_pool.rewards_per_duration = args
        .rewards_per_duration
        .unwrap_or(staking_pool.rewards_per_duration);
    staking_pool.rewards_duration = args
        .rewards_duration
        .unwrap_or(staking_pool.rewards_duration);

    staking_pool.max_rewards_duration = if args.max_rewards_duration.is_some() {
        args.max_rewards_duration
    } else {
        staking_pool.max_rewards_duration
    };
    staking_pool.min_stake_duration = if args.min_stake_duration.is_some() {
        args.min_stake_duration
    } else {
        staking_pool.min_stake_duration
    };
    staking_pool.cooldown_duration = if args.cooldown_duration.is_some() {
        args.cooldown_duration
    } else {
        staking_pool.cooldown_duration
    };
    staking_pool.reset_stake_duration = args
        .reset_stake_duration
        .unwrap_or(staking_pool.reset_stake_duration);
    staking_pool.start_time = if args.start_time.is_some() {
        args.start_time
    } else {
        staking_pool.start_time
    };
    staking_pool.end_time = if args.end_time.is_some() {
        args.end_time
    } else {
        staking_pool.end_time
    };

    if let Some(collection) = &ctx.accounts.collection {
        let index = ctx
            .accounts
            .project
            .collections
            .iter()
            .position(|x| x.eq(&collection.key()))
            .unwrap();
        hpl_utils::reallocate(
            1,
            staking_pool.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            &ctx.accounts.rent,
            &ctx.accounts.system_program,
        )?;
        staking_pool.collections.push(index as u8);
    }

    if let Some(creator) = &ctx.accounts.creator {
        let index = ctx
            .accounts
            .project
            .creators
            .iter()
            .position(|x| x.eq(&creator.key()))
            .unwrap();
        hpl_utils::reallocate(
            1,
            staking_pool.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            &ctx.accounts.rent,
            &ctx.accounts.system_program,
        )?;
        staking_pool.creators.push(index as u8);
    }

    Ok(())
}
