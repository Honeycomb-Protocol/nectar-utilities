use {
    crate::state::*,
    anchor_lang::prelude::*,
    hpl_hive_control::state::{DelegateAuthority, Project},
    hpl_utils::traits::Default,
};

/// Accounts used in initialize multiplier instruction
#[derive(Accounts)]
pub struct InitMultipliers<'info> {
    /// StakingPool state account
    #[account(mut, has_one = project)]
    pub staking_pool: Account<'info, StakingPool>,

    /// Multiplier state account
    #[account(
        init, payer = payer,
        space = Multipliers::LEN,
        seeds = [
            b"multipliers",
            staking_pool.key().as_ref()
        ],
        bump,
    )]
    pub multipliers: Account<'info, Multipliers>,

    /// The wallet that holds authority for this action
    #[account()]
    pub authority: Signer<'info>,

    /// The wallet that pays for the rent
    #[account(mut)]
    pub payer: Signer<'info>,

    /// NATIVE SYSTEM PROGRAM
    pub system_program: Program<'info, System>,

    // HIVE CONTROL
    #[account()]
    pub project: Box<Account<'info, Project>>,
    #[account(has_one = authority)]
    pub delegate_authority: Option<Account<'info, DelegateAuthority>>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub vault: AccountInfo<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitMultipliersArgs {
    decimals: u8,
}

/// Initialize multiplier state
pub fn init_multipliers(ctx: Context<InitMultipliers>, args: InitMultipliersArgs) -> Result<()> {
    let multipliers = &mut ctx.accounts.multipliers;
    multipliers.set_defaults();
    multipliers.bump = ctx.bumps["multipliers"];
    multipliers.decimals = args.decimals;
    multipliers.staking_pool = ctx.accounts.staking_pool.key();
    Ok(())
}

/// Accounts used in add multiplier instruction
#[derive(Accounts)]
pub struct AddMultiplier<'info> {
    /// StakingPool state account
    #[account(mut, has_one = project)]
    pub staking_pool: Account<'info, StakingPool>,

    /// Multiplier state account
    #[account(mut, has_one = staking_pool)]
    pub multipliers: Account<'info, Multipliers>,

    /// The wallet that pays for the rent
    #[account(mut)]
    pub authority: Signer<'info>,

    /// The wallet that pays for the rent
    #[account(mut)]
    pub payer: Signer<'info>,

    /// NATIVE SYSTEM PROGRAM
    pub system_program: Program<'info, System>,

    /// RENT SYSVAR
    pub rent_sysvar: Sysvar<'info, Rent>,

    // HIVE CONTROL
    #[account()]
    pub project: Box<Account<'info, Project>>,
    #[account(has_one = authority)]
    pub delegate_authority: Option<Account<'info, DelegateAuthority>>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(mut)]
    pub vault: AccountInfo<'info>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AddMultiplierArgs {
    pub value: u64,
    pub multiplier_type: MultiplierType,
}

/// Initialize multiplier state
pub fn add_multiplier(ctx: Context<AddMultiplier>, args: AddMultiplierArgs) -> Result<()> {
    let multipliers = &mut ctx.accounts.multipliers;

    hpl_utils::reallocate(
        isize::try_from(Multiplier::LEN).unwrap(),
        multipliers.to_account_info(),
        ctx.accounts.payer.to_account_info(),
        &ctx.accounts.rent_sysvar,
        &ctx.accounts.system_program,
    )?;

    match args.multiplier_type {
        MultiplierType::StakeDuration { min_duration: _ } => {
            multipliers.duration_multipliers.push(Multiplier {
                value: args.value,
                multiplier_type: args.multiplier_type,
            });
            multipliers
                .duration_multipliers
                .sort_by_key(|x| match x.multiplier_type {
                    MultiplierType::StakeDuration { min_duration } => min_duration,
                    _ => 0,
                });
        }
        MultiplierType::NFTCount { min_count: _ } => {
            multipliers.count_multipliers.push(Multiplier {
                value: args.value,
                multiplier_type: args.multiplier_type,
            });
            multipliers
                .count_multipliers
                .sort_by_key(|x| match x.multiplier_type {
                    MultiplierType::NFTCount { min_count } => min_count,
                    _ => 0,
                });
        }
        MultiplierType::Creator { creator: _ } => {
            multipliers.creator_multipliers.push(Multiplier {
                value: args.value,
                multiplier_type: args.multiplier_type,
            });
            multipliers.creator_multipliers.sort_by_key(|x| x.value)
        }
        MultiplierType::Collection { collection: _ } => {
            multipliers.collection_multipliers.push(Multiplier {
                value: args.value,
                multiplier_type: args.multiplier_type,
            });
            multipliers
                .collection_multipliers
                .sort_by(|a, b| b.value.cmp(&a.value))
        }
    }

    Ok(())
}
