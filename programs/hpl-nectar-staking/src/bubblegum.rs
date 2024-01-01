use anchor_lang::prelude::*;
use hpl_utils::metadata::mpl_token_metadata::state::ToAccountMeta;

#[derive(Clone)]
pub struct MplBubblegum;

impl anchor_lang::Id for MplBubblegum {
    fn id() -> Pubkey {
        mpl_bubblegum::ID
    }
}

pub fn transfer_cnft_cpi<'info>(
    tree_authority: AccountInfo<'info>,
    leaf_owner: AccountInfo<'info>,
    leaf_delegate: AccountInfo<'info>,
    new_leaf_owner: AccountInfo<'info>,
    merkle_tree: AccountInfo<'info>,
    log_wrapper: AccountInfo<'info>,
    compression_program: AccountInfo<'info>,
    system_program: AccountInfo<'info>,
    remaining_accounts: Vec<AccountInfo<'info>>,

    index: u32,
    signer_seeds: Option<&[&[&[u8]]; 1]>, // Optional signer seeds
) -> Result<()> {
    msg!(
        "attempting to transfer an nft {} from tree {}",
        index,
        merkle_tree.key()
    );

    let ix = mpl_bubblegum::instructions::TransferBuilder::new()
        .tree_config(tree_authority.key())
        .leaf_owner(leaf_owner.key(), true)
        .leaf_delegate(leaf_delegate.key(), true)
        .new_leaf_owner(new_leaf_owner.key())
        .merkle_tree(merkle_tree.key())
        .log_wrapper(log_wrapper.key())
        .compression_program(compression_program.key())
        .system_program(system_program.key())
        .add_remaining_accounts(
            &remaining_accounts
                .iter()
                .map(|f| f.to_account_meta())
                .collect::<Vec<_>>(),
        )
        .instruction();

    let account_infos = [
        vec![
            tree_authority,
            leaf_owner,
            leaf_delegate,
            new_leaf_owner,
            merkle_tree,
            log_wrapper,
            compression_program,
            system_program,
        ],
        remaining_accounts,
    ]
    .concat();

    if let Some(signer_seeds) = signer_seeds {
        return anchor_lang::solana_program::program::invoke_signed(
            &ix,
            &account_infos,
            signer_seeds, // &[&[b"cNFT-vault", &[*ctx.bumps.get("leaf_owner").unwrap()]]],
        )
        .map_err(Into::into);
    } else {
        return anchor_lang::solana_program::program::invoke(
            &ix,
            &account_infos,
            // &[&[b"cNFT-vault", &[*ctx.bumps.get("leaf_owner").unwrap()]]],
        )
        .map_err(Into::into);
    }
}

pub fn verify_cnft_cpi<'info>(
    merkle_tree: AccountInfo<'info>,
    remaining_accounts: Vec<AccountInfo<'info>>,

    id: Pubkey,
    owner: Pubkey,
    delegate: Pubkey,
    root: [u8; 32],
    data_hash: [u8; 32],
    creator_hash: [u8; 32],
    nonce: u64,
    index: u32,
) -> Result<()> {
    msg!(
        "attempting to transfer an nft {} from tree {}",
        index,
        merkle_tree.key()
    );

    let leaf = mpl_bubblegum::types::LeafSchema::V1 {
        id,
        owner,
        delegate,
        nonce,
        data_hash,
        creator_hash,
    };

    let ix = mpl_bubblegum::instructions::VerifyLeafBuilder::new()
        .merkle_tree(merkle_tree.key())
        .root(root)
        .leaf(leaf.hash())
        .index(index)
        .add_remaining_accounts(
            &remaining_accounts
                .iter()
                .map(|f| f.to_account_meta())
                .collect::<Vec<_>>(),
        )
        .instruction();

    let account_infos = [vec![merkle_tree], remaining_accounts].concat();

    anchor_lang::solana_program::program::invoke(&ix, &account_infos).map_err(Into::into)
}
