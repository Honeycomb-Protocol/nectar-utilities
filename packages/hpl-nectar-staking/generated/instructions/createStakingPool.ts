/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as splToken from '@solana/spl-token'
import * as beet from '@metaplex-foundation/beet'
import * as web3 from '@solana/web3.js'
import {
  CreateStakingPoolArgs,
  createStakingPoolArgsBeet,
} from '../types/CreateStakingPoolArgs'

/**
 * @category Instructions
 * @category CreateStakingPool
 * @category generated
 */
export type CreateStakingPoolInstructionArgs = {
  args: CreateStakingPoolArgs
}
/**
 * @category Instructions
 * @category CreateStakingPool
 * @category generated
 */
export const createStakingPoolStruct = new beet.FixableBeetArgsStruct<
  CreateStakingPoolInstructionArgs & {
    instructionDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['args', createStakingPoolArgsBeet],
  ],
  'CreateStakingPoolInstructionArgs'
)
/**
 * Accounts required by the _createStakingPool_ instruction
 *
 * @property [] key
 * @property [_writable_] stakingPool
 * @property [] currency
 * @property [_writable_] project
 * @property [] delegateAuthority (optional)
 * @property [**signer**] authority
 * @property [_writable_, **signer**] payer
 * @property [_writable_] vault
 * @property [] logWrapper
 * @property [] clockSysvar
 * @property [] rentSysvar
 * @property [] hiveControl
 * @category Instructions
 * @category CreateStakingPool
 * @category generated
 */
export type CreateStakingPoolInstructionAccounts = {
  key: web3.PublicKey
  stakingPool: web3.PublicKey
  currency: web3.PublicKey
  project: web3.PublicKey
  delegateAuthority?: web3.PublicKey
  authority: web3.PublicKey
  payer: web3.PublicKey
  vault: web3.PublicKey
  systemProgram?: web3.PublicKey
  logWrapper: web3.PublicKey
  clockSysvar: web3.PublicKey
  rentSysvar: web3.PublicKey
  tokenProgram?: web3.PublicKey
  hiveControl: web3.PublicKey
  anchorRemainingAccounts?: web3.AccountMeta[]
}

export const createStakingPoolInstructionDiscriminator = [
  104, 58, 70, 37, 225, 212, 145, 93,
]

/**
 * Creates a _CreateStakingPool_ instruction.
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
 * @category CreateStakingPool
 * @category generated
 */
export function createCreateStakingPoolInstruction(
  accounts: CreateStakingPoolInstructionAccounts,
  args: CreateStakingPoolInstructionArgs,
  programId = new web3.PublicKey('STAkY8Zx3rfY2MUyTJkdLB5jaM47mnDpKUUWzkj5d3L')
) {
  const [data] = createStakingPoolStruct.serialize({
    instructionDiscriminator: createStakingPoolInstructionDiscriminator,
    ...args,
  })
  const keys: web3.AccountMeta[] = [
    {
      pubkey: accounts.key,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.stakingPool,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.currency,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.project,
      isWritable: true,
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
    pubkey: accounts.authority,
    isWritable: false,
    isSigner: true,
  })
  keys.push({
    pubkey: accounts.payer,
    isWritable: true,
    isSigner: true,
  })
  keys.push({
    pubkey: accounts.vault,
    isWritable: true,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.systemProgram ?? web3.SystemProgram.programId,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.logWrapper,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.clockSysvar,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.rentSysvar,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.tokenProgram ?? splToken.TOKEN_PROGRAM_ID,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.hiveControl,
    isWritable: false,
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
