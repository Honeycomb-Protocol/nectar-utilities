use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct Initialize {}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct InitializeArgs {
    param: u64,
}

pub fn initialize(_ctx: Context<Initialize>, _args: InitializeArgs) -> Result<()> {
    Ok(())
}
