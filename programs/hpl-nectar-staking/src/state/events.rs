use anchor_lang::{
    prelude::*,
    solana_program::{entrypoint::ProgramResult, instruction::Instruction, program::invoke},
};
use hpl_events::event;

#[event]
pub enum Event {
    NewNft {
        address: Pubkey,
        state: Vec<u8>,
    },
    NftUsed {
        address: Pubkey,
        state: Vec<u8>,
    },
    NewStaker {
        address: Pubkey,
        state: Vec<u8>,
    },
    Stake {
        nft_address: Pubkey,
        nft: Vec<u8>,
        staker_address: Pubkey,
        staker: Vec<u8>,
    },
    Unstake {
        nft_address: Pubkey,
        nft: Vec<u8>,
        staker_address: Pubkey,
        staker: Vec<u8>,
    },
    ClaimRewards {
        nft_address: Pubkey,
        nft: Vec<u8>,
        staker_address: Pubkey,
        amount: u64,
    },
}
