use anchor_lang::prelude::*;
use borsh::{BorshDeserialize, BorshSerialize};
use hpl_compression::{event, invoke, spl_noop, ProgramResult};

use super::{NFTv1, Staker};

#[event]
pub enum Event {
    NewNft {
        address: Pubkey,
        state: NFTv1,
        timestamp: i64,
    },
    NewStaker {
        address: Pubkey,
        state: Staker,
        timestamp: i64,
    },
    Stake {
        nft_address: Pubkey,
        nft: NFTv1,
        staker_address: Pubkey,
        staker: Staker,
        timestamp: i64,
    },
    Unstake {
        nft_address: Pubkey,
        nft: NFTv1,
        staker_address: Pubkey,
        staker: Staker,
        timestamp: i64,
    },
    ClaimRewards {
        nft_address: Pubkey,
        nft: NFTv1,
        staker_address: Pubkey,
        amount: u64,
        timestamp: i64,
    },
}

impl Event {
    pub fn new_nft(address: Pubkey, state: &NFTv1, clock: &Clock) -> Self {
        Self::NewNft {
            address,
            state: state.clone(),
            timestamp: clock.unix_timestamp,
        }
    }

    pub fn new_staker(address: Pubkey, state: &Staker, clock: &Clock) -> Self {
        Self::NewStaker {
            address,
            state: state.clone(),
            timestamp: clock.unix_timestamp,
        }
    }

    pub fn stake(
        nft_address: Pubkey,
        nft_state: &NFTv1,
        staker_address: Pubkey,
        staker_state: &Staker,
        clock: &Clock,
    ) -> Self {
        Self::Stake {
            nft_address,
            nft: nft_state.clone(),
            staker_address,
            staker: staker_state.clone(),
            timestamp: clock.unix_timestamp,
        }
    }

    pub fn unstake(
        nft_address: Pubkey,
        nft_state: &NFTv1,
        staker_address: Pubkey,
        staker_state: &Staker,
        clock: &Clock,
    ) -> Self {
        Self::Unstake {
            nft_address,
            nft: nft_state.clone(),
            staker_address,
            staker: staker_state.clone(),
            timestamp: clock.unix_timestamp,
        }
    }

    pub fn claim_rewards(
        nft_address: Pubkey,
        nft_state: &NFTv1,
        staker_address: Pubkey,
        amount: u64,
        clock: &Clock,
    ) -> Self {
        Self::ClaimRewards {
            nft_address,
            nft: nft_state.clone(),
            staker_address,
            amount,
            timestamp: clock.unix_timestamp,
        }
    }
}
