use {
    crate::{errors::ErrorCode, state::*},
    anchor_lang::prelude::*,
    anchor_spl::token::{self, Mint, Token, TokenAccount},
    hpl_currency_manager::{
        cpi::{accounts::TransferCurrency, transfer_currency},
        program::HplCurrencyManager,
        state::{Currency, HolderAccount},
    },
    hpl_hive_control::state::Project,
    hpl_nectar_staking::state::{Staker, StakingPool, NFT},
    hpl_utils::traits::Default,
};

/// Accounts used in participate instruction
#[derive(Accounts)]
pub struct Participate<'info> {
    #[account()]
    pub project: Box<Account<'info, Project>>,

    /// StakingPool state account
    #[account(has_one = project)]
    pub staking_pool: Box<Account<'info, StakingPool>>,

    /// MissionPool account
    #[account(has_one = project)]
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

    /// Participation state account
    #[account(
      init, payer = wallet,
      space = Participation::LEN,
      seeds = [
        b"participation".as_ref(),
        mission_pool.key().as_ref(),
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
    pub system_program: Program<'info, System>,
    pub clock: Sysvar<'info, Clock>,
}

/// participate in a mission
pub fn participate(ctx: Context<Participate>) -> Result<()> {
    let participation = &mut ctx.accounts.participation;
    participation.set_defaults();
    participation.bump = ctx.bumps["participation"];
    participation.wallet = ctx.accounts.wallet.key();
    participation.mission = ctx.accounts.mission.key();
    participation.nft = ctx.accounts.nft.key();
    participation.end_time = ctx.accounts.mission.duration + ctx.accounts.clock.unix_timestamp;

    // reaalocate here

    participation.rewards = ctx
        .accounts
        .mission
        .rewards
        .iter()
        .map(|reward| {
            let len = (reward.max - reward.min) + 1;
            let random = ctx.accounts.clock.slot % len;

            EarnedReward {
                amount: reward.min + random,
                reward_type: reward.reward_type.clone(),
                collected: false,
            }
        })
        .collect::<Vec<_>>();

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

        if !creator {
            return Err(ErrorCode::NftNotRecognized.into());
        }
    }

    Ok(())
}

/// Accounts used in recall instruction
#[derive(Accounts)]
pub struct CollectRewards<'info> {
    #[account()]
    pub project: Box<Account<'info, Project>>,

    /// MissionPool account
    #[account(has_one = project)]
    pub mission_pool: Box<Account<'info, MissionPool>>,

    /// Mission account
    #[account(has_one = mission_pool)]
    pub mission: Box<Account<'info, Mission>>,

    /// Participation state account
    #[account(has_one = wallet, has_one = nft, has_one = mission)]
    pub participation: Box<Account<'info, Participation>>,

    /// NFT state account
    #[account()]
    pub nft: Box<Account<'info, NFT>>,

    #[account(has_one = mint)]
    pub currency: Option<Account<'info, Currency>>,

    #[account()]
    pub mint: Option<Account<'info, Mint>>,

    #[account(has_one = currency, constraint = vault_token_account.is_some() && vault_holder_account.token_account == vault_token_account.clone().unwrap().key() && vault_holder_account.owner == mission_pool.key())]
    pub vault_holder_account: Option<Account<'info, HolderAccount>>,

    #[account()]
    pub vault_token_account: Option<Account<'info, TokenAccount>>,

    #[account(has_one = currency, has_one = token_account, constraint = holder_account.owner == wallet.key())]
    pub holder_account: Option<Account<'info, HolderAccount>>,

    #[account()]
    pub token_account: Option<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub wallet: Signer<'info>,

    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub vault: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    pub currency_manager_program: Program<'info, HplCurrencyManager>,
    #[account(address = token::ID)]
    pub token_program: Program<'info, Token>,
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

    let reward = ctx.accounts.participation.rewards.iter().find(|reward| {
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
                        token_program: ctx.accounts.token_program.to_account_info(),
                    },
                    signer,
                ),
                reward.amount,
            )
        }
        RewardType::Xp => Err(ErrorCode::NotImplemented.into()),
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
