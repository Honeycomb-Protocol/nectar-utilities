use {
    crate::{state::*, traits::Default},
    anchor_lang::prelude::*,
};

/// Accounts used in initialize multiplier instruction
#[derive(Accounts)]
pub struct InitMultipliers<'info> {
    /// Project state account
    #[account(mut, has_one = authority)]
    pub project: Account<'info, Project>,

    /// Multiplier state account
    #[account(
        init, payer = authority,
        space = Multipliers::LEN,
        seeds = [
            b"multipliers",
            project.key().as_ref()
        ],
        bump,
    )]
    pub multipliers: Account<'info, Multipliers>,

    /// The wallet that pays for the rent
    #[account(mut)]
    pub authority: Signer<'info>,

    /// NATIVE SYSTEM PROGRAM
    pub system_program: Program<'info, System>,
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
    multipliers.project = ctx.accounts.project.key();
    Ok(())
}

/// Accounts used in add multiplier instruction
#[derive(Accounts)]
pub struct AddMultiplier<'info> {
    /// Project state account
    #[account(mut, has_one = authority)]
    pub project: Account<'info, Project>,

    /// Multiplier state account
    #[account(mut, has_one = project)]
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
