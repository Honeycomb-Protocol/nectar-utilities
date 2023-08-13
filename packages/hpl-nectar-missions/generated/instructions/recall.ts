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
 * @category Recall
 * @category generated
 */
export const recallStruct = new beet.BeetArgsStruct<{
  instructionDiscriminator: number[] /* size: 8 */
}>(
  [['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)]],
  'RecallInstructionArgs'
)
/**
 * Accounts required by the _recall_ instruction
 *
 * @property [] project
 * @property [] missionPool
 * @property [] mission
 * @property [_writable_] participation
 * @property [_writable_, **signer**] wallet
 * @property [] logWrapper
 * @property [] clock
 * @property [] instructionsSysvar
 * @property [_writable_] vault
 * @category Instructions
 * @category Recall
 * @category generated
 */
export type RecallInstructionAccounts = {
  project: web3.PublicKey
  missionPool: web3.PublicKey
  mission: web3.PublicKey
  participation: web3.PublicKey
  wallet: web3.PublicKey
  systemProgram?: web3.PublicKey
  logWrapper: web3.PublicKey
  clock: web3.PublicKey
  instructionsSysvar: web3.PublicKey
  vault: web3.PublicKey
  anchorRemainingAccounts?: web3.AccountMeta[]
}

export const recallInstructionDiscriminator = [
  116, 112, 101, 191, 131, 230, 83, 84,
]

/**
 * Creates a _Recall_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @category Instructions
 * @category Recall
 * @category generated
 */
export function createRecallInstruction(
  accounts: RecallInstructionAccounts,
  programId = new web3.PublicKey('HUNTopv9dHDdTPPMV1SfKZAxjXtuM4ic2PVEWPbsi9Z2')
) {
  const [data] = recallStruct.serialize({
    instructionDiscriminator: recallInstructionDiscriminator,
  })
  const keys: web3.AccountMeta[] = [
    {
      pubkey: accounts.project,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.missionPool,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.mission,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.participation,
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
      pubkey: accounts.logWrapper,
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
