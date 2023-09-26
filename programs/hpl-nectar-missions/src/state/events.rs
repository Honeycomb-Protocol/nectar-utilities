use anchor_lang::prelude::*;
use hpl_events::{event, invoke, Instruction, ProgramResult};

// use super::{EarnedReward, Participation};

#[event]
pub enum Event {
    NewParticipation {
        address: Pubkey,
        state: Vec<u8>,
    },
    CollectParticipationReward {
        address: Pubkey,
        index: u8,
        state: Vec<u8>,
    },
    RecallParticipation {
        address: Pubkey,
        state: Vec<u8>,
    },
}

// impl Event {
//     pub fn new_participation(address: Pubkey, state: &Participation, clock: &Clock) -> Self {
//         Self::NewParticipation {
//             address,
//             state: state.try_to_vec().unwrap(),
//             timestamp: clock.unix_timestamp,
//         }
//     }

//     pub fn collect_participation_reward(
//         address: Pubkey,
//         index: u8,
//         state: &EarnedReward,
//         clock: &Clock,
//     ) -> Self {
//         Self::CollectParticipationReward {
//             address,
//             index,
//             state: state.try_to_vec().unwrap(),
//             timestamp: clock.unix_timestamp,
//         }
//     }

//     pub fn recall_participation(address: Pubkey, state: &Participation, clock: &Clock) -> Self {
//         Self::RecallParticipation {
//             address,
//             state: state.try_to_vec().unwrap(),
//             timestamp: clock.unix_timestamp,
//         }
//     }
// }
