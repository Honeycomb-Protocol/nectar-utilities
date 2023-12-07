use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    anchor_spl::token::Mint,
    hpl_events::HplEvents,
    hpl_hive_control::{
        program::HplHiveControl,
        state::{DelegateAuthority, Project},
    },
    hpl_utils::traits::Default,
    mpl_token_metadata::state::{Metadata, TokenMetadataAccount},
    spl_account_compression::program::SplAccountCompression,
};

/// Accounts used in init NFT instruction
#[derive(Accounts)]
pub struct InitNFT<'info> {
    /// StakingPool state account
    #[account(has_one = project)]
    pub staking_pool: Box<Account<'info, StakingPool>>,

    /// NFT state account
    #[account(
        init, payer = wallet,
        space = NFTv1::LEN,
        seeds = [
          b"nft",
          nft_mint.key().as_ref(),
          staking_pool.key().as_ref(),
        ],
        bump,
      )]
    pub nft: Box<Account<'info, NFTv1>>,

    /// Mint address of the NFT
    #[account(mut)]
    pub nft_mint: Account<'info, Mint>,

    /// NFT token metadata
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub nft_metadata: AccountInfo<'info>,

    /// The wallet that pays for the rent
    #[account(mut)]
    pub wallet: Signer<'info>,

    /// NATIVE SYSTEM PROGRAM
    pub system_program: Program<'info, System>,

    /// HPL Hive Control Program
    pub hive_control: Program<'info, HplHiveControl>,

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
    #[account(constraint = delegate_authority.authority == wallet.key())]
    pub delegate_authority: Option<Account<'info, DelegateAuthority>>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub vault: AccountInfo<'info>,
}

/// Init NFT
pub fn init_nft(ctx: Context<InitNFT>) -> Result<()> {
    let staking_pool = &ctx.accounts.staking_pool;

    let nft = &mut ctx.accounts.nft;
    nft.set_defaults();
    nft.bump = ctx.bumps["nft"];
    nft.staking_pool = ctx.accounts.staking_pool.key();
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

    let validation_out = hpl_utils::validate_collection_creator(metadata, &collections, &creators);

    Event::new_nft(nft.key(), nft.try_to_vec().unwrap(), &ctx.accounts.clock)
        .emit(ctx.accounts.hpl_events.to_account_info())?;

    match validation_out {
        Ok(x) => {
            match x {
                hpl_utils::ValidateCollectionCreatorOutput::Collection { address } => {
                    nft.criteria = NFTCriteria::Collection { address };
                    msg!("Collection: {:?}", address);
                }
                hpl_utils::ValidateCollectionCreatorOutput::Creator { address } => {
                    nft.criteria = NFTCriteria::Creator { address };
                    msg!("Creator: {:?}", address);
                }
            }
            // msg!("JSON NFT: {:?}", nft);
            return Ok(());
        }
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
    }
}

/// Accounts used in init cNFT instruction
#[derive(Accounts)]
pub struct InitCNFT<'info> {
    // Hive Control Project
    #[account()]
    pub project: Box<Account<'info, Project>>,

    /// StakingPool state account
    #[account(has_one = project)]
    pub staking_pool: Box<Account<'info, StakingPool>>,

    /// NFT state account
    #[account(
        init, payer = wallet,
        space = NFTv1::LEN,
        seeds = [
          b"nft",
          asset_id.key().as_ref(),
          staking_pool.key().as_ref(),
        ],
        bump,
      )]
    pub nft: Box<Account<'info, NFTv1>>,

    /// cNFT asset id
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub asset_id: AccountInfo<'info>,

    /// CHECK: unsafe
    pub merkle_tree: UncheckedAccount<'info>,

    /// CHECK: unsafe
    pub data_hash: UncheckedAccount<'info>,

    /// CHECK: unsafe
    pub root: UncheckedAccount<'info>,

    /// CHECK: unsafe
    pub creator_hash: UncheckedAccount<'info>,

    /// The wallet ownning the cNFT
    #[account(mut)]
    pub wallet: Signer<'info>,

    /// NATIVE SYSTEM PROGRAM
    pub system_program: Program<'info, System>,

    /// HPL Hive Control Program
    pub hive_control: Program<'info, HplHiveControl>,

    /// SPL Compression Program
    pub compression_program: Program<'info, SplAccountCompression>,

    /// HPL Events Program
    pub hpl_events: Program<'info, HplEvents>,

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
    // pub root: [u8; 32],
    // pub data_hash: [u8; 32],
    // pub creator_hash: [u8; 32],
    pub nonce: u64,
    pub index: u32,
}

/// Init cNFT
pub fn init_cnft<'info>(
    ctx: Context<'_, '_, '_, 'info, InitCNFT<'info>>,
    args: CNFTArgs,
) -> Result<()> {
    let nft = &mut ctx.accounts.nft;
    nft.set_defaults();
    nft.bump = ctx.bumps["nft"];
    nft.staking_pool = ctx.accounts.staking_pool.key();
    nft.mint = ctx.accounts.asset_id.key();
    nft.is_compressed = true;
    nft.criteria = NFTCriteria::MerkleTree {
        address: ctx.accounts.merkle_tree.key(),
    };
    let creator_hash: [u8; 32] = ctx.accounts.creator_hash.key().to_bytes();
    let data_hash: [u8; 32] = ctx.accounts.data_hash.key().to_bytes();
    let root: [u8; 32] = ctx.accounts.root.key().to_bytes();

    msg!("Creating Leaf");

    let leaf = mpl_bubblegum::state::leaf_schema::LeafSchema::new_v0(
        ctx.accounts.asset_id.key(),
        ctx.accounts.wallet.key(),
        ctx.accounts.wallet.key(),
        args.nonce,
        data_hash,
        creator_hash,
    );

    msg!("Verifying Leaf {} bytes", leaf.to_node().len());

    let cpi_ctx = CpiContext::new(
        ctx.accounts.compression_program.to_account_info(),
        spl_account_compression::cpi::accounts::VerifyLeaf {
            merkle_tree: ctx.accounts.merkle_tree.to_account_info(),
        },
    )
    .with_remaining_accounts(ctx.remaining_accounts.to_vec());
    spl_account_compression::cpi::verify_leaf(cpi_ctx, root, leaf.to_node(), args.index)?;

    msg!("Verified Leaf");

    msg!(
        "Verifying Merkle tree: {:?}",
        ctx.accounts.merkle_tree.key()
    );

    let found = ctx
        .accounts
        .staking_pool
        .merkle_trees
        .iter()
        .find(|i| ctx.accounts.project.merkle_trees[**i as usize].eq(ctx.accounts.merkle_tree.key))
        .is_some();
    if !found {
        return Err(ErrorCode::InvalidNFT.into());
    }

    msg!("Verified Merkle tree");

    msg!("Emittinng Event");

    Event::new_nft(nft.key(), nft.try_to_vec().unwrap(), &ctx.accounts.clock)
        .emit(ctx.accounts.hpl_events.to_account_info())?;

    msg!("Emitted Event");

    Ok(())
}

/// Accounts used in use NFT instruction
#[derive(Accounts)]
pub struct UseNft<'info> {
    // Hive Control Project
    #[account()]
    pub project: Box<Account<'info, Project>>,

    /// StakingPool state account
    #[account()]
    pub staking_pool: Box<Account<'info, StakingPool>>,

    /// StakingPool state account
    #[account(has_one = staking_pool, has_one = wallet)]
    pub staker: Box<Account<'info, Staker>>,

    /// NFT state account
    #[account(mut, constraint = nft.staker.is_some() && nft.staker.unwrap().eq(&staker.key()))]
    pub nft: Account<'info, NFTv1>,

    /// The wallet ownning the cNFT
    #[account(mut)]
    pub wallet: Signer<'info>,

    /// NATIVE SYSTEM PROGRAM
    pub system_program: Program<'info, System>,

    /// HPL Hive Control Program
    pub hive_control: Program<'info, HplHiveControl>,

    /// HPL Events Program
    pub hpl_events: Program<'info, HplEvents>,

    /// NATIVE CLOCK SYSVAR
    pub clock: Sysvar<'info, Clock>,

    /// NATIVE INSTRUCTIONS SYSVAR
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub vault: AccountInfo<'info>,
}

/// Use NFT
pub fn use_nft<'info>(ctx: Context<UseNft>, used_by: NFTUsedBy) -> Result<()> {
    // if used_by != NFTUsedBy::None && ctx.accounts.nft.used_by != NFTUsedBy::None {
    //     msg!("NFT Already used");
    //     return Err(ErrorCode::NFTAlreadyUsed.into());
    // }

    ctx.accounts.nft.used_by = used_by;

    Event::nft_used(
        ctx.accounts.nft.key(),
        ctx.accounts.nft.try_to_vec().unwrap(),
        &ctx.accounts.clock,
    )
    .emit(ctx.accounts.hpl_events.to_account_info())?;

    Ok(())
}

/// Accounts used in use NFT instruction
#[derive(Accounts)]
pub struct CloseNft<'info> {
    // Hive Control Project
    #[account()]
    pub project: Box<Account<'info, Project>>,

    /// NFT state account
    #[account(mut, constraint = nft.staker.is_none(), close = authority)]
    pub nft: Account<'info, NFTv1>,

    /// The wallet ownning the cNFT
    #[account(mut)]
    pub authority: Signer<'info>,

    /// NATIVE SYSTEM PROGRAM
    pub system_program: Program<'info, System>,

    /// HPL Hive Control Program
    pub hive_control: Program<'info, HplHiveControl>,

    /// NATIVE INSTRUCTIONS SYSVAR
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub vault: AccountInfo<'info>,
}

/// Close NFT
pub fn close_nft<'info>(_ctx: Context<CloseNft>) -> Result<()> {
    Ok(())
}
