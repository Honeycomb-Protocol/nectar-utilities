use anchor_lang::prelude::error_code;

#[error_code]
pub enum ErrorCode {
    #[msg("Opertaion overflowed")]
    Overflow,

    #[msg("The NFT provided is not recognized by the mission pool")]
    NftNotRecognized,

    #[msg("Not implemented yet")]
    NotImplemented,

    #[msg("NFT is not staked")]
    NotStaked,

    #[msg("Participation is not ended yet")]
    NotEnded,

    #[msg("Reward is either collected or not available")]
    RewardNotAvailable,

    #[msg("Mint, Holder account or token account not provided")]
    HolderAccountsNotProvided,

    #[msg("All rewards are not yet collected for this participaton")]
    RewardsNotCollected,
}
