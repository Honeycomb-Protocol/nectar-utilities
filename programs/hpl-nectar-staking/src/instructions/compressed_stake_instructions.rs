use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    hpl_hive_control::state::Project,
    mpl_bubblegum::program::Bubblegum,
    spl_account_compression::{program::SplAccountCompression, Noop},
};

/// Accounts used in stake cnft instruction
#[derive(Accounts)]
pub struct StakeCNFT<'info> {
    /// StakingPool state account
    #[account(mut, has_one = project)]
    pub staking_pool: Box<Account<'info, StakingPool>>,

    /// NFT state account
    #[account(mut, has_one = staking_pool)]
    pub nft: Box<Account<'info, NFTv1>>,

    /// CHECK: unsafe
    #[account(mut)]
    pub merkle_tree: UncheckedAccount<'info>,

    /// CHECK: unsafe
    pub tree_authority: UncheckedAccount<'info>,

    /// CHECK: unsafe
    pub creator_hash: UncheckedAccount<'info>,

    /// CHECK: unsafe
    pub data_hash: UncheckedAccount<'info>,

    /// CHECK: unsafe
    pub root: UncheckedAccount<'info>,

    /// Staker state account
    #[account(mut, has_one = staking_pool, has_one = wallet)]
    pub staker: Box<Account<'info, Staker>>,

    /// The wallet that pays for the rent
    #[account(mut)]
    pub wallet: Signer<'info>,

    /// NATIVE SYSTEM PROGRAM
    pub system_program: Program<'info, System>,

    /// MPL Bubblegum program for cNFTs
    pub bubblegum_program: Program<'info, Bubblegum>,

    /// SPL Compression Program
    pub compression_program: Program<'info, SplAccountCompression>,

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
}

/// Stake cNFT
// pub fn stake_cnft(ctx: Context<StakeCNFT>, args: CNFTArgs) -> Result<()> {
pub fn stake_cnft<'info>(
    ctx: Context<'_, '_, '_, 'info, StakeCNFT<'info>>,
    args: super::CNFTArgs,
) -> Result<()> {
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

    // let wallet_key = ctx.accounts.wallet.key();
    // let pool_key = staking_pool.key();
    // let staker_seeds = &[
    //     b"staker",
    //     wallet_key.as_ref(),
    //     pool_key.as_ref(),
    //     &[staker.bump],
    // ];
    // let staker_signer = &[&staker_seeds[..]];

    let mut cpi_ctx = CpiContext::new(
        ctx.accounts.bubblegum_program.to_account_info(),
        mpl_bubblegum::cpi::accounts::Transfer {
            tree_authority: ctx.accounts.tree_authority.to_account_info(),
            leaf_owner: ctx.accounts.wallet.to_account_info(),
            leaf_delegate: ctx.accounts.wallet.to_account_info(),
            new_leaf_owner: staker.to_account_info(),
            merkle_tree: ctx.accounts.merkle_tree.to_account_info(),
            log_wrapper: ctx.accounts.log_wrapper.to_account_info(),
            compression_program: ctx.accounts.compression_program.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        },
    )
    .with_remaining_accounts(ctx.remaining_accounts.to_vec());

    msg!(
        "Is leaf owner signer {}",
        cpi_ctx.accounts.leaf_owner.is_signer
    );
    cpi_ctx.accounts.leaf_owner.is_signer = true;
    let creator_hash: [u8; 32] = ctx.accounts.creator_hash.key().to_bytes();
    let data_hash: [u8; 32] = ctx.accounts.data_hash.key().to_bytes();
    let root: [u8; 32] = ctx.accounts.root.key().to_bytes();

    msg!("{:?}", root.clone());
    msg!("{:?}", data_hash.clone());
    msg!("{:?}", creator_hash.clone());
    msg!("{:?}", args.nonce.clone());
    msg!("{:?}", args.index.clone());

    mpl_bubblegum::cpi::transfer(
        cpi_ctx,
        root,
        data_hash,
        creator_hash,
        args.nonce,
        args.index,
    )?;

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
    Ok(())
}

/// Accounts used in unstake cnft instruction
#[derive(Accounts)]
pub struct UnstakeCNFT<'info> {
    /// StakingPool state account
    #[account(mut, has_one = project)]
    pub staking_pool: Box<Account<'info, StakingPool>>,

    /// NFT state account
    #[account(mut, constraint = nft.staker.is_some() && nft.staker.unwrap().eq(&staker.key()))]
    pub nft: Box<Account<'info, NFTv1>>,

    /// CHECK: unsafe
    #[account(mut)]
    pub merkle_tree: UncheckedAccount<'info>,

    /// CHECK: unsafe
    pub tree_authority: UncheckedAccount<'info>,

    /// CHECK: unsafe
    pub creator_hash: UncheckedAccount<'info>,

    /// CHECK: unsafe
    pub data_hash: UncheckedAccount<'info>,

    /// CHECK: unsafe
    pub root: UncheckedAccount<'info>,

    /// Staker state account
    #[account(mut, has_one = staking_pool, has_one = wallet)]
    pub staker: Box<Account<'info, Staker>>,

    /// The wallet that pays for the rent
    #[account(mut)]
    pub wallet: Signer<'info>,

    /// NATIVE SYSTEM PROGRAM
    pub system_program: Program<'info, System>,

    /// MPL Bubblegum program for cNFTs
    pub bubblegum_program: Program<'info, Bubblegum>,

    /// SPL Compression Program
    pub compression_program: Program<'info, SplAccountCompression>,

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
}

/// Unstake NFT
pub fn unstake_cnft<'info>(
    ctx: Context<'_, '_, '_, 'info, UnstakeCNFT<'info>>,
    args: super::CNFTArgs,
) -> Result<()> {
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
    let creator_hash: [u8; 32] = ctx.accounts.creator_hash.key().to_bytes();
    let data_hash: [u8; 32] = ctx.accounts.data_hash.key().to_bytes();
    let root: [u8; 32] = ctx.accounts.root.key().to_bytes();
    msg!("{:?}", root.clone());
    msg!("{:?}", data_hash.clone());
    msg!("{:?}", creator_hash.clone());
    msg!("{:?}", args.nonce.clone());
    msg!("{:?}", args.index.clone());

    let cpi_ctx = CpiContext::new_with_signer(
        ctx.accounts.bubblegum_program.to_account_info(),
        mpl_bubblegum::cpi::accounts::Transfer {
            tree_authority: ctx.accounts.tree_authority.to_account_info(),
            leaf_owner: staker.to_account_info(),
            leaf_delegate: staker.to_account_info(),
            new_leaf_owner: ctx.accounts.wallet.to_account_info(),
            merkle_tree: ctx.accounts.merkle_tree.to_account_info(),
            log_wrapper: ctx.accounts.log_wrapper.to_account_info(),
            compression_program: ctx.accounts.compression_program.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
        },
        staker_signer,
    )
    .with_remaining_accounts(ctx.remaining_accounts.to_vec());
    mpl_bubblegum::cpi::transfer(
        cpi_ctx,
        root,
        data_hash,
        creator_hash,
        args.nonce,
        args.index,
    )?;

    Event::stake(nft.key(), &nft, staker.key(), &staker, &ctx.accounts.clock)
        .wrap(ctx.accounts.log_wrapper.to_account_info(), crate::id())?;

    Ok(())
}
