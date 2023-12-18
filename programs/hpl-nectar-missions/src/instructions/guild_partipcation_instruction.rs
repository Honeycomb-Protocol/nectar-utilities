use {
    crate::{errors::ErrorCode, state::*, utils::RANDOMIZER},
    anchor_lang::prelude::*,
    anchor_spl::token::{self, Mint, Token, TokenAccount},
    hpl_buzz_guild::{
        cpi::{accounts::UseGuild, use_guild},
        errors::ErrorCode as BuzzGuildErrorCode,
        program::HplBuzzGuild,
        state::{Guild, GuildKit, GuildUsedBy},
    },
    hpl_currency_manager::{
        cpi::{
            accounts::{BurnCurrency, MintCurrency},
            burn_currency, mint_currency,
        },
        program::HplCurrencyManager,
        state::{Currency, HolderAccount},
    },
    hpl_events::HplEvents,
    hpl_hive_control::{
        cpi::{accounts::ManageProfileData, manage_profile_data},
        instructions::ManageProfileDataArgs,
        program::HplHiveControl,
        state::{DelegateAuthority, Profile, ProfileData, ProfileIdentity, Project, Service},
    },
    hpl_nectar_staking::{
        program::HplNectarStaking,
        state::{GuildRole, NFTUsedBy, NFTv1, Staker, StakingPool},
    },
    hpl_utils::traits::Default,
    spl_account_compression::program::SplAccountCompression,
};

/// Accounts used in participate Guild instruction
#[derive(Accounts)]
pub struct ParticipateGuild<'info> {
    #[account(mut)]
    pub project: Box<Account<'info, Project>>,

    /// StakingPool state account
    #[account(has_one = project)]
    pub staking_pool: Box<Account<'info, StakingPool>>,

    /// MissionPool account
    #[account(has_one = project)]
    pub mission_pool: Box<Account<'info, MissionPool>>,

    /// GUILD KIT
    #[account(has_one = project)]
    pub guild_kit: Box<Account<'info, GuildKit>>,

    /// Guild state account
    #[account(mut, has_one = guild_kit)]
    pub guild: Box<Account<'info, Guild>>,

    /// Chief NFT
    #[account(mut, has_one = staking_pool, constraint = chief_nft.staker.is_some() && chief_nft.staker.unwrap() == staker.key())]
    pub chief_nft: Box<Account<'info, NFTv1>>,

    /// Mission state account
    #[account(has_one = mission_pool)]
    pub mission: Box<Account<'info, Mission>>,

    /// Staker state account
    #[account(has_one = staking_pool, has_one = wallet)]
    pub staker: Box<Account<'info, Staker>>,

    #[account(has_one = mint, constraint = mission.cost.address == currency.key())]
    pub currency: Box<Account<'info, Currency>>,
    #[account(mut)]
    pub mint: Box<Account<'info, Mint>>,
    #[account(has_one = currency, has_one = token_account, constraint = holder_account.owner == wallet.key())]
    pub holder_account: Box<Account<'info, HolderAccount>>,
    #[account(mut)]
    pub token_account: Box<Account<'info, TokenAccount>>,

    /// Participation state account
    #[account(
      init, payer = wallet,
      space = Participation::LEN,
      seeds = [
        b"participation".as_ref(),
        guild.key().as_ref()
      ],
      bump
    )]
    pub participation: Box<Account<'info, Participation>>,

    #[account(mut)]
    pub wallet: Signer<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub vault: AccountInfo<'info>,
    pub system_program: Program<'info, System>,

    /// HPL Hive Control Program
    pub hive_control: Program<'info, HplHiveControl>,

    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
    pub currency_manager_program: Program<'info, HplCurrencyManager>,
    pub nectar_staking_program: Program<'info, HplNectarStaking>,
    pub hpl_events: Program<'info, HplEvents>,
    pub buzz_guild_program: Program<'info, HplBuzzGuild>,
    pub clock: Sysvar<'info, Clock>,
    pub rent_sysvar: Sysvar<'info, Rent>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

/// participate in a mission
pub fn participate_guild(ctx: Context<ParticipateGuild>) -> Result<()> {
    let participation = &mut ctx.accounts.participation;
    let guild = &mut ctx.accounts.guild;
    let guild_kit = &ctx.accounts.guild_kit;
    let chief_nft = &ctx.accounts.chief_nft;
    let buzz_guild_program = &ctx.accounts.buzz_guild_program;

    participation.set_defaults();
    participation.bump = ctx.bumps["participation"];
    participation.wallet = ctx.accounts.wallet.key();
    participation.mission = ctx.accounts.mission.key();
    participation.instrument = Instrument::Guild(guild.key());
    participation.end_time = ctx.accounts.mission.duration + ctx.accounts.clock.unix_timestamp;

    if !ctx
        .accounts
        .mission_pool
        .staking_pools
        .iter()
        .any(|pool_index| {
            if let Service::Staking { pool_id } =
                ctx.accounts.project.services[*pool_index as usize]
            {
                pool_id == ctx.accounts.staking_pool.key()
            } else {
                false
            }
        })
    {
        panic!("Staking pool did not match");
    }

    let rewards = ctx
        .accounts
        .mission
        .rewards
        .iter()
        .map(|reward| EarnedReward {
            amount: RANDOMIZER.get_random_between(
                ctx.accounts.mission_pool.randomizer_round as usize,
                ctx.accounts.clock.slot,
                reward.min,
                reward.max,
            ),
            reward_type: reward.reward_type.clone(),
            collected: false,
        })
        .collect::<Vec<_>>();

    ctx.accounts.mission_pool.increase_randomizer_round();

    hpl_utils::reallocate(
        (Reward::LEN * rewards.len()) as isize,
        participation.to_account_info(),
        ctx.accounts.wallet.to_account_info(),
        &ctx.accounts.rent_sysvar,
        &ctx.accounts.system_program,
    )?;

    participation.rewards = rewards;

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
            },
        ),
        ctx.accounts.mission.cost.amount,
    )?;

    if let NFTUsedBy::Guild { id, role, .. } = chief_nft.used_by {
        if !id.eq(&guild.key()) || role != GuildRole::Chief {
            return Err(ErrorCode::NftNotRecognized.into());
        }
    } else {
        return Err(BuzzGuildErrorCode::InvalidChief.into());
    }

    use_guild(
        CpiContext::new(
            buzz_guild_program.to_account_info(),
            UseGuild {
                project: ctx.accounts.project.to_account_info(),
                guild_kit: guild_kit.to_account_info(),
                staking_pool: ctx.accounts.staking_pool.to_account_info(),
                guild: guild.to_account_info(),
                staker: ctx.accounts.staker.to_account_info(),
                chief_nft: chief_nft.to_account_info(),
                wallet: ctx.accounts.wallet.to_account_info(),
            },
        ),
        GuildUsedBy::Missions,
    )?;

    events::Event::new_participation(
        participation.key(),
        participation.try_to_vec().unwrap(),
        &ctx.accounts.clock,
    )
    .emit(ctx.accounts.hpl_events.to_account_info())?;

    Ok(())
}

/// Accounts used in recall instruction
#[derive(Accounts)]
pub struct CollectRewardsForGuild<'info> {
    #[account(mut)]
    pub project: Box<Account<'info, Project>>,

    #[account(has_one = project)]
    pub mission_pool: Box<Account<'info, MissionPool>>,

    /// MissionsPool delegate account for this project
    /// It is required to mint rewards
    #[account(has_one = project, constraint = mission_pool_delegate.authority.eq(&mission_pool.key()))]
    pub mission_pool_delegate: Option<Box<Account<'info, DelegateAuthority>>>,

    /// Mission state account
    #[account(has_one = mission_pool)]
    pub mission: Box<Account<'info, Mission>>,

    /// Participation state account
    #[account(mut, has_one = wallet, has_one = mission)]
    pub participation: Box<Account<'info, Participation>>,

    /// User profile account
    #[account(mut, has_one = project, constraint = profile.identity == ProfileIdentity::Main )]
    pub profile: Option<Box<Account<'info, Profile>>>,

    #[account(has_one = mint)]
    pub currency: Option<Box<Account<'info, Currency>>>,

    #[account(mut)]
    pub mint: Option<Box<Account<'info, Mint>>>,

    #[account(has_one = currency, has_one = token_account, constraint = holder_account.owner == wallet.key())]
    pub holder_account: Option<Box<Account<'info, HolderAccount>>>,

    #[account(mut)]
    pub token_account: Option<Box<Account<'info, TokenAccount>>>,

    #[account(mut)]
    pub wallet: Signer<'info>,
    /// CHECK: This is just used to collect platform fee
    #[account(mut)]
    pub vault: AccountInfo<'info>,

    /// Solana System Program
    pub system_program: Program<'info, System>,

    /// HPL Hive Control Program
    pub hive_control: Program<'info, HplHiveControl>,

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
}

/// Collect rewards
pub fn collect_rewards_for_guild(ctx: Context<CollectRewardsForGuild>) -> Result<()> {
    if ctx.accounts.participation.end_time > ctx.accounts.clock.unix_timestamp {
        return Err(ErrorCode::NotEnded.into());
    }

    let mut reward_serial_no: u8 = 0;
    let reward = ctx
        .accounts
        .participation
        .rewards
        .iter_mut()
        .find(|reward| {
            reward_serial_no += 1;
            if ctx.accounts.currency.is_some() {
                reward.reward_type
                    == RewardType::Currency {
                        address: ctx.accounts.currency.as_ref().unwrap().key(),
                    }
                    && !reward.collected
            } else {
                reward.reward_type == RewardType::Xp && !reward.collected
            }
        });

    if reward.is_none() {
        return Err(ErrorCode::RewardNotAvailable.into());
    }

    let reward = reward.unwrap();
    reward.collected = true;

    let res = match reward.reward_type {
        RewardType::Currency { address: _ } => {
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
                reward.amount,
            )
        }
        RewardType::Xp => {
            if ctx.accounts.profile.is_none() {
                return Err(ErrorCode::ProfileNotProvided.into());
            }

            let profile = ctx.accounts.profile.clone().unwrap();
            let mut xp = reward.amount;

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
            )
        }
    };

    res
}

/// Accounts used in recall instruction
#[derive(Accounts)]
pub struct RecallGuild<'info> {
    #[account(mut)]
    pub project: Box<Account<'info, Project>>,

    /// StakingPool state account
    #[account(has_one = project)]
    pub staking_pool: Box<Account<'info, StakingPool>>,

    /// MissionPool account
    #[account(has_one = project)]
    pub mission_pool: Box<Account<'info, MissionPool>>,

    /// GUILD KIT
    #[account(has_one = project)]
    pub guild_kit: Box<Account<'info, GuildKit>>,

    /// Guild state account
    #[account(mut, has_one = guild_kit)]
    pub guild: Box<Account<'info, Guild>>,

    /// Chief NFT
    #[account(mut, has_one = staking_pool, constraint = chief_nft.staker.is_some() && chief_nft.staker.unwrap() == staker.key())]
    pub chief_nft: Box<Account<'info, NFTv1>>,

    /// Mission account
    #[account(has_one = mission_pool)]
    pub mission: Box<Account<'info, Mission>>,

    /// Staker state account
    #[account(has_one = staking_pool, has_one = wallet)]
    pub staker: Box<Account<'info, Staker>>,

    /// Participation state account
    #[account(mut, has_one = wallet, has_one = mission, close = wallet)]
    pub participation: Box<Account<'info, Participation>>,

    #[account(mut)]
    pub wallet: Signer<'info>,

    pub system_program: Program<'info, System>,

    /// HPL Hive Control Program
    pub hive_control: Program<'info, HplHiveControl>,

    pub nectar_staking_program: Program<'info, HplNectarStaking>,
    pub hpl_events: Program<'info, HplEvents>,
    pub buzz_guild_program: Program<'info, HplBuzzGuild>,
    pub clock: Sysvar<'info, Clock>,
    /// NATIVE INSTRUCTIONS SYSVAR
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub vault: AccountInfo<'info>,
}

/// recall from a mission
pub fn recall_guild(ctx: Context<RecallGuild>) -> Result<()> {
    let participation = &mut ctx.accounts.participation;
    let guild = &mut ctx.accounts.guild;
    let guild_kit = &ctx.accounts.guild_kit;
    let chief_nft = &ctx.accounts.chief_nft;
    let buzz_guild_program = &ctx.accounts.buzz_guild_program;

    let reward = participation
        .rewards
        .iter()
        .find(|reward| !reward.collected);

    if reward.is_some() {
        return Err(ErrorCode::RewardsNotCollected.into());
    }

    participation.is_recalled = true;

    use_guild(
        CpiContext::new(
            buzz_guild_program.to_account_info(),
            UseGuild {
                project: ctx.accounts.project.to_account_info(),
                guild_kit: guild_kit.to_account_info(),
                staking_pool: ctx.accounts.staking_pool.to_account_info(),
                guild: guild.to_account_info(),
                staker: ctx.accounts.staker.to_account_info(),
                chief_nft: chief_nft.to_account_info(),
                wallet: ctx.accounts.wallet.to_account_info(),
            },
        ),
        GuildUsedBy::None,
    )?;

    events::Event::recall_participation(
        participation.key(),
        participation.try_to_vec().unwrap(),
        &ctx.accounts.clock,
    )
    .emit(ctx.accounts.hpl_events.to_account_info())?;
    Ok(())
}
