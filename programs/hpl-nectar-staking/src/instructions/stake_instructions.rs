use {
    crate::{errors::HplNectarStakingError, state::*},
    anchor_lang::prelude::*,
    hpl_character_manager::{
        cpi::{accounts::UseCharacter, use_character},
        instructions::UseCharacterArgs,
        program::HplCharacterManager,
        state::{CharacterModel, CharacterUsedBy},
    },
    hpl_events::HplEvents,
    hpl_hive_control::{program::HplHiveControl, state::Project},
    hpl_utils::Default,
    spl_account_compression::{program::SplAccountCompression, Noop},
};

/// Accounts used in stake instruction
#[derive(Accounts)]
pub struct Stake<'info> {
    // HIVE CONTROL
    #[account()]
    pub project: Box<Account<'info, Project>>,

    #[account(has_one = project)]
    pub character_model: Box<Account<'info, CharacterModel>>,

    /// CHECK: unsafe
    #[account(mut)]
    pub merkle_tree: AccountInfo<'info>,

    /// StakingPool state account
    #[account(mut, has_one = project)]
    pub staking_pool: Box<Account<'info, StakingPool>>,

    /// Staker state account
    #[account(
      init_if_needed, payer = wallet,
      space = Staker::LEN,
      seeds = [
          b"staker",
          wallet.key().as_ref(),
          staking_pool.key().as_ref(),
      ],
      bump,
    )]
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

    /// HPL Character Manager Program
    pub character_manager: Program<'info, HplCharacterManager>,

    /// HPL Events Program
    pub hpl_events: Program<'info, HplEvents>,

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
pub struct StakeArgs {
    root: [u8; 32],
    leaf_idx: u32,
    source_hash: [u8; 32],
    used_by: CharacterUsedBy,
}

/// Stake NFT
pub fn stake<'info>(ctx: Context<'_, '_, '_, 'info, Stake<'info>>, args: StakeArgs) -> Result<()> {
    let staking_pool = &mut ctx.accounts.staking_pool;
    let staker = &mut ctx.accounts.staker;

    if !staker.staking_pool.eq(&staking_pool.key()) || !staker.wallet.eq(&ctx.accounts.wallet.key())
    {
        staker.set_defaults();
        staker.bump = ctx.bumps["staker"];
        staker.staking_pool = staking_pool.key();
        staker.wallet = ctx.accounts.wallet.key();

        Event::new_staker(
            staker.key(),
            staker.try_to_vec().unwrap(),
            &ctx.accounts.clock,
        )
        .emit(ctx.accounts.hpl_events.to_account_info())?;
    }

    let staking_pool_seeds = &[
        b"staking_pool",
        staking_pool.project.as_ref(),
        staking_pool.key.as_ref(),
        &[staking_pool.bump],
    ];
    let staking_pool_signer = &[&staking_pool_seeds[..]];

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
            staking_pool_signer,
        )
        .with_remaining_accounts(ctx.remaining_accounts.to_vec()),
        UseCharacterArgs {
            root: args.root,
            leaf_idx: args.leaf_idx,
            source_hash: args.source_hash,
            current_used_by: args.used_by,
            new_used_by: CharacterUsedBy::Staking {
                pool: staking_pool.key(),
                staker: staker.key(),
                staked_at: ctx.accounts.clock.unix_timestamp,
                claimed_at: ctx.accounts.clock.unix_timestamp,
            },
        },
    )?;

    staking_pool.total_staked += 1;
    staker.total_staked += 1;

    Event::staker_change(
        staker.key(),
        staker.try_to_vec().unwrap(),
        &ctx.accounts.clock,
    )
    .emit(ctx.accounts.hpl_events.to_account_info())?;

    Ok(())
}

/// Accounts used in unstake instruction
#[derive(Accounts)]
pub struct Unstake<'info> {
    // HIVE CONTROL
    #[account()]
    pub project: Box<Account<'info, Project>>,

    #[account(has_one = project)]
    pub character_model: Box<Account<'info, CharacterModel>>,

    /// CHECK: unsafe
    #[account(mut)]
    pub merkle_tree: AccountInfo<'info>,

    /// StakingPool state account
    #[account(mut, has_one = project)]
    pub staking_pool: Box<Account<'info, StakingPool>>,

    /// Staker state account
    #[account(mut, has_one = wallet)]
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

    /// HPL Character Manager Program
    pub character_manager: Program<'info, HplCharacterManager>,

    /// HPL Events Program
    pub hpl_events: Program<'info, HplEvents>,

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

/// Unstake NFT
pub fn unstake<'info>(
    ctx: Context<'_, '_, '_, 'info, Unstake<'info>>,
    args: StakeArgs,
) -> Result<()> {
    let staking_pool = &mut ctx.accounts.staking_pool;
    let staker = &mut ctx.accounts.staker;

    if let CharacterUsedBy::Staking { staked_at, .. } = args.used_by {
        if let Some(min_stake_duration) = staking_pool.min_stake_duration {
            let duration = staked_at + i64::try_from(min_stake_duration).unwrap();
            if ctx.accounts.clock.unix_timestamp < duration {
                msg!(
                    "Min stake duration not reached, remaining {} seconds",
                    duration - ctx.accounts.clock.unix_timestamp
                );
                return Err(HplNectarStakingError::CantUnstakeYet.into());
            }
        }
    }

    let staking_pool_seeds = &[
        b"staking_pool",
        staking_pool.project.as_ref(),
        staking_pool.key.as_ref(),
        &[staking_pool.bump],
    ];
    let staking_pool_signer = &[&staking_pool_seeds[..]];

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
            staking_pool_signer,
        )
        .with_remaining_accounts(ctx.remaining_accounts.to_vec()),
        UseCharacterArgs {
            root: args.root,
            leaf_idx: args.leaf_idx,
            source_hash: args.source_hash,
            current_used_by: args.used_by,
            new_used_by: CharacterUsedBy::None,
        },
    )?;

    staking_pool.total_staked -= 1;
    staker.total_staked -= 1;

    Event::staker_change(
        staker.key(),
        staker.try_to_vec().unwrap(),
        &ctx.accounts.clock,
    )
    .emit(ctx.accounts.hpl_events.to_account_info())?;

    Ok(())
}
