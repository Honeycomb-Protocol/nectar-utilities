use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    anchor_spl::{
        associated_token::AssociatedToken,
        token::{self, CloseAccount, Mint, Token, TokenAccount},
    },
    hpl_events::HplEvents,
    hpl_hive_control::{program::HplHiveControl, state::Project},
    hpl_utils::Default,
    mpl_token_metadata::{
        instruction::{DelegateArgs, RevokeArgs},
        state::{Metadata, TokenMetadataAccount},
    },
};

/// Accounts used in stake instruction
#[derive(Accounts)]
pub struct Stake<'info> {
    /// StakingPool state account
    #[account(mut, has_one = project)]
    pub staking_pool: Box<Account<'info, StakingPool>>,

    /// NFT state account
    #[account(init_if_needed, payer = wallet, space = NFTv1::LEN,
    seeds = [
        b"nft",
        nft_mint.key().as_ref(),
        staking_pool.key().as_ref(),
      ],
      bump
    )]
    pub nft: Box<Account<'info, NFTv1>>,

    /// Mint address of the NFT
    #[account(mut)]
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

    /// HPL Hive Control Program
    pub hive_control: Program<'info, HplHiveControl>,

    /// NATIVE TOKEN PROGRAM
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,

    /// ASSOCIATED TOKEN PROGRAM
    pub associated_token_program: Program<'info, AssociatedToken>,

    /// METAPLEX TOKEN METADATA PROGRAM
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = mpl_token_metadata::ID)]
    pub token_metadata_program: AccountInfo<'info>,

    /// HPL Events Program
    pub hpl_events: Program<'info, HplEvents>,

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

    if !nft.staking_pool.eq(&staking_pool.key()) {
        nft.set_defaults();
        nft.bump = ctx.bumps["nft"];
        nft.staking_pool = staking_pool.key();
        nft.mint = ctx.accounts.nft_mint.key();

        let metadata_account_info = &ctx.accounts.nft_metadata;

        if metadata_account_info.data_is_empty() {
            msg!("Metadata account is empty");
            return Err(ErrorCode::InvalidMetadata.into());
        }

        let metadata: Metadata = Metadata::from_account_info(metadata_account_info)?;
        if metadata.mint != ctx.accounts.nft_mint.key() {
            msg!("Metadata mint does not match NFT mint");
            return Err(ErrorCode::InvalidMetadata.into());
        }

        let mut index: u8 = 0;
        let collections = ctx
            .accounts
            .project
            .collections
            .iter()
            .filter_map(|x| {
                let key = if staking_pool.collections.contains(&index) {
                    Some(*x)
                } else {
                    None
                };
                index += 1;
                key
            })
            .collect::<Vec<_>>();

        index = 0;
        let creators = ctx
            .accounts
            .project
            .creators
            .iter()
            .filter_map(|x| {
                let key = if staking_pool.creators.contains(&index) {
                    Some(*x)
                } else {
                    None
                };
                index += 1;
                key
            })
            .collect::<Vec<_>>();

        let validation_out =
            hpl_utils::validate_collection_creator(metadata, &collections, &creators);

        Event::new_nft(nft.key(), nft.try_to_vec().unwrap(), &ctx.accounts.clock)
            .emit(ctx.accounts.hpl_events.to_account_info())?;

        match validation_out {
            Ok(x) => match x {
                hpl_utils::ValidateCollectionCreatorOutput::Collection { address } => {
                    nft.criteria = NFTCriteria::Collection { address };
                    msg!("Collection: {:?}", address);
                }
                hpl_utils::ValidateCollectionCreatorOutput::Creator { address } => {
                    nft.criteria = NFTCriteria::Creator { address };
                    msg!("Creator: {:?}", address);
                }
            },
            Err(_) => {
                // if staking_pool.allowed_mints {
                //     if staking_pool.authority == ctx.accounts.wallet.key() {
                //         return Ok(());
                //     } else if staking_pool.authority != ctx.accounts.wallet.key() {
                //         return Err(ErrorCode::OnlyOwner.into());
                //     }
                // }
                return Err(ErrorCode::InvalidMetadata.into());
            }
        };
    }

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

    Event::stake(
        nft.key(),
        nft.try_to_vec().unwrap(),
        staker.key(),
        staker.try_to_vec().unwrap(),
        &ctx.accounts.clock,
    )
    .emit(ctx.accounts.hpl_events.to_account_info())?;

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

    /// HPL Hive Control Program
    pub hive_control: Program<'info, HplHiveControl>,

    /// NATIVE TOKEN PROGRAM
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,

    /// ASSOCIATED TOKEN PROGRAM
    pub associated_token_program: Program<'info, AssociatedToken>,

    /// METAPLEX TOKEN METADATA PROGRAM
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = mpl_token_metadata::ID)]
    pub token_metadata_program: AccountInfo<'info>,

    /// HPL Events Program
    pub hpl_events: Program<'info, HplEvents>,

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

    Event::unstake(
        nft.key(),
        nft.try_to_vec().unwrap(),
        staker.key(),
        staker.try_to_vec().unwrap(),
        &ctx.accounts.clock,
    )
    .emit(ctx.accounts.hpl_events.to_account_info())?;
    // msg!("JSON NFT: {:?}", nft);
    Ok(())
}
