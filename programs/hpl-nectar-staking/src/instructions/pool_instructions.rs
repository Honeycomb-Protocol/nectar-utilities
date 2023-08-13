use {
    crate::state::*,
    anchor_lang::prelude::*,
    anchor_spl::token::{self, Mint, Token},
    hpl_currency_manager::state::Currency,
    hpl_hive_control::{
        program::HplHiveControl,
        state::{DelegateAuthority, Project},
    },
    hpl_utils::traits::Default,
    spl_account_compression::Noop,
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

    /// Currency to be used for the staking_pool
    pub currency: Box<Account<'info, Currency>>,

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

    /// SPL NO OP PROGRAM
    pub log_wrapper: Program<'info, Noop>,

    /// SYSVAR CLOCK
    pub clock_sysvar: Sysvar<'info, Clock>,

    /// RENT SYSVAR
    pub rent_sysvar: Sysvar<'info, Rent>,

    /// NATIVE INSTRUCTIONS SYSVAR
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,

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
    staking_pool.project = ctx.accounts.project.key();
    staking_pool.key = ctx.accounts.key.key();
    staking_pool.currency = ctx.accounts.currency.key();
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

    /// Merkle tree address for cNFTs
    /// CHECK: This account is modified in the downstream program
    pub merkle_tree: Option<AccountInfo<'info>>,

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

    /// NATIVE INSTRUCTIONS SYSVAR
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,

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

    if let Some(merkle_tree) = &ctx.accounts.merkle_tree {
        hpl_utils::reallocate(
            32,
            staking_pool.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            &ctx.accounts.rent,
            &ctx.accounts.system_program,
        )?;
        staking_pool.merkle_trees.push(merkle_tree.key());
    }

    Ok(())
}
