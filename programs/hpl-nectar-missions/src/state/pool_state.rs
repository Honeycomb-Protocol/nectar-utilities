use {anchor_lang::prelude::*, hpl_utils::Default};

/// MissionPool state account
#[account]
#[derive(Default)]
pub struct MissionPool {
    pub bump: u8,
    pub project: Pubkey,
    pub name: String,
    pub collections: Vec<u8>,
    pub creators: Vec<u8>,
}
impl Default for MissionPool {
    const LEN: usize = 8 + 120;

    fn set_defaults(&mut self) {
        self.bump = 0;
        self.project = Pubkey::default();
        self.name = String::default();
        self.collections = vec![];
        self.creators = vec![];
    }
}
