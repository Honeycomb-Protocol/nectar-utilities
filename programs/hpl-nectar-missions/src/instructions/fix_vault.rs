use {
    crate::state::*,
    anchor_lang::prelude::*,
    anchor_spl::{
        associated_token::AssociatedToken,
        token::{Mint, Token, TokenAccount},
    },
    hpl_currency_manager::{
        cpi::{accounts::FixHolderAccount, fix_holder_account},
        program::HplCurrencyManager,
        state::{Currency, HolderAccount},
    },
    hpl_hive_control::state::Project,
};

/// Accounts used in recall instruction
#[derive(Accounts)]
pub struct FixVault<'info> {
    #[account(mut, has_one = authority)]
    pub project: Box<Account<'info, Project>>,
    #[account(mut, has_one = project)]
    pub mission_pool: Box<Account<'info, MissionPool>>,

    #[account(has_one = mint)]
    pub currency: Box<Account<'info, Currency>>,
    #[account(mut)]
    pub mint: Box<Account<'info, Mint>>,
    #[account(mut, has_one = currency, constraint = vault_holder_account.token_account == vault_token_account.key() && vault_holder_account.owner == mission_pool.key())]
    pub vault_holder_account: Box<Account<'info, HolderAccount>>,
    #[account(mut)]
    pub vault_token_account: Box<Account<'info, TokenAccount>>,
    /// CHECK: This is not dangerous
    #[account(mut)]
    pub new_token_account: AccountInfo<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,
    /// CHECK: This is just used to collect platform fee
    #[account(mut)]
    pub vault: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub currency_manager_program: Program<'info, HplCurrencyManager>,
    /// CHECK: This is not dangerous because we don't read or write from this account
    #[account(address = anchor_lang::solana_program::sysvar::instructions::ID)]
    pub instructions_sysvar: AccountInfo<'info>,
}

/// Collect rewards
pub fn fix_vault(ctx: Context<FixVault>) -> Result<()> {
    let mission_pool_seeds = &[
        b"mission_pool".as_ref(),
        ctx.accounts.mission_pool.project.as_ref(),
        ctx.accounts.mission_pool.name.as_bytes(),
        &[ctx.accounts.mission_pool.bump],
    ];
    let signer = &[&mission_pool_seeds[..]];

    fix_holder_account(CpiContext::new_with_signer(
        ctx.accounts.currency_manager_program.to_account_info(),
        FixHolderAccount {
            project: ctx.accounts.project.to_account_info(),
            currency: ctx.accounts.currency.to_account_info(),
            holder_account: ctx.accounts.vault_holder_account.to_account_info(),
            mint: ctx.accounts.mint.to_account_info(),
            token_account: ctx.accounts.vault_token_account.to_account_info(),
            new_token_account: ctx.accounts.new_token_account.to_account_info(),
            owner: ctx.accounts.mission_pool.to_account_info(),
            payer: ctx.accounts.authority.to_account_info(),
            vault: ctx.accounts.vault.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
            associated_token_program: ctx.accounts.associated_token_program.to_account_info(),
            instructions_sysvar: ctx.accounts.instructions_sysvar.to_account_info(),
        },
        signer,
    ))?;

    Ok(())
}
