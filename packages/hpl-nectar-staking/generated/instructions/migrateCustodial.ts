/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as splToken from '@solana/spl-token'
import * as beet from '@metaplex-foundation/beet'
import * as web3 from '@solana/web3.js'
import { MigrateArgs, migrateArgsBeet } from '../types/MigrateArgs'

/**
 * @category Instructions
 * @category MigrateCustodial
 * @category generated
 */
export type MigrateCustodialInstructionArgs = {
  args: MigrateArgs
}
/**
 * @category Instructions
 * @category MigrateCustodial
 * @category generated
 */
export const migrateCustodialStruct = new beet.BeetArgsStruct<
  MigrateCustodialInstructionArgs & {
    instructionDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['args', migrateArgsBeet],
  ],
  'MigrateCustodialInstructionArgs'
)
/**
 * Accounts required by the _migrateCustodial_ instruction
 *
 * @property [_writable_, **signer**] escrow
 * @property [_writable_] nftAccount
 * @property [] stakingProject
 * @property [_writable_] nft
 * @property [_writable_] nftMint
 * @property [_writable_] nftMetadata
 * @property [_writable_] nftEdition
 * @property [_writable_] depositAccount (optional)
 * @property [_writable_] staker
 * @property [_writable_] wallet
 * @property [_writable_, **signer**] authority
 * @property [_writable_, **signer**] payer
 * @property [] associatedTokenProgram
 * @property [] tokenMetadataProgram
 * @property [] clock
 * @property [] sysvarInstructions
 * @property [] project
 * @property [] delegateAuthority (optional)
 * @property [_writable_] vault
 * @category Instructions
 * @category MigrateCustodial
 * @category generated
 */
export type MigrateCustodialInstructionAccounts = {
  escrow: web3.PublicKey
  nftAccount: web3.PublicKey
  stakingProject: web3.PublicKey
  nft: web3.PublicKey
  nftMint: web3.PublicKey
  nftMetadata: web3.PublicKey
  nftEdition: web3.PublicKey
  depositAccount?: web3.PublicKey
  staker: web3.PublicKey
  wallet: web3.PublicKey
  authority: web3.PublicKey
  payer: web3.PublicKey
  systemProgram?: web3.PublicKey
  tokenProgram?: web3.PublicKey
  associatedTokenProgram: web3.PublicKey
  tokenMetadataProgram: web3.PublicKey
  clock: web3.PublicKey
  sysvarInstructions: web3.PublicKey
  project: web3.PublicKey
  delegateAuthority?: web3.PublicKey
  vault: web3.PublicKey
  anchorRemainingAccounts?: web3.AccountMeta[]
}

export const migrateCustodialInstructionDiscriminator = [
  185, 90, 240, 179, 249, 238, 69, 226,
]

/**
 * Creates a _MigrateCustodial_ instruction.
 *
 * Optional accounts that are not provided will be omitted from the accounts
 * array passed with the instruction.
 * An optional account that is set cannot follow an optional account that is unset.
 * Otherwise an Error is raised.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @param args to provide as instruction data to the program
 *
 * @category Instructions
 * @category MigrateCustodial
 * @category generated
 */
export function createMigrateCustodialInstruction(
  accounts: MigrateCustodialInstructionAccounts,
  args: MigrateCustodialInstructionArgs,
  programId = new web3.PublicKey('5CLnmLaVPfKKZUFZyLoXaVgwCDNZ43bt3ssNRiLxUnPG')
) {
  const [data] = migrateCustodialStruct.serialize({
    instructionDiscriminator: migrateCustodialInstructionDiscriminator,
    ...args,
  })
  const keys: web3.AccountMeta[] = [
    {
      pubkey: accounts.escrow,
      isWritable: true,
      isSigner: true,
    },
    {
      pubkey: accounts.nftAccount,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.stakingProject,
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

  if (accounts.depositAccount != null) {
    keys.push({
      pubkey: accounts.depositAccount,
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
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.authority,
    isWritable: true,
    isSigner: true,
  })
  keys.push({
    pubkey: accounts.payer,
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
  if (accounts.delegateAuthority != null) {
    if (accounts.depositAccount == null) {
      throw new Error(
        "When providing 'delegateAuthority' then 'accounts.depositAccount' need(s) to be provided as well."
      )
    }
    keys.push({
      pubkey: accounts.delegateAuthority,
      isWritable: false,
      isSigner: false,
    })
  }
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
