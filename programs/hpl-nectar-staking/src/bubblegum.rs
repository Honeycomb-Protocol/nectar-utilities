use anchor_lang::prelude::*;

#[derive(Clone)]
pub struct MplBubblegum;

impl anchor_lang::Id for MplBubblegum {
    fn id() -> Pubkey {
        mpl_bubblegum::id()
    }
}

// first 8 bytes of SHA256("global:transfer")
const TRANSFER_DISCRIMINATOR: &[u8; 8] = &[163, 52, 200, 231, 140, 3, 69, 186];

pub fn transfer_cnft_cpi<'info>(
    tree_authority: AccountInfo<'info>,
    leaf_owner: AccountInfo<'info>,
    leaf_delegate: AccountInfo<'info>,
    new_leaf_owner: AccountInfo<'info>,
    merkle_tree: AccountInfo<'info>,
    log_wrapper: AccountInfo<'info>,
    compression_program: AccountInfo<'info>,
    system_program: AccountInfo<'info>,
    bubblegum_program: AccountInfo<'info>,
    remaining_accounts: Vec<AccountInfo<'info>>,

    root: [u8; 32],
    data_hash: [u8; 32],
    creator_hash: [u8; 32],
    nonce: u64,
    index: u32,
    signer_seeds: Option<&[&[&[u8]]; 1]>, // Optional signer seeds
) -> Result<()> {
    msg!(
        "attempting to transfer an nft {} from tree {}",
        index,
        merkle_tree.key()
    );

    let mut accounts: Vec<solana_program::instruction::AccountMeta> = vec![
        AccountMeta::new_readonly(tree_authority.key(), false),
        AccountMeta::new_readonly(leaf_owner.key(), true),
        AccountMeta::new_readonly(leaf_delegate.key(), false),
        AccountMeta::new_readonly(new_leaf_owner.key(), false),
        AccountMeta::new(merkle_tree.key(), false),
        AccountMeta::new_readonly(log_wrapper.key(), false),
        AccountMeta::new_readonly(compression_program.key(), false),
        AccountMeta::new_readonly(system_program.key(), false),
    ];

    let mut data: Vec<u8> = vec![];
    data.extend(TRANSFER_DISCRIMINATOR);
    data.extend(root);
    data.extend(data_hash);
    data.extend(creator_hash);
    data.extend(nonce.to_le_bytes());
    data.extend(index.to_le_bytes());

    let mut account_infos: Vec<AccountInfo> = vec![
        tree_authority,
        leaf_owner,
        leaf_delegate,
        new_leaf_owner,
        merkle_tree,
        log_wrapper,
        compression_program,
        system_program,
    ];

    // add "accounts" (hashes) that make up the merkle proof
    for acc in remaining_accounts.iter() {
        accounts.push(AccountMeta::new_readonly(acc.key(), false));
        account_infos.push(acc.to_account_info());
    }

    msg!("manual cpi call");
    // Invoke the burn instruction with or without signer seeds based on the option
    if let Some(signer_seeds) = signer_seeds {
        return solana_program::program::invoke_signed(
            &solana_program::instruction::Instruction {
                program_id: bubblegum_program.key(),
                accounts,
                data,
            },
            &account_infos[..],
            signer_seeds, // &[&[b"cNFT-vault", &[*ctx.bumps.get("leaf_owner").unwrap()]]],
        )
        .map_err(Into::into);
    } else {
        return solana_program::program::invoke(
            &solana_program::instruction::Instruction {
                program_id: bubblegum_program.key(),
                accounts,
                data,
            },
            &account_infos[..],
            // &[&[b"cNFT-vault", &[*ctx.bumps.get("leaf_owner").unwrap()]]],
        )
        .map_err(Into::into);
    }
}
