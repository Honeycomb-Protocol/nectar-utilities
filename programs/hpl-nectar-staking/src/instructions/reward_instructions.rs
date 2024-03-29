use {
    crate::state::*,
    anchor_lang::prelude::*,
    anchor_spl::token::{Mint, Token, TokenAccount},
    hpl_currency_manager::{
        cpi::{accounts::MintCurrency, mint_currency},
        program::HplCurrencyManager,
        state::{Currency, HolderAccount},
    },
    hpl_events::HplEvents,
    hpl_hive_control::{
        program::HplHiveControl,
        state::{DelegateAuthority, Project},
    },
};

fn calculate_rewards(
    staking_pool: &StakingPool,
    multipliers: Option<Account<'_, Multipliers>>,
    nft: &NFTv1,
    staker: &Staker,
    seconds_elapsed: u64,
) -> (u64, u64) {
    let rewards_per_second = staking_pool.rewards_per_duration
        / staking_pool.rewards_duration
        / (if nft.is_compressed { 10 } else { 1 });

    let mut rewards_amount = rewards_per_second * seconds_elapsed;

    let mut total_multipliers = 1u64;
    let mut multplier_decimals = 1u64;
    if let Some(multipliers) = multipliers {
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
                    if min_count <= staker.total_staked {
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
                MultiplierType::Creator { creator } => match nft.criteria {
                    NFTCriteria::Creator { address } => {
                        if address.eq(&creator) {
                            creator_multiplier = multiplier.value;
                            break;
                        }
                    }
                    _ => {}
                },
                _ => {}
            }
        }
        creator_multiplier -= multplier_decimals;
        total_multipliers += creator_multiplier;

        let mut collection_multiplier = multplier_decimals;
        for multiplier in multipliers.collection_multipliers.iter() {
            match multiplier.multiplier_type {
                MultiplierType::Collection { collection } => match nft.criteria {
                    NFTCriteria::Collection { address } => {
                        if collection.eq(&address) {
                            collection_multiplier = multiplier.value;
                            break;
                        }
                    }
                    _ => {}
                },
                _ => {}
            }
        }
        collection_multiplier -= multplier_decimals;
        total_multipliers += collection_multiplier;
    }
    rewards_amount = (rewards_amount * total_multipliers) / multplier_decimals;

    (rewards_amount, total_multipliers)
}

/// Accounts used in claim rewards instruction
#[derive(Accounts)]
pub struct ClaimRewards<'info> {
    // HIVE CONTROL
    #[account(mut)]
    pub project: Box<Account<'info, Project>>,

    /// StakingPool state account
    #[account(has_one = project, has_one = currency)]
    pub staking_pool: Box<Account<'info, StakingPool>>,

    /// StakingPool delegate account for this project
    /// It is required to mint rewards
    #[account(has_one = project, constraint = staking_pool_delegate.authority.eq(&staking_pool.key()))]
    pub staking_pool_delegate: Box<Account<'info, DelegateAuthority>>,

    /// Multpliers state account
    #[account(has_one = staking_pool)]
    pub multipliers: Option<Account<'info, Multipliers>>,

    /// NFT state account
    #[account(mut, has_one = staking_pool, constraint = nft.staker.is_some() && nft.staker.unwrap().eq(&staker.key()))]
    pub nft: Box<Account<'info, NFTv1>>,

    #[account(has_one = mint)]
    pub currency: Box<Account<'info, Currency>>,

    #[account(mut)]
    pub mint: Box<Account<'info, Mint>>,

    #[account(has_one = currency, has_one = token_account, constraint = holder_account.owner == wallet.key())]
    pub holder_account: Account<'info, HolderAccount>,

    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,

    /// Staker state account
    #[account(has_one = staking_pool, has_one = wallet)]
    pub staker: Account<'info, Staker>,

    /// The wallet that pays for the rent
    #[account(mut)]
    pub wallet: Signer<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub vault: AccountInfo<'info>,

    /// NATIVE SYSTEM PROGRAM
    pub system_program: Program<'info, System>,

    /// HPL Hive Control Program
    pub hive_control: Program<'info, HplHiveControl>,

    /// NATIVE TOKEN PROGRAM
    pub token_program: Program<'info, Token>,

    /// HPL Currency Manager Program
    pub currency_manager_program: Program<'info, HplCurrencyManager>,

    /// HPL Events Program
    pub hpl_events: Program<'info, HplEvents>,

    /// SYSVAR CLOCK
    pub clock: Sysvar<'info, Clock>,

    /// NATIVE INSTRUCTIONS SYSVAR
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

/// Claim rewards
pub fn claim_rewards(ctx: Context<ClaimRewards>) -> Result<()> {
    let staking_pool = &ctx.accounts.staking_pool;
    let nft = &mut ctx.accounts.nft;

    let mut seconds_elapsed: u64 =
        u64::try_from(ctx.accounts.clock.unix_timestamp - nft.last_claim).unwrap();

    if seconds_elapsed < staking_pool.rewards_duration {
        msg!("Minimum Reward duration not reached yet so rewards not available yet");
        return Ok(());
    }

    if let Some(max_rewards_duration) = staking_pool.max_rewards_duration {
        if max_rewards_duration < seconds_elapsed {
            seconds_elapsed = max_rewards_duration;
        }
    }

    let (rewards_amount, _) = calculate_rewards(
        &ctx.accounts.staking_pool,
        if let Some(multipliers) = ctx.accounts.multipliers.clone() {
            Some(multipliers)
        } else {
            None
        },
        &nft,
        &ctx.accounts.staker,
        seconds_elapsed,
    );

    nft.last_claim = ctx.accounts.clock.unix_timestamp;

    let pool_seeds = &[
        b"staking_pool".as_ref(),
        staking_pool.project.as_ref(),
        staking_pool.key.as_ref(),
        &[ctx.accounts.staking_pool.bump],
    ];
    let pool_signer = &[&pool_seeds[..]];

    mint_currency(
        CpiContext::new_with_signer(
            ctx.accounts.currency_manager_program.to_account_info(),
            MintCurrency {
                project: ctx.accounts.project.to_account_info(),
                currency: ctx.accounts.currency.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                holder_account: ctx.accounts.holder_account.to_account_info(),
                token_account: ctx.accounts.token_account.to_account_info(),
                delegate_authority: Some(ctx.accounts.staking_pool_delegate.to_account_info()),
                authority: ctx.accounts.staking_pool.to_account_info(),
                payer: ctx.accounts.wallet.to_account_info(),
                vault: ctx.accounts.vault.to_account_info(),
                instructions_sysvar: ctx.accounts.instructions_sysvar.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                hive_control: ctx.accounts.hive_control.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
            },
            pool_signer,
        ),
        rewards_amount,
    )?;

    Event::claim_rewards(
        nft.key(),
        nft.try_to_vec().unwrap(),
        ctx.accounts.staker.key(),
        rewards_amount,
        &ctx.accounts.clock,
    )
    .emit(ctx.accounts.hpl_events.to_account_info())?;

    Ok(())
}

/// Accounts used in distribute rewards instruction
#[derive(Accounts)]
pub struct DistriuteRewards<'info> {
    // HIVE CONTROL
    #[account(mut, has_one = authority)]
    pub project: Box<Account<'info, Project>>,

    /// StakingPool state account
    #[account(mut, has_one = project, has_one = currency)]
    pub staking_pool: Box<Account<'info, StakingPool>>,

    /// StakingPool delegate account for this project
    /// It is required to mint rewards
    #[account(has_one = project, constraint = staking_pool_delegate.authority.eq(&staking_pool.key()))]
    pub staking_pool_delegate: Box<Account<'info, DelegateAuthority>>,

    /// Multpliers state account
    #[account(has_one = staking_pool)]
    pub multipliers: Option<Account<'info, Multipliers>>,

    /// NFT state account
    #[account(mut, has_one = staking_pool, constraint = nft.staker.is_some() && nft.staker.unwrap().eq(&staker.key()))]
    pub nft: Box<Account<'info, NFTv1>>,

    #[account(has_one = mint)]
    pub currency: Box<Account<'info, Currency>>,

    #[account(mut)]
    pub mint: Box<Account<'info, Mint>>,

    #[account(mut, has_one = currency, constraint = vault_holder_account.token_account == vault_token_account.key() && vault_holder_account.owner == staking_pool.key())]
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

    /// The wallet that owns the NFT
    /// CHECK: This account is not dangerous
    #[account(mut)]
    pub wallet: AccountInfo<'info>,

    /// The authority of the project
    pub authority: Signer<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub vault: AccountInfo<'info>,

    /// NATIVE SYSTEM PROGRAM
    pub system_program: Program<'info, System>,

    /// HPL Hive Control Program
    pub hive_control: Program<'info, HplHiveControl>,

    /// NATIVE TOKEN PROGRAM
    pub token_program: Program<'info, Token>,

    /// HPL Currency Manager Program
    pub currency_manager_program: Program<'info, HplCurrencyManager>,

    /// HPL Events Program
    pub hpl_events: Program<'info, HplEvents>,

    /// SYSVAR CLOCK
    pub clock: Sysvar<'info, Clock>,

    /// NATIVE INSTRUCTIONS SYSVAR
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

/// Distribute rewards
pub fn distribute_rewards(ctx: Context<DistriuteRewards>) -> Result<()> {
    let staking_pool = &ctx.accounts.staking_pool;
    let nft = &mut ctx.accounts.nft;

    let mut seconds_elapsed: u64 =
        u64::try_from(ctx.accounts.clock.unix_timestamp - nft.last_claim).unwrap();

    if seconds_elapsed < staking_pool.rewards_duration {
        msg!("Minimum Reward duration not reached yet so rewards not available yet");
        return Ok(());
    }

    if let Some(max_rewards_duration) = staking_pool.max_rewards_duration {
        if max_rewards_duration < seconds_elapsed {
            seconds_elapsed = max_rewards_duration;
        }
    }

    let (rewards_amount, _) = calculate_rewards(
        &ctx.accounts.staking_pool,
        if let Some(multipliers) = ctx.accounts.multipliers.clone() {
            Some(multipliers)
        } else {
            None
        },
        nft,
        &ctx.accounts.staker,
        seconds_elapsed,
    );

    nft.last_claim = ctx.accounts.clock.unix_timestamp;

    let pool_seeds = &[
        b"staking_pool".as_ref(),
        staking_pool.project.as_ref(),
        staking_pool.key.as_ref(),
        &[ctx.accounts.staking_pool.bump],
    ];
    let pool_signer = &[&pool_seeds[..]];

    mint_currency(
        CpiContext::new_with_signer(
            ctx.accounts.currency_manager_program.to_account_info(),
            MintCurrency {
                project: ctx.accounts.project.to_account_info(),
                currency: ctx.accounts.currency.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                holder_account: ctx.accounts.holder_account.to_account_info(),
                token_account: ctx.accounts.token_account.to_account_info(),
                delegate_authority: Some(ctx.accounts.staking_pool_delegate.to_account_info()),
                authority: ctx.accounts.staking_pool.to_account_info(),
                payer: ctx.accounts.wallet.to_account_info(),
                vault: ctx.accounts.vault.to_account_info(),
                instructions_sysvar: ctx.accounts.instructions_sysvar.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                hive_control: ctx.accounts.hive_control.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
            },
            pool_signer,
        ),
        rewards_amount,
    )?;

    // Event::claim_rewards(
    //     nft.key(),
    //     &nft,
    //     ctx.accounts.staker.key(),
    //     rewards_amount,
    //     &ctx.accounts.clock,
    // )
    // .emit(ctx.accounts.hpl_events.to_account_info())?;

    Ok(())
}
