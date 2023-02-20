/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as splToken from '@solana/spl-token'
import * as beet from '@metaplex-foundation/beet'
import * as web3 from '@solana/web3.js'

/**
 * @category Instructions
 * @category ClaimRewards
 * @category generated
 */
export const claimRewardsStruct = new beet.BeetArgsStruct<{
  instructionDiscriminator: number[] /* size: 8 */
}>(
  [['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)]],
  'ClaimRewardsInstructionArgs'
)
/**
 * Accounts required by the _claimRewards_ instruction
 *
 * @property [] project
 * @property [] multipliers
 * @property [_writable_] nft
 * @property [_writable_] rewardMint
 * @property [_writable_] vault
 * @property [_writable_] tokenAccount
 * @property [_writable_] staker
 * @property [_writable_, **signer**] wallet
 * @property [] clock
 * @category Instructions
 * @category ClaimRewards
 * @category generated
 */
export type ClaimRewardsInstructionAccounts = {
  project: web3.PublicKey
  multipliers: web3.PublicKey
  nft: web3.PublicKey
  rewardMint: web3.PublicKey
  vault: web3.PublicKey
  tokenAccount: web3.PublicKey
  staker: web3.PublicKey
  wallet: web3.PublicKey
  tokenProgram?: web3.PublicKey
  clock: web3.PublicKey
  anchorRemainingAccounts?: web3.AccountMeta[]
}

export const claimRewardsInstructionDiscriminator = [
  4, 144, 132, 71, 116, 23, 151, 80,
]

/**
 * Creates a _ClaimRewards_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @category Instructions
 * @category ClaimRewards
 * @category generated
 */
export function createClaimRewardsInstruction(
  accounts: ClaimRewardsInstructionAccounts,
  programId = new web3.PublicKey('8pyniLLXEHVUJKX2h5E9DrvwTsRmSR64ucUYBg8jQgPP')
) {
  const [data] = claimRewardsStruct.serialize({
    instructionDiscriminator: claimRewardsInstructionDiscriminator,
  })
  const keys: web3.AccountMeta[] = [
    {
      pubkey: accounts.project,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.multipliers,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.nft,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.rewardMint,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.vault,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.tokenAccount,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.staker,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.wallet,
      isWritable: true,
      isSigner: true,
    },
    {
      pubkey: accounts.tokenProgram ?? splToken.TOKEN_PROGRAM_ID,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.clock,
      isWritable: false,
      isSigner: false,
    },
  ]

  if (accounts.anchorRemainingAccounts != null) {
    for (const acc of accounts.anchorRemainingAccounts) {
      keys.push(acc)
    }
  }

  const ix = new web3.TransactionInstruction({
    programId,
    keys,
    data,
  })
  return ix
}
