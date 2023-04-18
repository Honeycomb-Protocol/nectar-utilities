/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as beet from '@metaplex-foundation/beet'
import * as web3 from '@solana/web3.js'
import {
  UpdateStakingPoolArgs,
  updateStakingPoolArgsBeet,
} from '../types/UpdateStakingPoolArgs'

/**
 * @category Instructions
 * @category UpdateStakingPool
 * @category generated
 */
export type UpdateStakingPoolInstructionArgs = {
  args: UpdateStakingPoolArgs
}
/**
 * @category Instructions
 * @category UpdateStakingPool
 * @category generated
 */
export const updateStakingPoolStruct = new beet.FixableBeetArgsStruct<
  UpdateStakingPoolInstructionArgs & {
    instructionDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['args', updateStakingPoolArgsBeet],
  ],
  'UpdateStakingPoolInstructionArgs'
)
/**
 * Accounts required by the _updateStakingPool_ instruction
 *
 * @property [_writable_] stakingPool
 * @property [] collection (optional)
 * @property [] creator (optional)
 * @property [_writable_, **signer**] authority
 * @property [_writable_, **signer**] payer
 * @property [] project
 * @property [] delegateAuthority (optional)
 * @property [_writable_] vault
 * @category Instructions
 * @category UpdateStakingPool
 * @category generated
 */
export type UpdateStakingPoolInstructionAccounts = {
  stakingPool: web3.PublicKey
  collection?: web3.PublicKey
  creator?: web3.PublicKey
  authority: web3.PublicKey
  payer: web3.PublicKey
  systemProgram?: web3.PublicKey
  rent?: web3.PublicKey
  project: web3.PublicKey
  delegateAuthority?: web3.PublicKey
  vault: web3.PublicKey
  anchorRemainingAccounts?: web3.AccountMeta[]
}

export const updateStakingPoolInstructionDiscriminator = [
  49, 122, 53, 40, 235, 159, 240, 59,
]

/**
 * Creates a _UpdateStakingPool_ instruction.
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
 * @category UpdateStakingPool
 * @category generated
 */
export function createUpdateStakingPoolInstruction(
  accounts: UpdateStakingPoolInstructionAccounts,
  args: UpdateStakingPoolInstructionArgs,
  programId = new web3.PublicKey('STAkY8Zx3rfY2MUyTJkdLB5jaM47mnDpKUUWzkj5d3L')
) {
  const [data] = updateStakingPoolStruct.serialize({
    instructionDiscriminator: updateStakingPoolInstructionDiscriminator,
    ...args,
  })
  const keys: web3.AccountMeta[] = [
    {
      pubkey: accounts.stakingPool,
      isWritable: true,
      isSigner: false,
    },
  ]

  if (accounts.collection != null) {
    keys.push({
      pubkey: accounts.collection,
      isWritable: false,
      isSigner: false,
    })
  }
  if (accounts.creator != null) {
    if (accounts.collection == null) {
      throw new Error(
        "When providing 'creator' then 'accounts.collection' need(s) to be provided as well."
      )
    }
    keys.push({
      pubkey: accounts.creator,
      isWritable: false,
      isSigner: false,
    })
  }
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
    pubkey: accounts.rent ?? web3.SYSVAR_RENT_PUBKEY,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.project,
    isWritable: false,
    isSigner: false,
  })
  if (accounts.delegateAuthority != null) {
    if (accounts.collection == null || accounts.creator == null) {
      throw new Error(
        "When providing 'delegateAuthority' then 'accounts.collection', 'accounts.creator' need(s) to be provided as well."
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
