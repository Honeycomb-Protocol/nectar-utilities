/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as beet from '@metaplex-foundation/beet'
import * as web3 from '@solana/web3.js'

/**
 * @category Instructions
 * @category InitStaker
 * @category generated
 */
export const initStakerStruct = new beet.BeetArgsStruct<{
  instructionDiscriminator: number[] /* size: 8 */
}>(
  [['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)]],
  'InitStakerInstructionArgs'
)
/**
 * Accounts required by the _initStaker_ instruction
 *
 * @property [] stakingPool
 * @property [_writable_] staker
 * @property [_writable_, **signer**] wallet
 * @property [] hiveControl
 * @property [] hplEvents
 * @property [] clock
 * @property [] instructionsSysvar
 * @property [] project
 * @property [_writable_] vault
 * @category Instructions
 * @category InitStaker
 * @category generated
 */
export type InitStakerInstructionAccounts = {
  stakingPool: web3.PublicKey
  staker: web3.PublicKey
  wallet: web3.PublicKey
  systemProgram?: web3.PublicKey
  hiveControl: web3.PublicKey
  hplEvents: web3.PublicKey
  clock: web3.PublicKey
  instructionsSysvar: web3.PublicKey
  project: web3.PublicKey
  vault: web3.PublicKey
  anchorRemainingAccounts?: web3.AccountMeta[]
}

export const initStakerInstructionDiscriminator = [
  7, 30, 238, 86, 71, 76, 253, 175,
]

/**
 * Creates a _InitStaker_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @category Instructions
 * @category InitStaker
 * @category generated
 */
export function createInitStakerInstruction(
  accounts: InitStakerInstructionAccounts,
  programId = new web3.PublicKey('MiNESdRXUSmWY7NkAKdW9nMkjJZCaucguY3MDvkSmr6')
) {
  const [data] = initStakerStruct.serialize({
    instructionDiscriminator: initStakerInstructionDiscriminator,
  })
  const keys: web3.AccountMeta[] = [
    {
      pubkey: accounts.stakingPool,
      isWritable: false,
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
      pubkey: accounts.systemProgram ?? web3.SystemProgram.programId,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.hiveControl,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.hplEvents,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.clock,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.instructionsSysvar,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.project,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.vault,
      isWritable: true,
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
