use anchor_lang::prelude::*;
use borsh::{BorshDeserialize, BorshSerialize};
use hpl_compression::{event, invoke, spl_noop, ProgramResult};

use super::{EarnedReward, Participation};

#[event]
pub enum Event {
    NewParticipation {
        address: Pubkey,
        state: Vec<u8>,
        timestamp: i64,
    },
    CollectParticipationReward {
        address: Pubkey,
        index: u8,
        state: Vec<u8>,
        timestamp: i64,
    },
    RecallParticipation {
        address: Pubkey,
        timestamp: i64,
    },
}

impl Event {
    pub fn new_participation(address: Pubkey, state: &Participation, clock: &Clock) -> Self {
        Self::NewParticipation {
            address,
            state: state.try_to_vec().unwrap(),
            timestamp: clock.unix_timestamp,
        }
    }

    pub fn collect_participation_reward(
        address: Pubkey,
        index: u8,
        state: &EarnedReward,
        clock: &Clock,
    ) -> Self {
        Self::CollectParticipationReward {
            address,
            index,
            state: state.try_to_vec().unwrap(),
            timestamp: clock.unix_timestamp,
        }
    }

    pub fn recall_participation(address: Pubkey, clock: &Clock) -> Self {
        Self::RecallParticipation {
            address,
            timestamp: clock.unix_timestamp,
        }
    }
}
