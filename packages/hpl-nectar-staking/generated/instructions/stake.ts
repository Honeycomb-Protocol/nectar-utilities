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
 * @category Stake
 * @category generated
 */
export const stakeStruct = new beet.BeetArgsStruct<{
  instructionDiscriminator: number[] /* size: 8 */
}>(
  [['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)]],
  'StakeInstructionArgs'
)
/**
 * Accounts required by the _stake_ instruction
 *
 * @property [] stakingPool
 * @property [_writable_] nft
 * @property [_writable_] nftMint
 * @property [_writable_] nftAccount
 * @property [_writable_] nftMetadata
 * @property [_writable_] nftEdition
 * @property [_writable_] nftTokenRecord (optional)
 * @property [_writable_] staker
 * @property [_writable_] depositAccount (optional)
 * @property [_writable_] depositTokenRecord (optional)
 * @property [_writable_, **signer**] wallet
 * @property [] associatedTokenProgram
 * @property [] tokenMetadataProgram
 * @property [] clock
 * @property [] sysvarInstructions
 * @property [] project
 * @property [_writable_] vault
 * @category Instructions
 * @category Stake
 * @category generated
 */
export type StakeInstructionAccounts = {
  stakingPool: web3.PublicKey
  nft: web3.PublicKey
  nftMint: web3.PublicKey
  nftAccount: web3.PublicKey
  nftMetadata: web3.PublicKey
  nftEdition: web3.PublicKey
  nftTokenRecord?: web3.PublicKey
  staker: web3.PublicKey
  depositAccount?: web3.PublicKey
  depositTokenRecord?: web3.PublicKey
  wallet: web3.PublicKey
  systemProgram?: web3.PublicKey
  tokenProgram?: web3.PublicKey
  associatedTokenProgram: web3.PublicKey
  tokenMetadataProgram: web3.PublicKey
  clock: web3.PublicKey
  sysvarInstructions: web3.PublicKey
  project: web3.PublicKey
  vault: web3.PublicKey
  anchorRemainingAccounts?: web3.AccountMeta[]
}

export const stakeInstructionDiscriminator = [
  206, 176, 202, 18, 200, 209, 179, 108,
]

/**
 * Creates a _Stake_ instruction.
 *
 * Optional accounts that are not provided will be omitted from the accounts
 * array passed with the instruction.
 * An optional account that is set cannot follow an optional account that is unset.
 * Otherwise an Error is raised.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @category Instructions
 * @category Stake
 * @category generated
 */
export function createStakeInstruction(
  accounts: StakeInstructionAccounts,
  programId = new web3.PublicKey('9nVqFEhHT5UG1Nf3sLWhrHjBwJtwNL9FCvEwquZtQjxa')
) {
  const [data] = stakeStruct.serialize({
    instructionDiscriminator: stakeInstructionDiscriminator,
  })
  const keys: web3.AccountMeta[] = [
    {
      pubkey: accounts.stakingPool,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.nft,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.nftMint,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.nftAccount,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.nftMetadata,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.nftEdition,
      isWritable: true,
      isSigner: false,
    },
  ]

  if (accounts.nftTokenRecord != null) {
    keys.push({
      pubkey: accounts.nftTokenRecord,
      isWritable: true,
      isSigner: false,
    })
  }
  keys.push({
    pubkey: accounts.staker,
    isWritable: true,
    isSigner: false,
  })
  if (accounts.depositAccount != null) {
    if (accounts.nftTokenRecord == null) {
      throw new Error(
        "When providing 'depositAccount' then 'accounts.nftTokenRecord' need(s) to be provided as well."
      )
    }
    keys.push({
      pubkey: accounts.depositAccount,
      isWritable: true,
      isSigner: false,
    })
  }
  if (accounts.depositTokenRecord != null) {
    if (accounts.nftTokenRecord == null || accounts.depositAccount == null) {
      throw new Error(
        "When providing 'depositTokenRecord' then 'accounts.nftTokenRecord', 'accounts.depositAccount' need(s) to be provided as well."
      )
    }
    keys.push({
      pubkey: accounts.depositTokenRecord,
      isWritable: true,
      isSigner: false,
    })
  }
  keys.push({
    pubkey: accounts.wallet,
    isWritable: true,
    isSigner: true,
  })
  keys.push({
    pubkey: accounts.systemProgram ?? web3.SystemProgram.programId,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.tokenProgram ?? splToken.TOKEN_PROGRAM_ID,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.associatedTokenProgram,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.tokenMetadataProgram,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.clock,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.sysvarInstructions,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.project,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.vault,
    isWritable: true,
    isSigner: false,
  })

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
