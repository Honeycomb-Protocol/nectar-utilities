use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    anchor_spl::{
        associated_token::AssociatedToken,
        token::{self, CloseAccount, Mint, Token, TokenAccount},
    },
    hpl_hive_control::state::Project,
    hpl_utils::traits::Default,
    mpl_token_metadata::{
        instruction::{DelegateArgs, RevokeArgs},
        state::{Metadata, TokenMetadataAccount},
    },
    spl_account_compression::Noop,
};

/// Accounts used in stake instruction
#[derive(Accounts)]
pub struct Stake<'info> {
    /// StakingPool state account
    #[account(mut, has_one = project)]
    pub staking_pool: Box<Account<'info, StakingPool>>,

    /// NFT state account
    #[account(mut, has_one = staking_pool)]
    pub nft: Box<Account<'info, NFTv1>>,

    /// Mint address of the NFT
    #[account(mut, constraint = nft_mint.key() == nft.mint)]
    pub nft_mint: Box<Account<'info, Mint>>,

    /// Token account of the NFT
    #[account(mut, constraint = nft_account.mint == nft_mint.key() && nft_account.owner == wallet.key())]
    pub nft_account: Box<Account<'info, TokenAccount>>,

    /// NFT token metadata
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub nft_metadata: AccountInfo<'info>,

    /// NFT edition
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub nft_edition: AccountInfo<'info>,

    /// NFT token record
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub nft_token_record: Option<AccountInfo<'info>>,

    /// Staker state account
    #[account(mut, has_one = staking_pool, has_one = wallet)]
    pub staker: Box<Account<'info, Staker>>,

    /// The account that will hold the nft sent on expedition
    #[account(
        init,
        payer = wallet,
        seeds = [
            b"deposit",
            nft_mint.key().as_ref(),
        ],
        bump,
        token::mint = nft_mint,
        token::authority = staker,
    )]
    pub deposit_account: Option<Account<'info, TokenAccount>>,

    /// Deposit token_record
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub deposit_token_record: Option<AccountInfo<'info>>,

    /// The wallet that pays for the rent
    #[account(mut)]
    pub wallet: Signer<'info>,

    /// NATIVE SYSTEM PROGRAM
    pub system_program: Program<'info, System>,

    /// NATIVE TOKEN PROGRAM
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,

    /// ASSOCIATED TOKEN PROGRAM
    pub associated_token_program: Program<'info, AssociatedToken>,

    /// METAPLEX TOKEN METADATA PROGRAM
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = mpl_token_metadata::ID)]
    pub token_metadata_program: AccountInfo<'info>,

    /// SPL NO OP PROGRAM
    pub log_wrapper: Program<'info, Noop>,

    /// NATIVE CLOCK SYSVAR
    pub clock: Sysvar<'info, Clock>,

    /// NATIVE INSTRUCTIONS SYSVAR
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,

    // HIVE CONTROL
    #[account()]
    pub project: Box<Account<'info, Project>>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub vault: AccountInfo<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    pub authorization_rules_program: Option<AccountInfo<'info>>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    pub authorization_rules: Option<AccountInfo<'info>>,
}

/// Stake NFT
pub fn stake(ctx: Context<Stake>) -> Result<()> {
    let staking_pool = &mut ctx.accounts.staking_pool;
    let nft = &mut ctx.accounts.nft;

    let staker = &mut ctx.accounts.staker;

    staking_pool.total_staked += 1;

    if let Some(cooldown_duration) = staking_pool.cooldown_duration {
        let duration = nft.last_unstaked_at + i64::try_from(cooldown_duration).unwrap();
        if ctx.accounts.clock.unix_timestamp < duration {
            msg!(
                "Cooldown period not expired, remaining: {}",
                duration - ctx.accounts.clock.unix_timestamp
            );
            return Err(ErrorCode::CantStakeYet.into());
        }
    }

    let wallet_key = ctx.accounts.wallet.key();
    let pool_key = staking_pool.key();
    let staker_seeds = &[
        b"staker",
        wallet_key.as_ref(),
        pool_key.as_ref(),
        &[staker.bump],
    ];
    let staker_signer = &[&staker_seeds[..]];

    match staking_pool.lock_type {
        LockType::Freeze => {
            let metadata_account_info = &ctx.accounts.nft_metadata;
            if metadata_account_info.data_is_empty() {
                return Err(ErrorCode::InvalidMetadata.into());
            }

            let metadata: Metadata = Metadata::from_account_info(metadata_account_info)?;
            if metadata.mint != ctx.accounts.nft_mint.key() {
                return Err(ErrorCode::InvalidMetadata.into());
            }

            let args: Result<DelegateArgs> = match metadata.token_standard {
                Some(token_standard) => match token_standard {
                    mpl_token_metadata::state::TokenStandard::ProgrammableNonFungible => {
                        Ok(DelegateArgs::StakingV1 {
                            amount: 1,
                            authorization_data: None,
                        })
                    }
                    _ => Ok(DelegateArgs::StandardV1 { amount: 1 }),
                },
                None => Err(ErrorCode::InvalidMetadata.into()),
            };

            hpl_utils::delegate(
                args.unwrap(),
                None,
                staker.to_account_info(),
                ctx.accounts.nft_metadata.to_account_info(),
                Some(ctx.accounts.nft_edition.to_account_info()),
                ctx.accounts.nft_token_record.clone(),
                ctx.accounts.nft_mint.to_account_info(),
                ctx.accounts.nft_account.to_account_info(),
                ctx.accounts.wallet.to_account_info(),
                ctx.accounts.wallet.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
                ctx.accounts.instructions_sysvar.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
                ctx.accounts.authorization_rules_program.clone(),
                ctx.accounts.authorization_rules.clone(),
                None,
            )?;

            hpl_utils::lock(
                staker.to_account_info(),
                ctx.accounts.nft_mint.to_account_info(),
                ctx.accounts.nft_account.to_account_info(),
                Some(ctx.accounts.wallet.to_account_info()),
                ctx.accounts.nft_metadata.to_account_info(),
                Some(ctx.accounts.nft_edition.to_account_info()),
                ctx.accounts.nft_token_record.clone(),
                ctx.accounts.wallet.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
                ctx.accounts.instructions_sysvar.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
                ctx.accounts.authorization_rules_program.clone(),
                ctx.accounts.authorization_rules.clone(),
                Some(staker_signer),
            )?;
        }
        LockType::Custoday => {
            if let Some(deposit_account) = &ctx.accounts.deposit_account {
                hpl_utils::transfer(
                    1,
                    ctx.accounts.nft_account.to_account_info(),
                    ctx.accounts.wallet.to_account_info(),
                    deposit_account.to_account_info(),
                    staker.to_account_info(),
                    ctx.accounts.nft_mint.to_account_info(),
                    ctx.accounts.nft_metadata.to_account_info(),
                    Some(ctx.accounts.nft_edition.to_account_info()),
                    ctx.accounts.nft_token_record.clone(),
                    ctx.accounts.deposit_token_record.clone(),
                    ctx.accounts.wallet.to_account_info(),
                    ctx.accounts.wallet.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                    ctx.accounts.token_program.to_account_info(),
                    ctx.accounts.associated_token_program.to_account_info(),
                    ctx.accounts.instructions_sysvar.to_account_info(),
                    ctx.accounts.authorization_rules_program.clone(),
                    ctx.accounts.authorization_rules.clone(),
                    Some(staker_signer),
                )?;
            } else {
                return Err(ErrorCode::DepositAccountNotProvided.into());
            }
        }
    }

    nft.staker = Some(staker.key());
    nft.last_staked_at = ctx.accounts.clock.unix_timestamp;
    if staking_pool.reset_stake_duration {
        nft.staked_at = ctx.accounts.clock.unix_timestamp;
    }

    if nft.last_claim == 0 || staking_pool.reset_stake_duration {
        nft.last_claim = ctx.accounts.clock.unix_timestamp;
    }

    staker.total_staked += 1;

    Event::stake(nft.key(), &nft, staker.key(), &staker, &ctx.accounts.clock)
        .wrap(ctx.accounts.log_wrapper.to_account_info(), crate::id())?;

    // msg!("JSON NFT: {:?}", nft);
    Ok(())
}

/// Accounts used in unstake instruction
#[derive(Accounts)]
pub struct Unstake<'info> {
    /// StakingPool state account
    #[account(mut, has_one = project)]
    pub staking_pool: Box<Account<'info, StakingPool>>,

    /// NFT state account
    #[account(mut, has_one = staking_pool, constraint = nft.staker.is_some() && nft.staker.unwrap().eq(&staker.key()), close = wallet)]
    pub nft: Box<Account<'info, NFTv1>>,

    /// Mint address of the NFT
    #[account(mut, constraint = nft_mint.key() == nft.mint)]
    pub nft_mint: Box<Account<'info, Mint>>,

    /// Token account of the NFT
    #[account(mut, constraint = nft_account.mint == nft_mint.key() && nft_account.owner == wallet.key())]
    pub nft_account: Box<Account<'info, TokenAccount>>,

    /// NFT token metadata
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub nft_metadata: AccountInfo<'info>,

    /// NFT edition
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub nft_edition: AccountInfo<'info>,

    /// NFT token record
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub nft_token_record: Option<AccountInfo<'info>>,

    /// The account that will hold the nft sent on expedition
    #[account(
        mut,
        token::mint = nft_mint,
        token::authority = staker,
    )]
    pub deposit_account: Option<Account<'info, TokenAccount>>,

    /// Deposit token_record
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub deposit_token_record: Option<AccountInfo<'info>>,

    /// Staker state account
    #[account(mut, has_one = staking_pool, has_one = wallet)]
    pub staker: Account<'info, Staker>,

    /// The wallet that pays for the rent
    #[account(mut)]
    pub wallet: Signer<'info>,

    /// NATIVE SYSTEM PROGRAM
    pub system_program: Program<'info, System>,

    /// NATIVE TOKEN PROGRAM
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,

    /// ASSOCIATED TOKEN PROGRAM
    pub associated_token_program: Program<'info, AssociatedToken>,

    /// METAPLEX TOKEN METADATA PROGRAM
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = mpl_token_metadata::ID)]
    pub token_metadata_program: AccountInfo<'info>,

    /// SPL NO OP PROGRAM
    pub log_wrapper: Program<'info, Noop>,

    /// NATIVE CLOCK SYSVAR
    pub clock: Sysvar<'info, Clock>,

    /// NATIVE INSTRUCTIONS SYSVAR
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,

    // HIVE CONTROL
    #[account()]
    pub project: Box<Account<'info, Project>>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub vault: AccountInfo<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    pub authorization_rules_program: Option<AccountInfo<'info>>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    pub authorization_rules: Option<AccountInfo<'info>>,
}

/// Unstake NFT
pub fn unstake(ctx: Context<Unstake>) -> Result<()> {
    let staking_pool = &mut ctx.accounts.staking_pool;
    let staker = &mut ctx.accounts.staker;
    let nft = &mut ctx.accounts.nft;

    if nft.used_by != NFTUsedBy::None {
        msg!("NFT is currently being used by an hpl service",);
        return Err(ErrorCode::CantUnstakeYet.into());
    }

    if let Some(min_stake_duration) = staking_pool.min_stake_duration {
        let duration = nft.last_staked_at + i64::try_from(min_stake_duration).unwrap();
        if ctx.accounts.clock.unix_timestamp < duration {
            msg!(
                "Min stake duration not reached, remaining {} seconds",
                duration - ctx.accounts.clock.unix_timestamp
            );
            return Err(ErrorCode::CantUnstakeYet.into());
        }
    }

    nft.last_unstaked_at = ctx.accounts.clock.unix_timestamp;
    nft.staker = None;
    staker.total_staked -= 1;

    let wallet_key = ctx.accounts.wallet.key();
    let pool_key = staking_pool.key();
    let staker_seeds = &[
        b"staker",
        wallet_key.as_ref(),
        pool_key.as_ref(),
        &[staker.bump],
    ];
    let staker_signer = &[&staker_seeds[..]];

    match staking_pool.lock_type {
        LockType::Freeze => {
            let metadata_account_info = &ctx.accounts.nft_metadata;
            if metadata_account_info.data_is_empty() {
                return Err(ErrorCode::InvalidMetadata.into());
            }

            let metadata: Metadata = Metadata::from_account_info(metadata_account_info)?;
            if metadata.mint != ctx.accounts.nft_mint.key() {
                return Err(ErrorCode::InvalidMetadata.into());
            }

            let args: Result<RevokeArgs> = match metadata.token_standard {
                Some(token_standard) => match token_standard {
                    mpl_token_metadata::state::TokenStandard::ProgrammableNonFungible => {
                        Ok(RevokeArgs::StakingV1)
                    }
                    _ => Ok(RevokeArgs::StandardV1),
                },
                None => Err(ErrorCode::InvalidMetadata.into()),
            };

            hpl_utils::unlock(
                staker.to_account_info(),
                ctx.accounts.nft_mint.to_account_info(),
                ctx.accounts.nft_account.to_account_info(),
                Some(ctx.accounts.wallet.to_account_info()),
                ctx.accounts.nft_metadata.to_account_info(),
                Some(ctx.accounts.nft_edition.to_account_info()),
                ctx.accounts.nft_token_record.clone(),
                ctx.accounts.wallet.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
                ctx.accounts.instructions_sysvar.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
                ctx.accounts.authorization_rules_program.clone(),
                ctx.accounts.authorization_rules.clone(),
                Some(staker_signer),
            )?;

            hpl_utils::revoke(
                args.unwrap(),
                None,
                staker.to_account_info(),
                ctx.accounts.nft_metadata.to_account_info(),
                Some(ctx.accounts.nft_edition.to_account_info()),
                ctx.accounts.nft_token_record.clone(),
                ctx.accounts.nft_mint.to_account_info(),
                ctx.accounts.nft_account.to_account_info(),
                ctx.accounts.wallet.to_account_info(),
                ctx.accounts.wallet.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
                ctx.accounts.instructions_sysvar.to_account_info(),
                ctx.accounts.token_program.to_account_info(),
                ctx.accounts.authorization_rules_program.clone(),
                ctx.accounts.authorization_rules.clone(),
                Some(staker_signer),
            )?;
        }
        LockType::Custoday => {
            if let Some(deposit_account) = &ctx.accounts.deposit_account {
                hpl_utils::transfer(
                    1,
                    deposit_account.to_account_info(),
                    staker.to_account_info(),
                    ctx.accounts.nft_account.to_account_info(),
                    ctx.accounts.wallet.to_account_info(),
                    ctx.accounts.nft_mint.to_account_info(),
                    ctx.accounts.nft_metadata.to_account_info(),
                    Some(ctx.accounts.nft_edition.to_account_info()),
                    ctx.accounts.deposit_token_record.clone(),
                    ctx.accounts.nft_token_record.clone(),
                    staker.to_account_info(),
                    ctx.accounts.wallet.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                    ctx.accounts.token_program.to_account_info(),
                    ctx.accounts.associated_token_program.to_account_info(),
                    ctx.accounts.instructions_sysvar.to_account_info(),
                    ctx.accounts.authorization_rules_program.clone(),
                    ctx.accounts.authorization_rules.clone(),
                    Some(staker_signer),
                )?;

                token::close_account(CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    CloseAccount {
                        account: deposit_account.to_account_info(),
                        destination: ctx.accounts.wallet.to_account_info(),
                        authority: staker.to_account_info(),
                    },
                    staker_signer,
                ))?;
            } else {
                return Err(ErrorCode::DepositAccountNotProvided.into());
            }
        }
    }

    Event::unstake(nft.key(), &nft, staker.key(), &staker, &ctx.accounts.clock)
        .wrap(ctx.accounts.log_wrapper.to_account_info(), crate::id())?;
    // msg!("JSON NFT: {:?}", nft);
    Ok(())
}

/// Accounts used in unstake instruction
#[derive(Accounts)]
pub struct MigrateNFTPart1<'info> {
    #[account(has_one = authority)]
    pub project: Box<Account<'info, Project>>,

    /// StakingPool state account
    #[account(mut, has_one = project)]
    pub staking_pool: Box<Account<'info, StakingPool>>,

    /// NFT state account
    #[account(mut, has_one = staking_pool, close = authority)]
    pub nft: Box<Account<'info, NFT>>,

    /// NFT state account
    #[account(
        init, payer = authority,
        space = NFTv1::LEN,
        seeds = [
            b"nft-temp",
            nft.mint.as_ref(),
            staking_pool.key().as_ref(),
        ],
        bump,
    )]
    pub nft_temp: Account<'info, NFTv1>,

    /// The authority of the project
    #[account(mut)]
    pub authority: Signer<'info>,

    /// NATIVE SYSTEM PROGRAM
    pub system_program: Program<'info, System>,
}

/// Unstake NFT
pub fn migrate_nft_part1(ctx: Context<MigrateNFTPart1>) -> Result<()> {
    let nft = &mut ctx.accounts.nft_temp;
    nft.bump = ctx.bumps["nft_temp"];
    nft.staking_pool = ctx.accounts.staking_pool.key();
    nft.staker = if ctx.accounts.nft.staker.eq(&Pubkey::default()) {
        None
    } else {
        Some(ctx.accounts.nft.staker)
    };
    nft.mint = ctx.accounts.nft.mint;
    nft.last_claim = ctx.accounts.nft.last_claim;
    nft.staked_at = ctx.accounts.nft.staked_at;
    nft.last_staked_at = ctx.accounts.nft.last_staked_at;
    nft.last_unstaked_at = ctx.accounts.nft.last_unstaked_at;
    nft.is_compressed = false;
    nft.criteria = if !ctx.accounts.nft.collection.eq(&Pubkey::default()) {
        NFTCriteria::Collection {
            address: ctx.accounts.nft.collection,
        }
    } else if !ctx.accounts.nft.creator.eq(&Pubkey::default()) {
        NFTCriteria::Creator {
            address: ctx.accounts.nft.creator,
        }
    } else {
        NFTCriteria::None
    };
    nft.used_by = NFTUsedBy::None;
    Ok(())
}

/// Accounts used in unstake instruction
#[derive(Accounts)]
pub struct MigrateNFTPart2<'info> {
    #[account(has_one = authority)]
    pub project: Box<Account<'info, Project>>,

    /// StakingPool state account
    #[account(mut, has_one = project)]
    pub staking_pool: Box<Account<'info, StakingPool>>,

    /// NFT state account
    #[account(mut, has_one = staking_pool, close = authority)]
    pub nft_temp: Box<Account<'info, NFTv1>>,

    /// NFT state account
    #[account(
        init, payer = authority,
        space = NFTv1::LEN,
        seeds = [
            b"nft",
            nft_temp.mint.as_ref(),
            staking_pool.key().as_ref(),
        ],
        bump,
    )]
    pub nft: Account<'info, NFTv1>,

    /// The authority of the project
    #[account(mut)]
    pub authority: Signer<'info>,

    /// NATIVE SYSTEM PROGRAM
    pub system_program: Program<'info, System>,
}

/// Unstake NFT
pub fn migrate_nft_part2(ctx: Context<MigrateNFTPart2>) -> Result<()> {
    let nft = &mut ctx.accounts.nft;
    nft.bump = ctx.bumps["nft"];
    nft.staking_pool = ctx.accounts.staking_pool.key();
    nft.staker = ctx.accounts.nft_temp.staker;
    nft.mint = ctx.accounts.nft_temp.mint;
    nft.last_claim = ctx.accounts.nft_temp.last_claim;
    nft.staked_at = ctx.accounts.nft_temp.staked_at;
    nft.last_staked_at = ctx.accounts.nft_temp.last_staked_at;
    nft.last_unstaked_at = ctx.accounts.nft_temp.last_unstaked_at;
    nft.is_compressed = false;
    nft.criteria = ctx.accounts.nft_temp.criteria;
    nft.used_by = NFTUsedBy::None;
    Ok(())
}
