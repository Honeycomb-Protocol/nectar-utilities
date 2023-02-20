use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer},
};

/// Accounts used in fund rewards instruction
#[derive(Accounts)]
pub struct FundRewards<'info> {
    /// Project state account
    #[account()]
    pub project: Account<'info, Project>,

    /// Mint address of the reward token
    #[account(mut, constraint = reward_mint.key() == project.reward_mint)]
    pub reward_mint: Account<'info, Mint>,

    /// Vault
    #[account(mut, constraint = vault.key() == project.vault)]
    pub vault: Account<'info, TokenAccount>,

    /// Payee token account
    #[account(mut, constraint = token_account.mint == reward_mint.key() && token_account.owner == wallet.key())]
    pub token_account: Account<'info, TokenAccount>,

    /// The wallet that pays for the rent
    #[account(mut)]
    pub wallet: Signer<'info>,

    /// NATIVE TOKEN PROGRAM
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
}

/// Fund rewards
pub fn fund_rewards(ctx: Context<FundRewards>, amount: u64) -> Result<()> {
    token::transfer(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.token_account.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
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
    /// Project state account
    #[account(has_one = authority)]
    pub project: Account<'info, Project>,

    /// Mint address of the reward token
    #[account(mut, constraint = reward_mint.key() == project.reward_mint)]
    pub reward_mint: Account<'info, Mint>,

    /// Vault
    #[account(mut, constraint = vault.key() == project.vault)]
    pub vault: Account<'info, TokenAccount>,

    /// Payee token account
    #[account(mut, constraint = token_account.mint == reward_mint.key())]
    pub token_account: Account<'info, TokenAccount>,

    /// The wallet that pays for the rent
    #[account(mut)]
    pub authority: Signer<'info>,

    /// NATIVE TOKEN PROGRAM
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
}

/// Withdraw rewards
pub fn withdraw_rewards(ctx: Context<WithdrawRewards>, amount: u64) -> Result<()> {
    let project_key = ctx.accounts.project.key();
    let project_seeds = &[
        b"project".as_ref(),
        project_key.as_ref(),
        &[ctx.accounts.project.bump],
    ];
    let project_signer = &[&project_seeds[..]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.token_account.to_account_info(),
                authority: ctx.accounts.project.to_account_info(),
            },
            project_signer,
        ),
        amount,
    )?;
    Ok(())
}

/// Accounts used in fund rewards instruction
#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    /// Project state account
    #[account()]
    pub project: Box<Account<'info, Project>>,

    /// Multpliers state account
    #[account(has_one = project)]
    pub multipliers: Option<Account<'info, Multipliers>>,

    /// NFT state account
    #[account(mut, has_one = project, has_one = staker)]
    pub nft: Box<Account<'info, NFT>>,

    /// Mint address of the reward token
    #[account(mut, constraint = reward_mint.key() == project.reward_mint)]
    pub reward_mint: Account<'info, Mint>,

    /// Vault
    #[account(mut, constraint = vault.key() == project.vault)]
    pub vault: Account<'info, TokenAccount>,

    /// Payee token account
    #[account(mut, constraint = token_account.mint == reward_mint.key() && token_account.owner == wallet.key())]
    pub token_account: Account<'info, TokenAccount>,

    /// Staker state account
    #[account(mut, has_one = project, has_one = wallet)]
    pub staker: Account<'info, Staker>,

    /// The wallet that pays for the rent
    #[account(mut)]
    pub wallet: Signer<'info>,

    /// NATIVE TOKEN PROGRAM
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,

    /// SYSVAR CLOCK
    pub clock: Sysvar<'info, Clock>,
}

/// Claim rewards
pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
    let project = &ctx.accounts.project;
    let nft = &mut ctx.accounts.nft;

    let mut seconds_elapsed: u64 =
        u64::try_from(ctx.accounts.clock.unix_timestamp - nft.last_claim).unwrap();

    if seconds_elapsed < project.rewards_per_duration {
        return Err(ErrorCode::RewardsNotAvailable.into());
    }

    if let Some(max_rewards_duration) = project.max_rewards_duration {
        if max_rewards_duration < seconds_elapsed {
            seconds_elapsed = max_rewards_duration;
        }
    }

    nft.last_claim = ctx.accounts.clock.unix_timestamp;

    let rewards_per_second = project.rewards_per_duration / project.rewards_duration;
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

    let project_seeds = &[
        b"project".as_ref(),
        project.key.as_ref(),
        &[ctx.accounts.project.bump],
    ];
    let project_signer = &[&project_seeds[..]];

    token::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to: ctx.accounts.token_account.to_account_info(),
                authority: project.to_account_info(),
            },
            project_signer,
        ),
        rewards_amount,
    )?;
    Ok(())
}
