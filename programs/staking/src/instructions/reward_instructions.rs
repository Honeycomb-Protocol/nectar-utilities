use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer},
    hpl_hive_control::state::{DelegateAuthority, Project},
};

/// Accounts used in fund rewards instruction
#[derive(Accounts)]
pub struct FundRewards<'info> {
    /// StakingProject state account
    #[account(has_one = project)]
    pub staking_project: Account<'info, StakingProject>,

    /// Mint address of the reward token
    #[account(mut, constraint = reward_mint.key() == staking_project.reward_mint)]
    pub reward_mint: Account<'info, Mint>,

    /// Reward Vault
    #[account(mut, constraint = reward_vault.key() == staking_project.vault)]
    pub reward_vault: Account<'info, TokenAccount>,

    /// Payee token account
    #[account(mut, constraint = token_account.mint == reward_mint.key() && token_account.owner == wallet.key())]
    pub token_account: Account<'info, TokenAccount>,

    /// The wallet that pays for the rent
    #[account(mut)]
    pub wallet: Signer<'info>,

    /// NATIVE SYSTEM PROGRAM
    pub system_program: Program<'info, System>,

    /// NATIVE TOKEN PROGRAM
    pub token_program: Program<'info, Token>,

    // HIVE CONTROL
    #[account()]
    pub project: Box<Account<'info, Project>>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub vault: AccountInfo<'info>,
}

/// Fund rewards
pub fn fund_rewards(ctx: Context<FundRewards>, amount: u64) -> Result<()> {
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.token_account.to_account_info(),
                to: ctx.accounts.reward_vault.to_account_info(),
                authority: ctx.accounts.wallet.to_account_info(),
            },
        ),
        amount,
    )?;
    Ok(())
}

/// Accounts used in withdraw rewards instruction
#[derive(Accounts)]
pub struct WithdrawRewards<'info> {
    /// StakingProject state account
    #[account(has_one = project)]
    pub staking_project: Box<Account<'info, StakingProject>>,

    /// Mint address of the reward token
    #[account(mut, constraint = reward_mint.key() == staking_project.reward_mint)]
    pub reward_mint: Box<Account<'info, Mint>>,

    /// Reward Vault
    #[account(mut, constraint = reward_vault.key() == staking_project.vault)]
    pub reward_vault: Account<'info, TokenAccount>,

    /// Payee token account
    #[account(mut, constraint = token_account.mint == reward_mint.key())]
    pub token_account: Account<'info, TokenAccount>,

    /// The wallet that holds authority for this action
    #[account()]
    pub authority: Signer<'info>,

    /// The wallet that pays for the rent
    #[account(mut)]
    pub payer: Signer<'info>,

    /// NATIVE SYSTEM PROGRAM
    pub system_program: Program<'info, System>,

    /// NATIVE TOKEN PROGRAM
    pub token_program: Program<'info, Token>,

    // HIVE CONTROL
    #[account()]
    pub project: Box<Account<'info, Project>>,
    #[account(has_one = authority)]
    pub delegate_authority: Option<Account<'info, DelegateAuthority>>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub vault: AccountInfo<'info>,
}

/// Withdraw rewards
pub fn withdraw_rewards(ctx: Context<WithdrawRewards>, amount: u64) -> Result<()> {
    let staking_project_seeds = &[
        b"staking_project".as_ref(),
        ctx.accounts.staking_project.project.as_ref(),
        ctx.accounts.staking_project.key.as_ref(),
        &[ctx.accounts.staking_project.bump],
    ];
    let staking_project_signer = &[&staking_project_seeds[..]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.reward_vault.to_account_info(),
                to: ctx.accounts.token_account.to_account_info(),
                authority: ctx.accounts.staking_project.to_account_info(),
            },
            staking_project_signer,
        ),
        amount,
    )?;
    Ok(())
}

/// Accounts used in fund rewards instruction
#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    /// StakingProject state account
    #[account(has_one = project)]
    pub staking_project: Box<Account<'info, StakingProject>>,

    /// Multpliers state account
    #[account(has_one = staking_project)]
    pub multipliers: Option<Account<'info, Multipliers>>,

    /// NFT state account
    #[account(mut, has_one = staking_project, has_one = staker)]
    pub nft: Box<Account<'info, NFT>>,

    /// Mint address of the reward token
    #[account(mut, constraint = reward_mint.key() == staking_project.reward_mint)]
    pub reward_mint: Box<Account<'info, Mint>>,

    /// Reward Vault
    #[account(mut, constraint = reward_vault.key() == staking_project.vault)]
    pub reward_vault: Box<Account<'info, TokenAccount>>,

    /// Payee token account
    #[account(mut, constraint = token_account.mint == reward_mint.key() && token_account.owner == wallet.key())]
    pub token_account: Account<'info, TokenAccount>,

    /// Staker state account
    #[account(mut, has_one = staking_project, has_one = wallet)]
    pub staker: Account<'info, Staker>,

    /// The wallet that pays for the rent
    #[account(mut)]
    pub wallet: Signer<'info>,

    /// NATIVE SYSTEM PROGRAM
    pub system_program: Program<'info, System>,

    /// NATIVE TOKEN PROGRAM
    pub token_program: Program<'info, Token>,

    /// SYSVAR CLOCK
    pub clock: Sysvar<'info, Clock>,

    // HIVE CONTROL
    #[account()]
    pub project: Box<Account<'info, Project>>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub vault: AccountInfo<'info>,
}

/// Claim rewards
pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
    let staking_project = &ctx.accounts.staking_project;
    let nft = &mut ctx.accounts.nft;

    let mut seconds_elapsed: u64 =
        u64::try_from(ctx.accounts.clock.unix_timestamp - nft.last_claim).unwrap();

    if seconds_elapsed < staking_project.rewards_per_duration {
        return Err(ErrorCode::RewardsNotAvailable.into());
    }

    if let Some(max_rewards_duration) = staking_project.max_rewards_duration {
        if max_rewards_duration < seconds_elapsed {
            seconds_elapsed = max_rewards_duration;
        }
    }

    nft.last_claim = ctx.accounts.clock.unix_timestamp;

    let rewards_per_second =
        staking_project.rewards_per_duration / staking_project.rewards_duration;
    let mut rewards_amount = rewards_per_second * seconds_elapsed;

    let mut multplier_decimals: u64 = 1;
    let mut total_multipliers: u64 = multplier_decimals;
    if let Some(multipliers) = &ctx.accounts.multipliers {
        multplier_decimals = 10u64.pow(multipliers.decimals.into());
        total_multipliers = multplier_decimals;

        let mut duration_multiplier = multplier_decimals;
        for multiplier in multipliers.duration_multipliers.iter() {
            match multiplier.multiplier_type {
                MultiplierType::StakeDuration { min_duration } => {
                    if seconds_elapsed < min_duration {
                        duration_multiplier = multiplier.value;
                    } else {
                        break;
                    }
                }
                _ => {}
            }
        }
        duration_multiplier -= multplier_decimals;
        total_multipliers += duration_multiplier;

        let mut count_multiplier = multplier_decimals;
        for multiplier in multipliers.count_multipliers.iter() {
            match multiplier.multiplier_type {
                MultiplierType::NFTCount { min_count } => {
                    if min_count <= ctx.accounts.staker.total_staked {
                        count_multiplier = multiplier.value;
                    } else {
                        break;
                    }
                }
                _ => {}
            }
        }
        count_multiplier -= multplier_decimals;
        total_multipliers += count_multiplier;

        let mut creator_multiplier = multplier_decimals;
        for multiplier in multipliers.creator_multipliers.iter() {
            match multiplier.multiplier_type {
                MultiplierType::Creator { creator } => {
                    if creator == nft.creator {
                        creator_multiplier = multiplier.value;
                        break;
                    }
                }
                _ => {}
            }
        }
        creator_multiplier -= multplier_decimals;
        total_multipliers += creator_multiplier;

        let mut collection_multiplier = multplier_decimals;
        for multiplier in multipliers.collection_multipliers.iter() {
            match multiplier.multiplier_type {
                MultiplierType::Collection { collection } => {
                    if collection == nft.collection {
                        collection_multiplier = multiplier.value;
                        break;
                    }
                }
                _ => {}
            }
        }
        collection_multiplier -= multplier_decimals;
        total_multipliers += collection_multiplier;
    }

    rewards_amount = (rewards_amount * total_multipliers) / multplier_decimals;

    let staking_project_seeds = &[
        b"staking_project".as_ref(),
        staking_project.project.as_ref(),
        staking_project.key.as_ref(),
        &[ctx.accounts.staking_project.bump],
    ];
    let staking_project_signer = &[&staking_project_seeds[..]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.reward_vault.to_account_info(),
                to: ctx.accounts.token_account.to_account_info(),
                authority: staking_project.to_account_info(),
            },
            staking_project_signer,
        ),
        rewards_amount,
    )?;
    Ok(())
}
