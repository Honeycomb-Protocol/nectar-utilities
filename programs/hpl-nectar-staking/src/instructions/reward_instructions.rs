use {
    crate::{errors::HplNectarStakingError, state::*},
    anchor_lang::prelude::*,
    anchor_spl::token::{Mint, Token, TokenAccount},
    hpl_character_manager::{
        cpi::{accounts::UseCharacter, use_character},
        instructions::UseCharacterArgs,
        program::HplCharacterManager,
        state::{
            CharacterModel, CharacterSchema, CharacterSource, CharacterUsedBy, NftWrapCriteria,
        },
    },
    hpl_currency_manager::{
        cpi::{accounts::MintCurrency, mint_currency},
        program::HplCurrencyManager,
        state::{Currency, HolderAccount},
    },
    hpl_hive_control::{
        program::HplHiveControl,
        state::{DelegateAuthority, Project},
    },
    hpl_toolkit::compression::*,
    spl_account_compression::{program::SplAccountCompression, Noop},
};

fn calculate_rewards(
    staking_pool: &StakingPool,
    multipliers: Option<Account<'_, Multipliers>>,
    character: &CharacterSchema,
    staker: &Staker,
    seconds_elapsed: u64,
) -> (u64, u64) {
    let rewards_per_second = staking_pool.rewards_per_duration / staking_pool.rewards_duration;

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

        match &character.source {
            CharacterSource::Wrapped { criteria, .. } => {
                let mut creator_multiplier = multplier_decimals;
                for multiplier in multipliers.creator_multipliers.iter() {
                    match multiplier.multiplier_type {
                        MultiplierType::Creator { creator } => match criteria {
                            NftWrapCriteria::Creator(address) => {
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
                        MultiplierType::Collection { collection } => match criteria {
                            NftWrapCriteria::Collection(address) => {
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
        }
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

    #[account(constraint = staking_pool.verify_character_model(&character_model.key()))]
    pub character_model: Box<Account<'info, CharacterModel>>,

    /// CHECK: unsafe
    #[account(mut)]
    pub merkle_tree: AccountInfo<'info>,

    /// StakingPool state account
    #[account(has_one = project, has_one = currency)]
    pub staking_pool: Box<Account<'info, StakingPool>>,

    /// StakingPool delegate account for this project
    /// It is required to mint rewards
    #[account(has_one = project, constraint = staking_pool_delegate.authority.eq(&staking_pool.key()))]
    pub staking_pool_delegate: Box<Account<'info, DelegateAuthority>>,

    /// Staker state account
    #[account(has_one = staking_pool)]
    pub multipliers: Option<Account<'info, Multipliers>>,

    /// Staker state account
    #[account(has_one = wallet)]
    pub staker: Account<'info, Staker>,

    #[account(has_one = mint)]
    pub currency: Box<Account<'info, Currency>>,

    #[account(mut)]
    pub mint: Box<Account<'info, Mint>>,

    #[account(has_one = currency, has_one = token_account, constraint = holder_account.owner == wallet.key())]
    pub holder_account: Account<'info, HolderAccount>,

    #[account(mut)]
    pub token_account: Account<'info, TokenAccount>,

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

    /// HPL Character Manager Program
    pub character_manager: Program<'info, HplCharacterManager>,

    /// HPL Currency Manager Program
    pub currency_manager_program: Program<'info, HplCurrencyManager>,

    /// NATIVE TOKEN PROGRAM
    pub token_program: Program<'info, Token>,

    /// SPL account compression program.
    pub compression_program: Program<'info, SplAccountCompression>,

    /// SPL Noop program.
    pub log_wrapper: Program<'info, Noop>,

    /// NATIVE CLOCK SYSVAR
    pub clock: Sysvar<'info, Clock>,

    /// NATIVE INSTRUCTIONS SYSVAR
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ClaimRewardsArgs {
    root: [u8; 32],
    leaf_idx: u32,
    source: CharacterSource,
    used_by: CharacterUsedBy,
}

/// Claim rewards
pub fn claim_rewards<'info>(
    ctx: Context<'_, '_, '_, 'info, ClaimRewards<'info>>,
    args: ClaimRewardsArgs,
) -> Result<()> {
    let staking_pool = &ctx.accounts.staking_pool;

    let mut character = CharacterSchema {
        owner: ctx.accounts.wallet.key(),
        source: args.source,
        used_by: args.used_by.clone(),
    };

    let mut seconds_elapsed: u64 = ctx.accounts.clock.unix_timestamp.try_into().unwrap();

    if let CharacterUsedBy::Staking {
        pool,
        staker,
        claimed_at,
        ..
    } = &mut character.used_by
    {
        if *pool != staking_pool.key() {
            return Err(HplNectarStakingError::CharacterUsed.into());
        }
        if *staker != ctx.accounts.staker.key() {
            return Err(HplNectarStakingError::StakerMismatch.into());
        }
        seconds_elapsed -= u64::try_from(claimed_at.clone()).unwrap();
        *claimed_at = ctx.accounts.clock.unix_timestamp;
    } else {
        return Err(HplNectarStakingError::CharacterNotStaked.into());
    }

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
        &character,
        &ctx.accounts.staker,
        seconds_elapsed,
    );

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

    use_character(
        CpiContext::new_with_signer(
            ctx.accounts.character_manager.to_account_info(),
            UseCharacter {
                project: ctx.accounts.project.to_account_info(),
                character_model: ctx.accounts.character_model.to_account_info(),
                merkle_tree: ctx.accounts.merkle_tree.to_account_info(),
                user: staking_pool.to_account_info(),
                owner: ctx.accounts.wallet.to_account_info(),
                vault: ctx.accounts.vault.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                hive_control: ctx.accounts.hive_control.to_account_info(),
                compression_program: ctx.accounts.compression_program.to_account_info(),
                log_wrapper: ctx.accounts.log_wrapper.to_account_info(),
                clock: ctx.accounts.clock.to_account_info(),
                instructions_sysvar: ctx.accounts.instructions_sysvar.to_account_info(),
            },
            pool_signer,
        )
        .with_remaining_accounts(ctx.remaining_accounts.to_vec()),
        UseCharacterArgs {
            root: args.root,
            leaf_idx: args.leaf_idx,
            source_hash: character.source.to_node(),
            current_used_by: args.used_by,
            new_used_by: character.used_by,
        },
    )?;

    Ok(())
}
