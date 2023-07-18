use {
    crate::{errors::ErrorCode, state::*, utils::RANDOMIZER},
    anchor_lang::prelude::*,
    anchor_spl::token::{self, Mint, Token, TokenAccount},
    hpl_currency_manager::{
        cpi::{accounts::TransferCurrency, transfer_currency},
        program::HplCurrencyManager,
        state::{Currency, HolderAccount},
    },
    hpl_hive_control::{
        cpi::{accounts::ManageProfileData, add_profile_data, modify_profile_data},
        instructions::{
            AddProfileDataArgs, AddProfileDataArgsValue, ModifyProfileDataArgs,
            ModifyProfileDataArgsValue,
        },
        program::HplHiveControl,
        state::{Profile, ProfileData, ProfileIdentity, Project},
    },
    hpl_nectar_staking::state::{Staker, StakingPool, NFT},
    hpl_utils::traits::Default,
    spl_account_compression::{program::SplAccountCompression, Noop},
};

/// Accounts used in participate instruction
#[derive(Accounts)]
pub struct Participate<'info> {
    #[account(mut)]
    pub project: Box<Account<'info, Project>>,

    /// StakingPool state account
    #[account(has_one = project)]
    pub staking_pool: Box<Account<'info, StakingPool>>,

    /// MissionPool account
    #[account(mut, has_one = project)]
    pub mission_pool: Box<Account<'info, MissionPool>>,

    /// Mission state account
    #[account(has_one = mission_pool)]
    pub mission: Box<Account<'info, Mission>>,

    /// NFT state account
    #[account(has_one = staking_pool, has_one = staker)]
    pub nft: Box<Account<'info, NFT>>,

    /// Staker state account
    #[account(has_one = staking_pool, has_one = wallet)]
    pub staker: Box<Account<'info, Staker>>,

    #[account(has_one = mint, constraint = mission.cost.address == currency.key())]
    pub currency: Box<Account<'info, Currency>>,
    #[account()]
    pub mint: Box<Account<'info, Mint>>,
    #[account(has_one = currency, constraint = vault_holder_account.token_account == vault_token_account.key() && vault_holder_account.owner == mission_pool.key())]
    pub vault_holder_account: Box<Account<'info, HolderAccount>>,
    #[account(mut)]
    pub vault_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut, has_one = currency, has_one = token_account, constraint = holder_account.owner == wallet.key())]
    pub holder_account: Box<Account<'info, HolderAccount>>,
    #[account(mut)]
    pub token_account: Box<Account<'info, TokenAccount>>,

    /// Participation state account
    #[account(
      init, payer = wallet,
      space = Participation::LEN,
      seeds = [
        b"participation".as_ref(),
        nft.key().as_ref()
      ],
      bump
    )]
    pub participation: Box<Account<'info, Participation>>,

    #[account(mut)]
    pub wallet: Signer<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub vault: AccountInfo<'info>,
    pub rent_sysvar: Sysvar<'info, Rent>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
    pub clock: Sysvar<'info, Clock>,
    pub system_program: Program<'info, System>,
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
    pub currency_manager_program: Program<'info, HplCurrencyManager>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct ParticipateArgs {
    pub faction: Option<String>,
    pub merkle_proof: Option<Vec<[u8; 32]>>,
}

/// participate in a mission
pub fn participate(ctx: Context<Participate>, args: ParticipateArgs) -> Result<()> {
    let participation = &mut ctx.accounts.participation;
    participation.set_defaults();
    participation.bump = ctx.bumps["participation"];
    participation.wallet = ctx.accounts.wallet.key();
    participation.mission = ctx.accounts.mission.key();
    participation.nft = ctx.accounts.nft.key();
    participation.end_time = ctx.accounts.mission.duration + ctx.accounts.clock.unix_timestamp;

    if ctx.accounts.mission_pool.factions_merkle_root[0] != 0 {
        if args.faction.is_none() {
            return Err(ErrorCode::FactionNotProvided.into());
        }

        if args.merkle_proof.is_none() {
            return Err(ErrorCode::MerkleProofNotProvided.into());
        }

        let node = hpl_utils::merkle_tree::create_node(&[
            &[0x00],
            args.faction.unwrap().as_bytes(),
            ctx.accounts.nft.mint.as_ref(),
        ]);
        if !hpl_utils::merkle_tree::verify_merkle(
            args.merkle_proof.unwrap(),
            ctx.accounts.mission_pool.factions_merkle_root,
            node.0,
        ) {
            return Err(ErrorCode::InvalidProof.into());
        }
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

    if ctx.accounts.nft.last_staked_at < ctx.accounts.nft.last_unstaked_at {
        return Err(ErrorCode::NotStaked.into());
    }

    let mut index = 0;
    let collection = ctx
        .accounts
        .project
        .collections
        .iter()
        .filter_map(|x| {
            let key = if ctx.accounts.mission_pool.collections.contains(&index) {
                Some(*x)
            } else {
                None
            };
            index += 1;
            key
        })
        .any(|collection| collection.eq(&ctx.accounts.nft.collection));

    msg!(
        "index: {}, collection: {:?}, needed: {:?}",
        index,
        ctx.accounts.nft.collection,
        ctx.accounts.project.collections
    );

    if !collection {
        index = 0;
        let creator = ctx
            .accounts
            .project
            .creators
            .iter()
            .filter_map(|x| {
                let key = if ctx.accounts.mission_pool.creators.contains(&index) {
                    Some(*x)
                } else {
                    None
                };
                index += 1;
                key
            })
            .any(|creator| creator.eq(&ctx.accounts.nft.creator));

        msg!(
            "index: {}, creator: {:?}, needed: {:?}",
            index,
            ctx.accounts.nft.creator,
            ctx.accounts.project.creators
        );

        if !creator {
            return Err(ErrorCode::NftNotRecognized.into());
        }
    }

    transfer_currency(
        CpiContext::new(
            ctx.accounts.currency_manager_program.to_account_info(),
            TransferCurrency {
                project: ctx.accounts.project.to_account_info(),
                currency: ctx.accounts.currency.to_account_info(),
                mint: ctx.accounts.mint.to_account_info(),
                sender_holder_account: ctx.accounts.holder_account.to_account_info(),
                sender_token_account: ctx.accounts.token_account.to_account_info(),
                receiver_holder_account: ctx.accounts.vault_holder_account.to_account_info(),
                receiver_token_account: ctx.accounts.vault_token_account.to_account_info(),
                owner: ctx.accounts.wallet.to_account_info(),
                authority: ctx.accounts.wallet.to_account_info(),
                instructions_sysvar: ctx.accounts.instructions_sysvar.to_account_info(),
                vault: ctx.accounts.vault.to_account_info(),
                system_program: ctx.accounts.system_program.to_account_info(),
                token_program: ctx.accounts.token_program.to_account_info(),
            },
        ),
        ctx.accounts.mission.cost.amount,
    )?;

    Ok(())
}

/// Accounts used in recall instruction
#[derive(Accounts)]
pub struct CollectRewards<'info> {
    #[account(mut)]
    pub project: Box<Account<'info, Project>>,
    #[account(mut, has_one = project)]
    pub mission_pool: Box<Account<'info, MissionPool>>,
    #[account(has_one = mission_pool)]
    pub mission: Box<Account<'info, Mission>>,
    #[account(mut, has_one = wallet, has_one = nft, has_one = mission)]
    pub participation: Box<Account<'info, Participation>>,
    #[account()]
    pub nft: Box<Account<'info, NFT>>,

    #[account(
        mut,
        constraint = (profile.project == mission_pool.project) && (
          profile.identity == ProfileIdentity::Wallet { key: wallet.key() }
        )
      )]
    pub profile: Option<Box<Account<'info, Profile>>>,

    #[account(has_one = mint)]
    pub currency: Option<Box<Account<'info, Currency>>>,
    #[account()]
    pub mint: Option<Box<Account<'info, Mint>>>,
    #[account(mut, has_one = currency, constraint = vault_token_account.is_some() && vault_holder_account.token_account == vault_token_account.clone().unwrap().key() && vault_holder_account.owner == mission_pool.key())]
    pub vault_holder_account: Option<Box<Account<'info, HolderAccount>>>,
    #[account(mut)]
    pub vault_token_account: Option<Box<Account<'info, TokenAccount>>>,
    #[account(has_one = currency, has_one = token_account, constraint = holder_account.owner == wallet.key())]
    pub holder_account: Option<Box<Account<'info, HolderAccount>>>,
    #[account(mut)]
    pub token_account: Option<Box<Account<'info, TokenAccount>>>,

    #[account(mut)]
    pub wallet: Signer<'info>,
    /// CHECK: This is just used to collect platform fee
    #[account(mut)]
    pub vault: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    pub hive_control_program: Program<'info, HplHiveControl>,
    pub currency_manager_program: Program<'info, HplCurrencyManager>,
    pub log_wrapper: Program<'info, Noop>,
    pub compression_program: Program<'info, SplAccountCompression>,
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
    pub rent_sysvar: Sysvar<'info, Rent>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
    pub clock: Sysvar<'info, Clock>,
}

/// Collect rewards
pub fn collect_rewards(ctx: Context<CollectRewards>) -> Result<()> {
    if ctx.accounts.nft.last_staked_at < ctx.accounts.nft.last_unstaked_at {
        return Err(ErrorCode::NotStaked.into());
    }

    if ctx.accounts.participation.end_time > ctx.accounts.clock.unix_timestamp {
        return Err(ErrorCode::NotEnded.into());
    }

    let reward = ctx
        .accounts
        .participation
        .rewards
        .iter_mut()
        .find(|reward| {
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

    match reward.reward_type {
        RewardType::Currency { address: _ } => {
            if ctx.accounts.mint.is_none()
                || ctx.accounts.holder_account.is_none()
                || ctx.accounts.token_account.is_none()
                || ctx.accounts.vault_holder_account.is_none()
                || ctx.accounts.vault_token_account.is_none()
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

            transfer_currency(
                CpiContext::new_with_signer(
                    ctx.accounts.currency_manager_program.to_account_info(),
                    TransferCurrency {
                        project: ctx.accounts.project.to_account_info(),
                        currency: ctx.accounts.currency.clone().unwrap().to_account_info(),
                        mint: ctx.accounts.mint.clone().unwrap().to_account_info(),
                        sender_holder_account: ctx
                            .accounts
                            .vault_holder_account
                            .clone()
                            .unwrap()
                            .to_account_info(),
                        sender_token_account: ctx
                            .accounts
                            .vault_token_account
                            .clone()
                            .unwrap()
                            .to_account_info(),
                        receiver_holder_account: ctx
                            .accounts
                            .holder_account
                            .clone()
                            .unwrap()
                            .to_account_info(),
                        receiver_token_account: ctx
                            .accounts
                            .token_account
                            .clone()
                            .unwrap()
                            .to_account_info(),
                        owner: ctx.accounts.mission_pool.to_account_info(),
                        authority: ctx.accounts.mission_pool.to_account_info(),
                        instructions_sysvar: ctx.accounts.instructions_sysvar.to_account_info(),
                        vault: ctx.accounts.vault.to_account_info(),
                        system_program: ctx.accounts.system_program.to_account_info(),
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
            let current_xp = profile.data.get("nectar_missions_xp");

            if current_xp.is_none() {
                add_profile_data(
                    CpiContext::new(
                        ctx.accounts.hive_control_program.to_account_info(),
                        ManageProfileData {
                            project: ctx.accounts.project.to_account_info(),
                            profile: profile.to_account_info(),
                            merkle_tree: None,
                            delegate_authority: None,
                            authority: ctx.accounts.wallet.to_account_info(),
                            payer: ctx.accounts.wallet.to_account_info(),
                            rent_sysvar: ctx.accounts.rent_sysvar.to_account_info(),
                            system_program: ctx.accounts.system_program.to_account_info(),
                            log_wrapper: ctx.accounts.log_wrapper.to_account_info(),
                            compression_program: ctx.accounts.compression_program.to_account_info(),
                            vault: ctx.accounts.vault.to_account_info(),
                            instructions_sysvar: ctx.accounts.instructions_sysvar.to_account_info(),
                        },
                    ),
                    AddProfileDataArgs {
                        label: String::from("nectar_missions_xp"),
                        value: Some(AddProfileDataArgsValue::SingleValue {
                            value: String::from("0"),
                        }),
                    },
                )
            } else {
                match current_xp.unwrap() {
                    ProfileData::SingleValue { value } => {
                        let current_amount = value.parse::<u64>().unwrap();
                        modify_profile_data(
                            CpiContext::new(
                                ctx.accounts.hive_control_program.to_account_info(),
                                ManageProfileData {
                                    project: ctx.accounts.project.to_account_info(),
                                    profile: profile.to_account_info(),
                                    merkle_tree: None,
                                    delegate_authority: None,
                                    authority: ctx.accounts.wallet.to_account_info(),
                                    payer: ctx.accounts.wallet.to_account_info(),
                                    rent_sysvar: ctx.accounts.rent_sysvar.to_account_info(),
                                    system_program: ctx.accounts.system_program.to_account_info(),
                                    log_wrapper: ctx.accounts.log_wrapper.to_account_info(),
                                    compression_program: ctx
                                        .accounts
                                        .compression_program
                                        .to_account_info(),
                                    vault: ctx.accounts.vault.to_account_info(),
                                    instructions_sysvar: ctx
                                        .accounts
                                        .instructions_sysvar
                                        .to_account_info(),
                                },
                            ),
                            ModifyProfileDataArgs {
                                label: String::from("nectar_missions_xp"),
                                value: ModifyProfileDataArgsValue::SingleValue {
                                    value: (current_amount + reward.amount).to_string(),
                                },
                            },
                        )
                    }
                    _ => Err(ErrorCode::InvalidProfileData.into()),
                }
            }
        }
    }
}

/// Accounts used in recall instruction
#[derive(Accounts)]
pub struct Recall<'info> {
    #[account()]
    pub project: Box<Account<'info, Project>>,

    /// MissionPool account
    #[account(has_one = project)]
    pub mission_pool: Box<Account<'info, MissionPool>>,

    /// Mission account
    #[account(has_one = mission_pool)]
    pub mission: Box<Account<'info, Mission>>,

    /// Participation state account
    #[account(mut, has_one = wallet, has_one = mission, close = wallet)]
    pub participation: Box<Account<'info, Participation>>,

    #[account(mut)]
    pub wallet: Signer<'info>,

    pub system_program: Program<'info, System>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub vault: AccountInfo<'info>,
    pub clock: Sysvar<'info, Clock>,
}

/// recall from a mission
pub fn recall(ctx: Context<Recall>) -> Result<()> {
    let participation = &mut ctx.accounts.participation;

    let reward = participation
        .rewards
        .iter()
        .find(|reward| !reward.collected);

    if reward.is_some() {
        return Err(ErrorCode::RewardsNotCollected.into());
    }

    participation.is_recalled = true;

    Ok(())
}
