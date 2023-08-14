use {anchor_lang::prelude::*, hpl_utils::traits::*};

/// The staking account linked to the NFT
/// PDA: ['nft', mint, staking_pool]
/// Category: nft_state
#[account]
#[derive(Debug)]
pub struct NFT {
    pub bump: u8,

    /// The staking_pool this NFT is staked in
    pub staking_pool: Pubkey,

    /// wallet of the staker
    pub staker: Pubkey,

    /// The mint of the NFT
    pub mint: Pubkey,

    /// The verified creator of the NFT
    pub creator: Pubkey,

    /// The verified collection of the NFT
    pub collection: Pubkey,

    /// Last time the owner claimed rewards
    pub last_claim: i64,

    /// Accumulated staked at
    pub staked_at: i64,

    /// Last staked at
    pub last_staked_at: i64,

    /// Last unstraked_at
    pub last_unstaked_at: i64,
}

impl Default for NFT {
    const LEN: usize = 8 + 200;

    fn set_defaults(&mut self) {
        self.bump = 0;
        self.staking_pool = Pubkey::default();
        self.staker = Pubkey::default();
        self.mint = Pubkey::default();
        self.creator = Pubkey::default();
        self.collection = Pubkey::default();
        self.last_claim = 0;
        self.staked_at = 0;
        self.last_staked_at = 0;
        self.last_unstaked_at = 0;
    }
}

// The staking account linked to the NFT
/// PDA: ['nft', mint, staking_pool]
/// Category: nft_state
#[account]
#[derive(PartialEq, Eq, Debug)]
pub struct NFTv1 {
    pub bump: u8,

    /// The staking_pool this NFT is staked in
    pub staking_pool: Pubkey,

    /// wallet of the staker
    pub staker: Option<Pubkey>,

    /// The mint of the NFT
    pub mint: Pubkey,

    /// Last time the owner claimed rewards
    pub last_claim: i64,

    /// Accumulated staked at
    pub staked_at: i64,

    /// Last staked at
    pub last_staked_at: i64,

    /// Last unstraked_at
    pub last_unstaked_at: i64,

    /// Is it cNFT
    pub is_compressed: bool,

    /// The criteria to which this NFT falls
    pub criteria: NFTCriteria,

    /// NFT being used by a HPL Service
    pub used_by: NFTUsedBy,
}

impl Default for NFTv1 {
    const LEN: usize = 8 + 200;

    fn set_defaults(&mut self) {
        self.bump = 0;
        self.staking_pool = Pubkey::default();
        self.staker = None;
        self.mint = Pubkey::default();
        self.last_claim = 0;
        self.staked_at = 0;
        self.last_staked_at = 0;
        self.last_unstaked_at = 0;
        self.is_compressed = false;
        self.criteria = NFTCriteria::None;
        self.used_by = NFTUsedBy::None;
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, PartialEq, Eq, Debug)]
pub enum NFTCriteria {
    None,
    Collection { address: Pubkey },
    Creator { address: Pubkey },
    MerkleTree { address: Pubkey },
}

#[derive(AnchorSerialize, AnchorDeserialize, Copy, Clone, PartialEq, Eq, Debug)]
pub enum NFTUsedBy {
    None,
    Missions,
}
