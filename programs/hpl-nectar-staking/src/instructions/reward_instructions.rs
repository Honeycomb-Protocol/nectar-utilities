use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    anchor_spl::token::{Mint, Token, TokenAccount},
    hpl_currency_manager::{
        cpi::{accounts::TransferCurrency, transfer_currency},
        program::HplCurrencyManager,
        state::{Currency, HolderAccount},
    },
    hpl_hive_control::state::{DelegateAuthority, Project},
};

/// Accounts used in withdraw rewards instruction
#[derive(Accounts)]
pub struct WithdrawRewards<'info> {
    /// StakingPool state account
    #[account(has_one = project, has_one = currency)]
    pub staking_pool: Box<Account<'info, StakingPool>>,

    #[account(has_one = mint)]
    pub currency: Box<Account<'info, Currency>>,

    #[account()]
    pub mint: Box<Account<'info, Mint>>,

    #[account(has_one = currency, constraint = vault_holder_account.token_account == vault_token_account.key() && vault_holder_account.owner == staking_pool.key())]
    pub vault_holder_account: Box<Account<'info, HolderAccount>>,

    #[account(mut)]
    pub vault_token_account: Box<Account<'info, TokenAccount>>,

    #[account(has_one = currency, has_one = token_account)]
    pub holder_account: Account<'info, HolderAccount>,

    #[account(mut)]
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
    pub currency_manager_program: Program<'info, HplCurrencyManager>,
}

/// Withdraw rewards
pub fn withdraw_rewards(ctx: Context<WithdrawRewards>, amount: u64) -> Result<()> {
    let pool_seeds = &[
        b"staking_pool".as_ref(),
        ctx.accounts.staking_pool.project.as_ref(),
        ctx.accounts.staking_pool.key.as_ref(),
        &[ctx.accounts.staking_pool.bump],
    ];
    let pool_signer = &[&pool_seeds[..]];
    transfer_currency(
        CpiContext::new_with_signer(
            ctx.accounts.currency_manager_program.to_account_info(),
            TransferCurrency {
                project: ctx.accounts.project.to_account_info(),
                currency: ctx.accounts.currency.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                sender_holder_account: ctx.accounts.vault_holder_account.to_account_info(),
                sender_token_account: ctx.accounts.vault_token_account.to_account_info(),
                receiver_holder_account: ctx.accounts.holder_account.to_account_info(),
                receiver_token_account: ctx.accounts.token_account.to_account_info(),
                owner: ctx.accounts.staking_pool.to_account_info(),
                vault: ctx.accounts.vault.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
            },
            pool_signer,
        ),
        amount,
    )?;
    Ok(())
}

/// Accounts used in fund rewards instruction
#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    /// StakingPool state account
    #[account(has_one = project, has_one = currency)]
    pub staking_pool: Box<Account<'info, StakingPool>>,

    /// Multpliers state account
    #[account(has_one = staking_pool)]
    pub multipliers: Option<Account<'info, Multipliers>>,

    /// NFT state account
    #[account(mut, has_one = staking_pool, has_one = staker)]
    pub nft: Box<Account<'info, NFT>>,

    #[account(has_one = mint)]
    pub currency: Box<Account<'info, Currency>>,

    #[account(mut)]
    pub mint: Box<Account<'info, Mint>>,

    #[account(has_one = currency, constraint = vault_holder_account.token_account == vault_token_account.key() && vault_holder_account.owner == staking_pool.key())]
    pub vault_holder_account: Box<Account<'info, HolderAccount>>,

    #[account(mut)]
    pub vault_token_account: Box<Account<'info, TokenAccount>>,

    #[account(has_one = currency, has_one = token_account, constraint = holder_account.owner == wallet.key())]
    pub holder_account: Account<'info, HolderAccount>,

    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,

    /// Staker state account
    #[account(mut, has_one = staking_pool, has_one = wallet)]
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
    pub currency_manager_program: Program<'info, HplCurrencyManager>,
}

/// Claim rewards
pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
    let staking_pool = &ctx.accounts.staking_pool;
    let nft = &mut ctx.accounts.nft;

    let mut seconds_elapsed: u64 =
        u64::try_from(ctx.accounts.clock.unix_timestamp - nft.last_claim).unwrap();

    if seconds_elapsed < staking_pool.rewards_duration {
        return Err(ErrorCode::RewardsNotAvailable.into());
    }

    if let Some(max_rewards_duration) = staking_pool.max_rewards_duration {
        if max_rewards_duration < seconds_elapsed {
            seconds_elapsed = max_rewards_duration;
        }
    }

    nft.last_claim = ctx.accounts.clock.unix_timestamp;

    let rewards_per_second = staking_pool.rewards_per_duration / staking_pool.rewards_duration;
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

    let pool_seeds = &[
        b"staking_pool".as_ref(),
        staking_pool.project.as_ref(),
        staking_pool.key.as_ref(),
        &[ctx.accounts.staking_pool.bump],
    ];
    let pool_signer = &[&pool_seeds[..]];

    transfer_currency(
        CpiContext::new_with_signer(
            ctx.accounts.currency_manager_program.to_account_info(),
            TransferCurrency {
                project: ctx.accounts.project.to_account_info(),
                currency: ctx.accounts.currency.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                sender_holder_account: ctx.accounts.vault_holder_account.to_account_info(),
                sender_token_account: ctx.accounts.vault_token_account.to_account_info(),
                receiver_holder_account: ctx.accounts.holder_account.to_account_info(),
                receiver_token_account: ctx.accounts.token_account.to_account_info(),
                owner: ctx.accounts.staking_pool.to_account_info(),
                vault: ctx.accounts.vault.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
            },
            pool_signer,
        ),
        rewards_amount,
    )?;
    Ok(())
}
