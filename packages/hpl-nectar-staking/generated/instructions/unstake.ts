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
 * @category Unstake
 * @category generated
 */
export const unstakeStruct = new beet.BeetArgsStruct<{
  instructionDiscriminator: number[] /* size: 8 */
}>(
  [['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)]],
  'UnstakeInstructionArgs'
)
/**
 * Accounts required by the _unstake_ instruction
 *
 * @property [_writable_] stakingPool
 * @property [_writable_] nft
 * @property [_writable_] nftMint
 * @property [_writable_] nftAccount
 * @property [_writable_] nftMetadata
 * @property [_writable_] nftEdition
 * @property [_writable_] nftTokenRecord (optional)
 * @property [_writable_] depositAccount (optional)
 * @property [_writable_] depositTokenRecord (optional)
 * @property [_writable_] staker
 * @property [_writable_, **signer**] wallet
 * @property [] hiveControl
 * @property [] associatedTokenProgram
 * @property [] tokenMetadataProgram
 * @property [] hplEvents
 * @property [] clock
 * @property [] instructionsSysvar
 * @property [] project
 * @property [_writable_] vault
 * @property [] authorizationRulesProgram (optional)
 * @property [] authorizationRules (optional)
 * @category Instructions
 * @category Unstake
 * @category generated
 */
export type UnstakeInstructionAccounts = {
  stakingPool: web3.PublicKey
  nft: web3.PublicKey
  nftMint: web3.PublicKey
  nftAccount: web3.PublicKey
  nftMetadata: web3.PublicKey
  nftEdition: web3.PublicKey
  nftTokenRecord?: web3.PublicKey
  depositAccount?: web3.PublicKey
  depositTokenRecord?: web3.PublicKey
  staker: web3.PublicKey
  wallet: web3.PublicKey
  systemProgram?: web3.PublicKey
  hiveControl: web3.PublicKey
  tokenProgram?: web3.PublicKey
  associatedTokenProgram: web3.PublicKey
  tokenMetadataProgram: web3.PublicKey
  hplEvents: web3.PublicKey
  clock: web3.PublicKey
  instructionsSysvar: web3.PublicKey
  project: web3.PublicKey
  vault: web3.PublicKey
  authorizationRulesProgram?: web3.PublicKey
  authorizationRules?: web3.PublicKey
  anchorRemainingAccounts?: web3.AccountMeta[]
}

export const unstakeInstructionDiscriminator = [
  90, 95, 107, 42, 205, 124, 50, 225,
]

/**
 * Creates a _Unstake_ instruction.
 *
 * Optional accounts that are not provided will be omitted from the accounts
 * array passed with the instruction.
 * An optional account that is set cannot follow an optional account that is unset.
 * Otherwise an Error is raised.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @category Instructions
 * @category Unstake
 * @category generated
 */
export function createUnstakeInstruction(
  accounts: UnstakeInstructionAccounts,
  programId = new web3.PublicKey('MiNESdRXUSmWY7NkAKdW9nMkjJZCaucguY3MDvkSmr6')
) {
  const [data] = unstakeStruct.serialize({
    instructionDiscriminator: unstakeInstructionDiscriminator,
  })
  const keys: web3.AccountMeta[] = [
    {
      pubkey: accounts.stakingPool,
      isWritable: true,
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
    pubkey: accounts.staker,
    isWritable: true,
    isSigner: false,
  })
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
    pubkey: accounts.hiveControl,
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
    pubkey: accounts.hplEvents,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.clock,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.instructionsSysvar,
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
  if (accounts.authorizationRulesProgram != null) {
    if (
      accounts.nftTokenRecord == null ||
      accounts.depositAccount == null ||
      accounts.depositTokenRecord == null
    ) {
      throw new Error(
        "When providing 'authorizationRulesProgram' then 'accounts.nftTokenRecord', 'accounts.depositAccount', 'accounts.depositTokenRecord' need(s) to be provided as well."
      )
    }
    keys.push({
      pubkey: accounts.authorizationRulesProgram,
      isWritable: false,
      isSigner: false,
    })
  }
  if (accounts.authorizationRules != null) {
    if (
      accounts.nftTokenRecord == null ||
      accounts.depositAccount == null ||
      accounts.depositTokenRecord == null ||
      accounts.authorizationRulesProgram == null
    ) {
      throw new Error(
        "When providing 'authorizationRules' then 'accounts.nftTokenRecord', 'accounts.depositAccount', 'accounts.depositTokenRecord', 'accounts.authorizationRulesProgram' need(s) to be provided as well."
      )
    }
    keys.push({
      pubkey: accounts.authorizationRules,
      isWritable: false,
      isSigner: false,
    })
  }

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
