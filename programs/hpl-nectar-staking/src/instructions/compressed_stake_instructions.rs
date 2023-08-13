use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    hpl_hive_control::state::{DelegateAuthority, Project},
    hpl_utils::traits::Default,
    mpl_bubblegum::program::Bubblegum,
    spl_account_compression::{program::SplAccountCompression, Noop},
};

/// Accounts used in init cNFT instruction
#[derive(Accounts)]
pub struct InitCNFT<'info> {
    // Hive Control Project
    #[account()]
    pub project: Box<Account<'info, Project>>,

    /// StakingPool state account
    #[account(has_one = project)]
    pub staking_pool: Account<'info, StakingPool>,

    /// NFT state account
    #[account(
        init, payer = wallet,
        space = NFT::LEN,
        seeds = [
          b"nft",
          asset_id.key().as_ref(),
          staking_pool.key().as_ref(),
        ],
        bump,
      )]
    pub nft: Account<'info, NFTv1>,

    /// cNFT asset id
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub asset_id: AccountInfo<'info>,

    /// CHECK: unsafe
    pub merkle_tree: UncheckedAccount<'info>,

    /// The wallet ownning the cNFT
    #[account(mut)]
    pub wallet: Signer<'info>,

    /// NATIVE SYSTEM PROGRAM
    pub system_program: Program<'info, System>,

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

    #[account(constraint = delegate_authority.authority == wallet.key())]
    pub delegate_authority: Option<Account<'info, DelegateAuthority>>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub vault: AccountInfo<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CNFTArgs {
    root: [u8; 32],
    data_hash: [u8; 32],
    creator_hash: [u8; 32],
    nonce: u64,
    index: u32,
}

/// Init cNFT
pub fn init_cnft(ctx: Context<InitCNFT>, args: CNFTArgs) -> Result<()> {
    let nft = &mut ctx.accounts.nft;
    nft.set_defaults();
    nft.bump = ctx.bumps["nft"];
    nft.staking_pool = ctx.accounts.staking_pool.key();
    nft.mint = ctx.accounts.asset_id.key();
    nft.is_compressed = true;
    nft.criteria = NFTCriteria::MerkleTree {
        address: ctx.accounts.merkle_tree.key(),
    };

    // Verify merkle tree leaf

    let leaf = mpl_bubblegum::state::leaf_schema::LeafSchema::new_v0(
        ctx.accounts.asset_id.key(),
        ctx.accounts.wallet.key(),
        ctx.accounts.wallet.key(),
        args.nonce,
        args.data_hash,
        args.creator_hash,
    );

    spl_account_compression::cpi::verify_leaf(
        CpiContext::new(
            ctx.accounts.compression_program.to_account_info(),
            spl_account_compression::cpi::accounts::VerifyLeaf {
                merkle_tree: ctx.accounts.merkle_tree.to_account_info(),
            },
        ),
        args.root,
        leaf.to_node(),
        args.index,
    )?;

    Event::new_nft(nft.key(), &nft, &ctx.accounts.clock)
        .wrap(ctx.accounts.log_wrapper.to_account_info())?;

    Ok(())
}

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
    pub merkle_tree: UncheckedAccount<'info>,

    /// CHECK: unsafe
    pub tree_authority: UncheckedAccount<'info>,

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
pub fn stake_cnft(ctx: Context<StakeCNFT>, args: CNFTArgs) -> Result<()> {
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

    mpl_bubblegum::cpi::transfer(
        CpiContext::new(
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
        ),
        args.root,
        args.data_hash,
        args.creator_hash,
        args.nonce,
        args.index,
    )?;

    nft.staker = staker.key();
    nft.last_staked_at = ctx.accounts.clock.unix_timestamp;
    if staking_pool.reset_stake_duration {
        nft.staked_at = ctx.accounts.clock.unix_timestamp;
    }

    if nft.last_claim == 0 || staking_pool.reset_stake_duration {
        nft.last_claim = ctx.accounts.clock.unix_timestamp;
    }

    staker.total_staked += 1;

    Event::stake(nft.key(), &nft, staker.key(), &staker, &ctx.accounts.clock)
        .wrap(ctx.accounts.log_wrapper.to_account_info())?;
    Ok(())
}

/// Accounts used in unstake cnft instruction
#[derive(Accounts)]
pub struct UnstakeCNFT<'info> {
    /// StakingPool state account
    #[account(mut, has_one = project)]
    pub staking_pool: Box<Account<'info, StakingPool>>,

    /// NFT state account
    #[account(mut, has_one = staking_pool)]
    pub nft: Box<Account<'info, NFTv1>>,

    /// CHECK: unsafe
    pub merkle_tree: UncheckedAccount<'info>,

    /// CHECK: unsafe
    pub tree_authority: UncheckedAccount<'info>,

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
pub fn unstake_cnft(ctx: Context<UnstakeCNFT>, args: CNFTArgs) -> Result<()> {
    let staking_pool = &mut ctx.accounts.staking_pool;
    let staker = &mut ctx.accounts.staker;
    let nft = &mut ctx.accounts.nft;

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
    nft.staker = Pubkey::default();
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

    mpl_bubblegum::cpi::transfer(
        CpiContext::new_with_signer(
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
        ),
        args.root,
        args.data_hash,
        args.creator_hash,
        args.nonce,
        args.index,
    )?;

    Event::stake(nft.key(), &nft, staker.key(), &staker, &ctx.accounts.clock)
        .wrap(ctx.accounts.log_wrapper.to_account_info())?;

    Ok(())
}
