use {
    anchor_lang::prelude::*,
    anchor_spl::token::{
        self, Mint, Token, TokenAccount 
    },
    crate::{
        errors::ErrorCode, state::{
            Mission,
            MissionPool,
        }, utils::Randomizer
    },
    hpl_character_manager::{
        cpi::{
            accounts::{
                UseCharacter,
                VerifyCharacter,
            }, 
            use_character,
            verify_character,
        }, 
        instructions::{UseCharacterArgs, VerifyCharacterArgs}, 
        program::HplCharacterManager, 
        state::{
            CharacterModel, 
            CharacterSchema, 
            CharacterSource,
            CharacterUsedBy, 
            DataOrHash,
            EarnedReward, 
        }
    },
    hpl_currency_manager::{
        cpi::{
            accounts::BurnCurrency,
            burn_currency,
        },
        program::HplCurrencyManager,
        state::HolderAccount,
        utils::Currency,
    },
    hpl_events::HplEvents,
    hpl_hive_control::{
        program::HplHiveControl,
        state::{
            Project,
            DelegateAuthority,
            Profile,
            ProfileIdentity,
        },
    },
    rand::Rng,
    spl_account_compression::{
        Noop,
        program::SplAccountCompression,
    },
};

#[derive(Accounts)]
pub struct Participate<'info> {
    #[account(mut)]
    pub project: Box<Account<'info, Project>>,

    #[account()]
    pub mission_pool: Box<Account<'info, MissionPool>>,

    #[account()]
    pub mission: Box<Account<'info, Mission>>,

    #[account( has_one = project )]
    pub character_model: Box<Account<'info, CharacterModel>>,

    /// CHECK: unsafe
    #[account(mut)]
    pub merkle_tree: AccountInfo<'info>,

    #[account(has_one = mint, constraint = mission.cost.address == currency.key())]
    pub currency: Box<Account<'info, Currency>>,
    
    #[account(mut)]
    pub mint: Box<Account<'info, Mint>>,

    #[account(has_one = currency, has_one = token_account, constraint = holder_account.owner == wallet.key())]
    pub holder_account: Box<Account<'info, HolderAccount>>,
    
    #[account(mut)]
    pub token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub wallet: Signer<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub vault: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
    pub compression_program: Program<'info, SplAccountCompression>,

    /// HPL Hive Control Program
    pub hive_control: Program<'info, HplHiveControl>,

    /// HPL Character Manager Program
    pub character_manager: Program<'info, HplCharacterManager>,

    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
    pub currency_manager_program: Program<'info, HplCurrencyManager>,
    pub hpl_events: Program<'info, HplEvents>,
    pub clock: Sysvar<'info, Clock>,
    pub rent_sysvar: Sysvar<'info, Rent>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
    pub log_wrapper: Program<'info, Noop>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ParticipateArgs {
    pub root: [u8; 32],
    pub leaf_idx: u32,
    pub source_hash: [u8; 32],
}
pub fn participate<'info>(ctx: Context<'_, '_, '_, 'info, Participate<'info>>, args: ParticipateArgs) -> Result<()> {

    let mut rng = rand::thread_rng(); 

    // generate rewards for this mission
    // Check if this mission is part of the given mission pool
    if ctx.accounts.mission.mission_pool != ctx.accounts.mission_pool.key() {
        panic!("Mission pool mismatch");
    }

    // Check if this character is allowed to go on this mission
    if !ctx.accounts.mission_pool.character_models.iter().any(|&pubkey| pubkey == ctx.accounts.character_model.key()) {
        panic!("Character model is not allowed on this mission");
    }

    msg!("Mission pool and character model verified. Generating rewards.");

    let earned_rewards = ctx
        .accounts
        .mission
        .rewards
        .iter()
        .enumerate()
        .map(| (i, reward) | {
            let delta = rng.gen_range(0..=255) as u8;
            EarnedReward {
                reward_idx: i as u8,
                delta
            }
        })
        .collect::<Vec<EarnedReward>>();

    msg!("Burning currency according to the mission participation cost");

    burn_currency(
        CpiContext::new(
            ctx.accounts.currency_manager_program.to_account_info(),
            BurnCurrency {
                project: ctx.accounts.project.to_account_info(),
                currency: ctx.accounts.currency.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                holder_account: ctx.accounts.holder_account.to_account_info(),
                token_account: ctx.accounts.token_account.to_account_info(),
                authority: ctx.accounts.wallet.to_account_info(),
                payer: ctx.accounts.wallet.to_account_info(),
                instructions_sysvar: ctx.accounts.instructions_sysvar.to_account_info(),
                vault: ctx.accounts.vault.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                hive_control: ctx.accounts.hive_control.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
            }
        ), 
        ctx.accounts.mission.cost.amount
    )?;

    msg!("Currency burned. Using character for mission.");

    use_character(
        CpiContext::new(
            ctx.accounts.character_manager.to_account_info(),
            UseCharacter {
                project: ctx.accounts.project.to_account_info(),
                character_model: ctx.accounts.character_model.to_account_info(),
                hive_control: ctx.accounts.hive_control.to_account_info(),
                owner: ctx.accounts.wallet.to_account_info(),
                vault: ctx.accounts.vault.to_account_info(),
                user: ctx.accounts.mission.to_account_info(),
                merkle_tree: ctx.accounts.merkle_tree.to_account_info(),
                clock: ctx.accounts.clock.to_account_info(),
                log_wrapper: ctx.accounts.log_wrapper.to_account_info(),
                instructions_sysvar: ctx.accounts.instructions_sysvar.to_account_info(),
                compression_program: ctx.accounts.compression_program.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
            }
        ).with_remaining_accounts(ctx.remaining_accounts.to_vec()),
        UseCharacterArgs {
            root: args.root,
            leaf_idx: args.leaf_idx,
            source_hash: args.source_hash,
            current_used_by: CharacterUsedBy::None,
            new_used_by: CharacterUsedBy::Mission {
                id: ctx.accounts.mission.key(),
                end_time: (ctx.accounts.clock.unix_timestamp as u64 + ctx.accounts.mission.get_duration()),
                rewards: earned_rewards,
            },
        }
    )?;

    msg!("Character used for mission.");

    Ok(())
}

#[derive(Accounts)]
pub struct CollectRewards<'info> {
    #[account( has_one = project )]
    pub character_model: Box<Account<'info, CharacterModel>>,

    #[account(mut)]
    pub project: Box<Account<'info, Project>>,

    #[account(has_one = project)]
    pub mission_pool: Box<Account<'info, MissionPool>>,

    /// MissionsPool delegate account for this project
    /// It is required to mint rewards
    #[account(
        has_one = project,
        constraint = mission_pool_delegate.authority.eq(&mission_pool.key())
    )]
    pub mission_pool_delegate: Option<Box<Account<'info, DelegateAuthority>>>,

    /// Mission state account
    #[account(has_one = mission_pool)]
    pub mission: Box<Account<'info, Mission>>,

    /// User profile account
    #[account(
        mut, 
        has_one = project, 
        constraint = profile.identity == ProfileIdentity::Main, 
    )]
    pub profile: Option<Box<Account<'info, Profile>>>,

    #[account(mut)]
    pub mint: Option<Box<Account<'info, Mint>>>,

    #[account(has_one = mint)]
    pub currency: Option<Box<Account<'info, Currency>>>,

    #[account(
        has_one = currency,
        has_one = token_account,
        constraint = holder_account.owner == wallet.key(),
    )]
    pub holder_account: Option<Box<Account<'info, HolderAccount>>>,

    #[account(mut)]
    pub token_account: Option<Box<Account<'info, TokenAccount>>>,

    #[account(mut)]
    pub wallet: Signer<'info>,

    /// CHECK: This is just used to collect platform fee
    #[account(mut)]
    pub vault: AccountInfo<'info>,

    /// CHECK: unsafe
    #[account(mut)]
    pub merkle_tree: AccountInfo<'info>,

    /// Solana System Program
    pub system_program: Program<'info, System>,

    /// HPL Hive Control Program
    pub hive_control: Program<'info, HplHiveControl>,

    /// HPL Character Manager Program
    pub character_manager: Program<'info, HplCharacterManager>,

    /// HPL Currency Manager Program
    pub currency_manager_program: Program<'info, HplCurrencyManager>,

    /// HPL Events Program
    pub hpl_events: Program<'info, HplEvents>,

    /// SPL Compression Program
    pub compression_program: Program<'info, SplAccountCompression>,

    /// SPL Token Program
    pub token_program: Program<'info, Token>,

    /// Solana Rent Sysvar
    pub rent_sysvar: Sysvar<'info, Rent>,

    /// Solana Instructions Sysvar
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,

    /// Solana Clock Sysvar
    pub clock: Sysvar<'info, Clock>,

    pub log_wrapper: Program<'info, Noop>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CollectRewardsArgs {
    pub root: [u8; 32],
    pub leaf_idx: u32,
    pub source: CharacterSource,
    pub used_by: CharacterUsedBy,
    pub rewards: Vec<EarnedReward>,
}

pub fn collect_rewards(ctx: Context<CollectRewards>, args: CollectRewardsArgs) -> Result<()> {
    // Verify if the character is on the mission
    let verify_character_args = VerifyCharacterArgs {
        root: args.root,
        leaf_idx: args.leaf_idx,
        source: DataOrHash::Data(args.source.clone()),
        used_by: DataOrHash::Data(args.used_by.clone()),
    };

    verify_character(
        CpiContext::new(
            ctx.accounts.character_manager.to_account_info(),
            VerifyCharacter {
                project: ctx.accounts.project.to_account_info(),
                character_model: ctx.accounts.character_model.to_account_info(),
                merkle_tree: ctx.accounts.merkle_tree.to_account_info(),
                user: ctx.accounts.wallet.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                hive_control: ctx.accounts.hive_control.to_account_info(),
                compression_program: ctx.accounts.compression_program.to_account_info(),
                log_wrapper: ctx.accounts.log_wrapper.to_account_info(),
                instructions_sysvar: ctx.accounts.instructions_sysvar.to_account_info(),
            },
        ),
        verify_character_args
    )?;

    // Check if the person is eligible for a reward (time check)
    if let CharacterUsedBy::Mission { end_time, .. } = args.used_by {
        if (ctx.accounts.clock.unix_timestamp as u64) < end_time {
            // Throw error here
        }
    }
    // Give rewards to the player


    Ok(())
}