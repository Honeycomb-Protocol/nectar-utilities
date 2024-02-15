use {
    crate::{
        errors::ErrorCode, 
        state::{
            Mission,
            MissionPool,
            RewardType,
        }, 
        utils::{Randomizer, RANDOMIZER} 
    }, 
    anchor_lang::prelude::*, 
    anchor_spl::token::{
        self, 
        Mint, 
        Token, 
        TokenAccount, 
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
        instructions::{ 
            UseCharacterArgs, 
            VerifyCharacterArgs,
        }, 
        program::HplCharacterManager, 
        state::{
            CharacterModel, 
            CharacterSource,
            CharacterUsedBy, 
            DataOrHash,
            EarnedReward, 
        }
    }, 
    hpl_compression::ToNode, 
    hpl_currency_manager::{
        cpi::{
            accounts::{BurnCurrency, MintCurrency},
            burn_currency, mint_currency,
        },
        program::HplCurrencyManager,
        state::HolderAccount,
        utils::Currency,
    }, 
    hpl_events::HplEvents, 
    hpl_hive_control::{
        cpi::{
            accounts::ManageProfileData,
            manage_profile_data,
        },
        instructions::ManageProfileDataArgs,
        program::HplHiveControl,
        state::{
            DelegateAuthority, Profile, ProfileData, ProfileIdentity, Project
        },
    },
    spl_account_compression::{
        program::SplAccountCompression, Noop
    }
};

#[derive(Accounts)]
pub struct Participate<'info> {
    #[account(mut)]
    pub project: Box<Account<'info, Project>>,

    #[account(mut)]
    pub mission_pool: Box<Account<'info, MissionPool>>,

    #[account(mut)]
    pub mission: Box<Account<'info, Mission>>,

    #[account(mut, has_one = project )]
    pub character_model: Box<Account<'info, CharacterModel>>,

    /// CHECK: unsafe
    #[account(mut)]
    pub merkle_tree: AccountInfo<'info>,

    #[account(has_one = mint, constraint = mission.cost.address == currency.key())]
    pub currency: Box<Account<'info, Currency>>,
    
    #[account(mut)]
    pub mint: Box<Account<'info, Mint>>,

    #[account(mut, has_one = currency, has_one = token_account, constraint = holder_account.owner == wallet.key())]
    pub holder_account: Box<Account<'info, HolderAccount>>,
    
    #[account(mut)]
    pub token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub wallet: Signer<'info>,

    /// User profile account
    #[account(
        mut, 
        has_one = project, 
        constraint = profile.identity == ProfileIdentity::Main, 
    )]
    pub profile: Box<Account<'info, Profile>>,

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

    // Check if this character is allowed to go on this mission
    if !ctx.accounts.mission_pool.character_models.iter().any(|&pubkey| pubkey == ctx.accounts.character_model.key()) {
        panic!("Character model is not allowed on this mission");
    }

    // Check if the profile has the minimum XP required to take part in this mission
    if let Some(profile_data) = ctx.accounts.profile.app_context.get("nectar_missions_xp") {
        match profile_data {
            ProfileData::SingleValue(value) => {
                let xp = value.parse::<u64>().unwrap();
                if xp < ctx.accounts.mission.min_xp {
                    return Err(ErrorCode::InsufficientXp.into());
                }
            },
            _ => panic!("Invalid profile data"),
        }
    };

    msg!("Mission pool and character model verified. Profile has enough XP to participate. Generating rewards.");

    let earned_rewards = ctx
        .accounts
        .mission
        .rewards
        .iter()
        .enumerate()
        .map(| ( i, .. ) | {
            let delta = RANDOMIZER.get_random(
                ctx.accounts.mission_pool.randomizer_round as usize,
                ctx.accounts.clock.slot,
            );
            ctx.accounts.mission_pool.increase_randomizer_round();
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
        CpiContext::new_with_signer(
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
            },
            &[&[
                b"mission".as_ref(),
                ctx.accounts.mission_pool.key().as_ref(),
                ctx.accounts.mission.name.as_bytes(),
                &[ctx.accounts.mission.bump],
            ]],
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
                rewards_collected: false,
            },
        }
    )?;

    msg!("Character is now being used by the mission.");

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
    pub source_hash: [u8; 32],
    pub used_by: CharacterUsedBy,
}

pub fn collect_rewards<'info>(
    ctx: Context<'_, '_, '_, 'info, CollectRewards<'info>>, 
    args: CollectRewardsArgs
) -> Result<()> {
    // Verify if the character is on the mission
    msg!("Collecting rewards (mission).");
    msg!("Verifying character data.");
    let verify_character_args = VerifyCharacterArgs {
        root: args.root,
        leaf_idx: args.leaf_idx,
        source: DataOrHash::Hash(args.source_hash.clone()),
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

    msg!("Character verified. Determining if the character is eligible for rewards.");
    let (mission_id, earned_rewards, mission_end_time, mission_rewards_collected) = match &args.used_by {
        CharacterUsedBy::Mission { id, rewards, end_time, rewards_collected } => (id, rewards, end_time, rewards_collected),
        _ => panic!("Character is not on a mission"),
    };

    // Check if the person is eligible for rewards (time check)
    if *mission_end_time > ctx.accounts.clock.unix_timestamp.try_into().unwrap() {
        return Err(ErrorCode::NotEnded.into());
    }
    
    msg!("Character is eligible for rewards. Checking if rewards have already been collected.");
    if *mission_rewards_collected {
        return Err(ErrorCode::RewardNotAvailable.into());
    }

    msg!("Rewards haven't been collected. Updating the leaf.");
    use_character(
        CpiContext::new(
            ctx.accounts.character_manager.to_account_info(),
            UseCharacter {
                project: ctx.accounts.project.to_account_info(),
                character_model: ctx.accounts.character_model.to_account_info(),
                hive_control: ctx.accounts.hive_control.to_account_info(),
                vault: ctx.accounts.vault.to_account_info(),
                owner: ctx.accounts.wallet.to_account_info(),
                user: ctx.accounts.mission.to_account_info(),
                merkle_tree: ctx.accounts.merkle_tree.to_account_info(),
                clock: ctx.accounts.clock.to_account_info(),
                log_wrapper: ctx.accounts.log_wrapper.to_account_info(),
                instructions_sysvar: ctx.accounts.instructions_sysvar.to_account_info(),
                compression_program: ctx.accounts.compression_program.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
            },
        ).with_remaining_accounts(ctx.remaining_accounts.to_vec()),
        UseCharacterArgs {
            root: args.root,
            leaf_idx: args.leaf_idx,
            source_hash: args.source_hash,
            current_used_by: args.used_by.clone(),
            new_used_by: CharacterUsedBy::Mission {
                id: *mission_id,
                end_time: *mission_end_time,
                rewards: earned_rewards.clone(),
                rewards_collected: true,
            },
        }
    )?;

    msg!("Collecting rewards.");
    for earned_reward in earned_rewards.iter() {
        let reward = ctx.accounts.mission.rewards.get(earned_reward.reward_idx as usize).unwrap();
        match reward.reward_type {
            RewardType::Xp => {
                if ctx.accounts.profile.is_none() {
                    return Err(ErrorCode::ProfileNotProvided.into());
                }

                let profile = ctx.accounts.profile.clone().unwrap();
                let mut xp = Randomizer::get_result_from_delta(reward.min, reward.max, earned_reward.delta);

                if let Some(profile_data) = profile.app_context.get("nectar_missions_xp") {
                    match profile_data {
                        ProfileData::SingleValue(value) => xp += value.parse::<u64>().unwrap(),
                        _ => {}
                    }
                }

                manage_profile_data(
                    CpiContext::new(
                        ctx.accounts.hive_control.to_account_info(),
                        ManageProfileData {
                            project: ctx.accounts.project.to_account_info(),
                            profile: profile.to_account_info(),
                            delegate_authority: None,
                            authority: ctx.accounts.wallet.to_account_info(),
                            payer: ctx.accounts.wallet.to_account_info(),
                            rent_sysvar: ctx.accounts.rent_sysvar.to_account_info(),
                            system_program: ctx.accounts.system_program.to_account_info(),
                            hpl_events: ctx.accounts.hpl_events.to_account_info(),
                            clock: ctx.accounts.clock.to_account_info(),
                            vault: ctx.accounts.vault.to_account_info(),
                            instructions_sysvar: ctx.accounts.instructions_sysvar.to_account_info(),
                        },
                    ),
                    ManageProfileDataArgs {
                        label: String::from("nectar_missions_xp"),
                        value: Some(ProfileData::SingleValue(String::from((xp).to_string()))),
                        is_app_context: true,
                    },
                )?;
            },
            RewardType::Currency { .. } => {
                if ctx.accounts.mint.is_none()
                    || ctx.accounts.holder_account.is_none()
                    || ctx.accounts.token_account.is_none()
                    || ctx.accounts.mission_pool_delegate.is_none()
                {
                    return Err(ErrorCode::HolderAccountsNotProvided.into());
                }

                let mission_pool_seeds = &[
                    b"mission_pool".as_ref(),
                    ctx.accounts.mission_pool.project.as_ref(),
                    ctx.accounts.mission_pool.name.as_bytes(),
                    &[ctx.accounts.mission_pool.bump],
                ];
                let signer = &[&mission_pool_seeds[..]];

                let reward_amount = Randomizer::get_result_from_delta(reward.min, reward.max, earned_reward.delta);

                mint_currency(
                    CpiContext::new_with_signer(
                        ctx.accounts.currency_manager_program.to_account_info(),
                        MintCurrency {
                            project: ctx.accounts.project.to_account_info(),
                            currency: ctx.accounts.currency.clone().unwrap().to_account_info(),
                            mint: ctx.accounts.mint.clone().unwrap().to_account_info(),
                            holder_account: ctx
                                .accounts
                                .holder_account
                                .clone()
                                .unwrap()
                                .to_account_info(),
                            token_account: ctx
                                .accounts
                                .token_account
                                .clone()
                                .unwrap()
                                .to_account_info(),
                            delegate_authority: Some(
                                ctx.accounts
                                    .mission_pool_delegate
                                    .clone()
                                    .unwrap()
                                    .to_account_info(),
                            ),
                            authority: ctx.accounts.mission_pool.to_account_info(),
                            payer: ctx.accounts.wallet.to_account_info(),
                            instructions_sysvar: ctx.accounts.instructions_sysvar.to_account_info(),
                            vault: ctx.accounts.vault.to_account_info(),
                            system_program: ctx.accounts.system_program.to_account_info(),
                            hive_control: ctx.accounts.hive_control.to_account_info(),
                            token_program: ctx.accounts.token_program.to_account_info(),
                        },
                        signer,
                    ),
                    reward_amount,
                )?;
            },
        }
    }
    msg!("Rewards collected.");

    Ok(())
}

#[derive(Accounts)]
pub struct RecallCharacter<'info> {
    #[account( has_one = project )]
    pub character_model: Box<Account<'info, CharacterModel>>,

    #[account(mut)]
    pub project: Box<Account<'info, Project>>,

    #[account(has_one = project)]
    pub mission_pool: Box<Account<'info, MissionPool>>,

    /// Mission state account
    #[account(has_one = mission_pool)]
    pub mission: Box<Account<'info, Mission>>,

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

    /// HPL Events Program
    pub hpl_events: Program<'info, HplEvents>,

    /// SPL Compression Program
    pub compression_program: Program<'info, SplAccountCompression>,

    /// Solana Instructions Sysvar
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,

    /// Solana Clock Sysvar
    pub clock: Sysvar<'info, Clock>,

    pub log_wrapper: Program<'info, Noop>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct RecallCharacterArgs {
    pub root: [u8; 32],
    pub leaf_idx: u32,
    pub source_hash: [u8; 32],
    pub used_by: CharacterUsedBy,
}

pub fn recall_character<'info>(
    ctx: Context<'_, '_, '_, 'info, RecallCharacter<'info>>, 
    args: RecallCharacterArgs
) -> Result<()> {
    // Verify if the character is on the mission
    msg!("Verifying character data.");

    let verify_character_args = VerifyCharacterArgs {
        root: args.root,
        leaf_idx: args.leaf_idx,
        source: DataOrHash::Hash(args.source_hash.clone()),
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

    msg!("Character verified. Determining if rewards can be collected.");

    // Check if the person is eligible for a reward and rewards haven't been collected
    if let CharacterUsedBy::Mission { end_time, rewards, rewards_collected, .. } = &args.used_by {
        if *end_time < ctx.accounts.clock.unix_timestamp.try_into().unwrap() && !rewards.is_empty() && !rewards_collected {
            return Err(ErrorCode::RewardsNotCollected.into());
        }
    }

    // Recall the character
    let mission_pool_key = ctx.accounts.mission_pool.key();
    let mission_name = &ctx.accounts.mission.name;

    let mission_seeds = &[
        b"mission".as_ref(),
        mission_pool_key.as_ref(),
        mission_name.as_bytes(),
        &[ctx.accounts.mission.bump],
    ];

    let mission_signer = &[&mission_seeds[..]];

    use_character(
        CpiContext::new_with_signer(
            ctx.accounts.character_manager.to_account_info(),
            UseCharacter {
                project: ctx.accounts.project.to_account_info(),
                character_model: ctx.accounts.character_model.to_account_info(),
                hive_control: ctx.accounts.hive_control.to_account_info(),
                vault: ctx.accounts.vault.to_account_info(),
                owner: ctx.accounts.wallet.to_account_info(),
                user: ctx.accounts.mission.to_account_info(),
                merkle_tree: ctx.accounts.merkle_tree.to_account_info(),
                clock: ctx.accounts.clock.to_account_info(),
                log_wrapper: ctx.accounts.log_wrapper.to_account_info(),
                instructions_sysvar: ctx.accounts.instructions_sysvar.to_account_info(),
                compression_program: ctx.accounts.compression_program.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
            },
            mission_signer
        ).with_remaining_accounts(ctx.remaining_accounts.to_vec()),
        UseCharacterArgs {
            root: args.root,
            leaf_idx: args.leaf_idx,
            source_hash: args.source_hash,
            current_used_by: args.used_by,
            new_used_by: CharacterUsedBy::None,
        }
    )?;

    msg!("Character recalled.");

    Ok(())
}