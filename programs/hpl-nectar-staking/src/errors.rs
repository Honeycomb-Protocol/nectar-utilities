use anchor_lang::prelude::error_code;

#[error_code]
pub enum HplNectarStakingError {
    #[msg("Opertaion overflowed")]
    Overflow,

    #[msg("Only the owner can perform this operation")]
    OnlyOwner,

    #[msg("Invalid metadata")]
    InvalidMetadata,

    #[msg("Invalid NFT")]
    InvalidNFT,

    #[msg("Rewards not available yet")]
    RewardsNotAvailable,

    #[msg("Can't stake yet")]
    CantStakeYet,

    #[msg("Claimed at provided fall outside the offset")]
    ClaimedAtOutsideOffset,

    #[msg("Character is not staked")]
    CharacterNotStaked,

    #[msg("Character is used by some other service")]
    CharacterUsed,

    #[msg("Character is staked by another staker")]
    StakerMismatch,

    #[msg("Can't unstake yet")]
    CantUnstakeYet,

    #[msg("Deposit account is not provided")]
    DepositAccountNotProvided,

    #[msg("Not Implemented")]
    NotImplemented,
}
