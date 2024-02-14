use {anchor_lang::prelude::*, hpl_toolkit::schema::*};

/// MissionPool state account
/// PDA: ['mission_pool', project, name]
/// Category: pool_state
#[account]
#[derive(ToSchema)]
pub struct MissionPool {
    pub bump: u8,                       // 1
    pub project: Pubkey,                // 32
    pub name: String,                   // 40
    pub factions_merkle_root: [u8; 32], // 32
    pub randomizer_round: u8,           // 1
    pub character_models: Vec<Pubkey>,  // 4 + (32 * n)
    pub guild_kits: Vec<u8>,            // 4 + (1 * n)
}
impl MissionPool {
    pub const LEN: usize = 8 + 1 + 32 + 40 + 32 + 1 + 4 + 4;

    pub fn set_defaults(&mut self) {
        self.bump = 0;
        self.project = Pubkey::default();
        self.name = String::default();
        self.factions_merkle_root = [0; 32];
        self.randomizer_round = 0;
        self.character_models = vec![];
        self.guild_kits = vec![];
    }

    pub fn increase_randomizer_round(&mut self) {
        self.randomizer_round = (self.randomizer_round + 1) % 100;
    }
}
