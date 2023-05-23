use {anchor_lang::prelude::*, hpl_utils::Default};

/// MissionPool state account
#[account]
pub struct MissionPool {
    pub bump: u8,
    pub project: Pubkey,
    pub name: String,
    pub factions_merkle_root: [u8; 32],
    pub randomizer_round: u8,
    pub collections: Vec<u8>,
    pub creators: Vec<u8>,
}
impl Default for MissionPool {
    const LEN: usize = 8 + 144;

    fn set_defaults(&mut self) {
        self.bump = 0;
        self.project = Pubkey::default();
        self.name = String::default();
        self.factions_merkle_root = [0; 32];
        self.randomizer_round = 0;
        self.collections = vec![];
        self.creators = vec![];
    }
}
impl MissionPool {
    pub fn increase_randomizer_round(&mut self) {
        self.randomizer_round = (self.randomizer_round + 1) % 100;
    }
}
