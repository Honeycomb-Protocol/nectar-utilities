use anchor_lang::prelude::*;
use hpl_events::{event, invoke, Instruction, ProgramResult};

// use super::{NFTv1, Staker};

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

// impl Event {
//     pub fn new_nft(address: Pubkey, state: &NFTv1, clock: &Clock) -> Self {
//         Self::NewNft {
//             address,
//             state: state.try_to_vec().unwrap(),
//             timestamp: clock.unix_timestamp,
//         }
//     }

//     pub fn nft_used(address: Pubkey, state: &NFTv1, clock: &Clock) -> Self {
//         Self::NftUsed {
//             address,
//             state: state.try_to_vec().unwrap(),
//             timestamp: clock.unix_timestamp,
//         }
//     }

//     pub fn new_staker(address: Pubkey, state: &Staker, clock: &Clock) -> Self {
//         Self::NewStaker {
//             address,
//             state: state.try_to_vec().unwrap(),
//             timestamp: clock.unix_timestamp,
//         }
//     }

//     pub fn stake(
//         nft_address: Pubkey,
//         nft_state: &NFTv1,
//         staker_address: Pubkey,
//         staker_state: &Staker,
//         clock: &Clock,
//     ) -> Self {
//         Self::Stake {
//             nft_address,
//             nft: nft_state.try_to_vec().unwrap(),
//             staker_address,
//             staker: staker_state.try_to_vec().unwrap(),
//             timestamp: clock.unix_timestamp,
//         }
//     }

//     pub fn unstake(
//         nft_address: Pubkey,
//         nft_state: &NFTv1,
//         staker_address: Pubkey,
//         staker_state: &Staker,
//         clock: &Clock,
//     ) -> Self {
//         Self::Unstake {
//             nft_address,
//             nft: nft_state.try_to_vec().unwrap(),
//             staker_address,
//             staker: staker_state.try_to_vec().unwrap(),
//             timestamp: clock.unix_timestamp,
//         }
//     }

//     pub fn claim_rewards(
//         nft_address: Pubkey,
//         nft_state: &NFTv1,
//         staker_address: Pubkey,
//         amount: u64,
//         clock: &Clock,
//     ) -> Self {
//         Self::ClaimRewards {
//             nft_address,
//             nft: nft_state.try_to_vec().unwrap(),
//             staker_address,
//             amount,
//             timestamp: clock.unix_timestamp,
//         }
//     }
// }
