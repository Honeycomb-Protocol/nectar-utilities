use {
    crate::state::MissionPool,
    anchor_lang::prelude::*,
    anchor_spl::token::Mint,
    hpl_hive_control::{
        program::HplHiveControl,
        state::{DelegateAuthority, Project},
    },
    hpl_utils::traits::Default,
    spl_account_compression::Noop,
};

/// Accounts used in create mission_pool instruction
#[derive(Accounts)]
#[instruction(args: CreateMissionPoolArgs)]
pub struct CreateMissionPool<'info> {
    #[account(mut)]
    pub project: Box<Account<'info, Project>>,

    /// MissionPool state account
    #[account(
      init, payer = payer,
      space = MissionPool::LEN,
      seeds = [
        b"mission_pool".as_ref(),
        project.key().as_ref(),
        args.name.as_bytes(),
      ],
      bump
    )]
    pub mission_pool: Box<Account<'info, MissionPool>>,

    /// [Option] Project delegate authority
    #[account(has_one = authority)]
    pub delegate_authority: Option<Account<'info, DelegateAuthority>>,

    /// The wallet that holds the authority over the assembler
    pub authority: Signer<'info>,

    /// The wallet that pays for the rent
    #[account(mut)]
    pub payer: Signer<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub vault: AccountInfo<'info>,

    /// SYSTEM PROGRAM
    pub system_program: Program<'info, System>,
    pub log_wrapper: Program<'info, Noop>,
    pub clock_sysvar: Sysvar<'info, Clock>,
    pub rent_sysvar: Sysvar<'info, Rent>,
    /// NATIVE INSTRUCTIONS SYSVAR
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
    pub hive_control: Program<'info, HplHiveControl>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct CreateMissionPoolArgs {
    pub name: String,
    pub factions_merkle_root: [u8; 32],
}

/// Create a new mission_pool
pub fn create_mission_pool(
    ctx: Context<CreateMissionPool>,
    args: CreateMissionPoolArgs,
) -> Result<()> {
    let mission_pool = &mut ctx.accounts.mission_pool;
    mission_pool.set_defaults();

    mission_pool.bump = ctx.bumps["mission_pool"];
    mission_pool.project = ctx.accounts.project.key();
    mission_pool.name = args.name;
    mission_pool.factions_merkle_root = args.factions_merkle_root;

    Ok(())
}

/// Accounts used in update mission_pool instruction
#[derive(Accounts)]
pub struct UpdateMissionPool<'info> {
    #[account()]
    pub project: Box<Account<'info, Project>>,

    /// MissionPool state account
    #[account(mut, has_one = project)]
    pub mission_pool: Account<'info, MissionPool>,

    /// Collection mint address to be used for the mission_pool
    pub collection: Option<Account<'info, Mint>>,

    /// Creator address to be used for the mission_pool
    /// CHECK: This is not dangerous because we don't read or write from this account
    pub creator: Option<AccountInfo<'info>>,

    #[account(has_one = authority)]
    pub delegate_authority: Option<Account<'info, DelegateAuthority>>,

    /// The wallet that holds authority for this action
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The wallet that pays for the rent
    #[account(mut)]
    pub payer: Signer<'info>,

    /// NATIVE SYSTEM PROGRAM
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
    /// NATIVE INSTRUCTIONS SYSVAR
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub vault: AccountInfo<'info>,
}
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct UpdateMissionPoolArgs {
    pub factions_merkle_root: Option<[u8; 32]>,
}
/// Update a mission_pool
pub fn update_mission_pool(
    ctx: Context<UpdateMissionPool>,
    args: UpdateMissionPoolArgs,
) -> Result<()> {
    let mission_pool = &mut ctx.accounts.mission_pool;

    mission_pool.factions_merkle_root = args
        .factions_merkle_root
        .unwrap_or(mission_pool.factions_merkle_root);

    if let Some(collection) = &ctx.accounts.collection {
        let index = ctx
            .accounts
            .project
            .collections
            .iter()
            .position(|x| x.eq(&collection.key()))
            .unwrap();
        hpl_utils::reallocate(
            1,
            mission_pool.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            &ctx.accounts.rent,
            &ctx.accounts.system_program,
        )?;
        mission_pool.collections.push(index as u8);
    }

    if let Some(creator) = &ctx.accounts.creator {
        let index = ctx
            .accounts
            .project
            .creators
            .iter()
            .position(|x| x.eq(&creator.key()))
            .unwrap();
        hpl_utils::reallocate(
            1,
            mission_pool.to_account_info(),
            ctx.accounts.payer.to_account_info(),
            &ctx.accounts.rent,
            &ctx.accounts.system_program,
        )?;
        mission_pool.creators.push(index as u8);
    }

    Ok(())
}
