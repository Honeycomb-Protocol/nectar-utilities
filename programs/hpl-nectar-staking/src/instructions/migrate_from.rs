use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::{prelude::*, solana_program},
    anchor_spl::{
        associated_token::AssociatedToken,
        token::{self, Mint, Token, TokenAccount},
    },
    hpl_hive_control::state::{DelegateAuthority, Project},
    hpl_utils::traits::Default,
    mpl_token_metadata::state::{Metadata, TokenMetadataAccount},
};

/// Accounts used in initialize staker instruction
#[derive(Accounts)]
pub struct MigrateCustodial<'info> {
    /// The wallet that the NFT is associated with
    #[account(mut)]
    pub escrow: Signer<'info>,

    #[account(mut, constraint = nft_account.mint == nft_mint.key() && nft_account.owner == escrow.key())]
    pub nft_account: Box<Account<'info, TokenAccount>>,

    /// StakingPool state account
    #[account()]
    pub staking_pool: Box<Account<'info, StakingPool>>,

    /// NFT state account
    #[account(
      init, payer = payer,
      space = NFT::LEN,
      seeds = [
        b"nft",
        nft_mint.key().as_ref(),
        staking_pool.key().as_ref(),
      ],
      bump,
    )]
    pub nft: Box<Account<'info, NFT>>,

    /// Mint address of the NFT∫
    #[account(mut)]
    pub nft_mint: Box<Account<'info, Mint>>,

    /// NFT token metadata
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub nft_metadata: AccountInfo<'info>,

    /// NFT edition
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub nft_edition: AccountInfo<'info>,

    /// The account that will hold the nft sent on expedition
    #[account(
        init,
        payer = payer,
        seeds = [
            b"deposit",
            nft_mint.key().as_ref(),
        ],
        bump,
        token::mint = nft_mint,
        token::authority = staker,
    )]
    pub deposit_account: Option<Account<'info, TokenAccount>>,

    /// Staker state account
    #[account(mut, has_one = wallet, has_one = staking_pool)]
    pub staker: Box<Account<'info, Staker>>,

    /// The wallet that the NFT is associated with
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub wallet: AccountInfo<'info>,

    /// The wallet that holds the authority over the staking_pool
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The wallet that pays for rent
    #[account(mut)]
    pub payer: Signer<'info>,

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

    /// NATIVE CLOCK SYSVAR
    pub clock: Sysvar<'info, Clock>,

    /// NATIVE Instructions SYSVAR
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = solana_program::sysvar::instructions::ID)]
    pub sysvar_instructions: AccountInfo<'info>,

    // HIVE CONTROL
    #[account()]
    pub project: Box<Account<'info, Project>>,
    #[account(has_one = authority)]
    pub delegate_authority: Option<Account<'info, DelegateAuthority>>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub vault: AccountInfo<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, Default)]
pub struct MigrateArgs {
    staked_at: i64,
    last_claim: i64,
}

/// Initialize staker state
pub fn migrate_custodial(ctx: Context<MigrateCustodial>, args: MigrateArgs) -> Result<()> {
    let staking_pool = &ctx.accounts.staking_pool;
    let nft = &mut ctx.accounts.nft;
    let staker = &mut ctx.accounts.staker;

    // INITIALIZE NFT
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

    let validation_out = hpl_utils::validate_collection_creator(metadata, &collections, &creators)?;

    match validation_out {
        hpl_utils::ValidateCollectionCreatorOutput::Collection { address } => {
            nft.collection = address;
        }
        hpl_utils::ValidateCollectionCreatorOutput::Creator { address } => {
            nft.creator = address;
        }
    }

    match staking_pool.lock_type {
        LockType::Custoday => {
            if let Some(deposit_account) = &ctx.accounts.deposit_account {
                hpl_utils::transfer(
                    1,
                    ctx.accounts.nft_account.to_account_info(),
                    ctx.accounts.escrow.to_account_info(),
                    deposit_account.to_account_info(),
                    staker.to_account_info(),
                    ctx.accounts.nft_mint.to_account_info(),
                    ctx.accounts.nft_metadata.to_account_info(),
                    Some(ctx.accounts.nft_edition.to_account_info()),
                    None,
                    None,
                    ctx.accounts.escrow.to_account_info(),
                    ctx.accounts.wallet.to_account_info(),
                    ctx.accounts.system_program.to_account_info(),
                    ctx.accounts.token_program.to_account_info(),
                    ctx.accounts.associated_token_program.to_account_info(),
                    ctx.accounts.sysvar_instructions.to_account_info(),
                    None,
                    None,
                    None,
                )?;
            } else {
                return Err(ErrorCode::DepositAccountNotProvided.into());
            }
        }
        _ => return Err(ErrorCode::NotImplemented.into()),
    }

    nft.staker = staker.key();
    nft.last_claim = args.last_claim;
    nft.staked_at = args.staked_at;
    nft.last_staked_at = args.staked_at;
    staker.total_staked += 1;

    Ok(())
}
