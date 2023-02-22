/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as beet from '@metaplex-foundation/beet'
import * as web3 from '@solana/web3.js'
import {
  AddMultiplierArgs,
  addMultiplierArgsBeet,
} from '../types/AddMultiplierArgs'

/**
 * @category Instructions
 * @category AddMultiplier
 * @category generated
 */
export type AddMultiplierInstructionArgs = {
  args: AddMultiplierArgs
}
/**
 * @category Instructions
 * @category AddMultiplier
 * @category generated
 */
export const addMultiplierStruct = new beet.FixableBeetArgsStruct<
  AddMultiplierInstructionArgs & {
    instructionDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['args', addMultiplierArgsBeet],
  ],
  'AddMultiplierInstructionArgs'
)
/**
 * Accounts required by the _addMultiplier_ instruction
 *
 * @property [_writable_] stakingPool
 * @property [_writable_] multipliers
 * @property [_writable_, **signer**] authority
 * @property [_writable_, **signer**] payer
 * @property [] rentSysvar
 * @property [] project
 * @property [] delegateAuthority (optional)
 * @property [_writable_] vault
 * @category Instructions
 * @category AddMultiplier
 * @category generated
 */
export type AddMultiplierInstructionAccounts = {
  stakingPool: web3.PublicKey
  multipliers: web3.PublicKey
  authority: web3.PublicKey
  payer: web3.PublicKey
  systemProgram?: web3.PublicKey
  rentSysvar: web3.PublicKey
  project: web3.PublicKey
  delegateAuthority?: web3.PublicKey
  vault: web3.PublicKey
  anchorRemainingAccounts?: web3.AccountMeta[]
}

export const addMultiplierInstructionDiscriminator = [
  193, 91, 229, 211, 57, 136, 141, 169,
]

/**
 * Creates a _AddMultiplier_ instruction.
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
 * @category AddMultiplier
 * @category generated
 */
export function createAddMultiplierInstruction(
  accounts: AddMultiplierInstructionAccounts,
  args: AddMultiplierInstructionArgs,
  programId = new web3.PublicKey('5CLnmLaVPfKKZUFZyLoXaVgwCDNZ43bt3ssNRiLxUnPG')
) {
  const [data] = addMultiplierStruct.serialize({
    instructionDiscriminator: addMultiplierInstructionDiscriminator,
    ...args,
  })
  const keys: web3.AccountMeta[] = [
    {
      pubkey: accounts.stakingPool,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.multipliers,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.authority,
      isWritable: true,
      isSigner: true,
    },
    {
      pubkey: accounts.payer,
      isWritable: true,
      isSigner: true,
    },
    {
      pubkey: accounts.systemProgram ?? web3.SystemProgram.programId,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.rentSysvar,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.project,
      isWritable: false,
      isSigner: false,
    },
  ]

  if (accounts.delegateAuthority != null) {
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
