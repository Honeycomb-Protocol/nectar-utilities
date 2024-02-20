/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as splToken from '@solana/spl-token'
import * as beet from '@metaplex-foundation/beet'
import * as web3 from '@solana/web3.js'
import { ParticipateArgs, participateArgsBeet } from '../types/ParticipateArgs'

/**
 * @category Instructions
 * @category Participate
 * @category generated
 */
export type ParticipateInstructionArgs = {
  args: ParticipateArgs
}
/**
 * @category Instructions
 * @category Participate
 * @category generated
 */
export const participateStruct = new beet.BeetArgsStruct<
  ParticipateInstructionArgs & {
    instructionDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['args', participateArgsBeet],
  ],
  'ParticipateInstructionArgs'
)
/**
 * Accounts required by the _participate_ instruction
 *
 * @property [_writable_] project
 * @property [_writable_] missionPool
 * @property [_writable_] mission
 * @property [_writable_] characterModel
 * @property [_writable_] merkleTree
 * @property [] currency
 * @property [_writable_] mint
 * @property [_writable_] holderAccount
 * @property [_writable_] tokenAccount
 * @property [_writable_, **signer**] wallet
 * @property [_writable_] profile
 * @property [_writable_] vault
 * @property [] compressionProgram
 * @property [] hiveControl
 * @property [] characterManager
 * @property [] currencyManagerProgram
 * @property [] clock
 * @property [] rentSysvar
 * @property [] instructionsSysvar
 * @property [] logWrapper
 * @category Instructions
 * @category Participate
 * @category generated
 */
export type ParticipateInstructionAccounts = {
  project: web3.PublicKey
  missionPool: web3.PublicKey
  mission: web3.PublicKey
  characterModel: web3.PublicKey
  merkleTree: web3.PublicKey
  currency: web3.PublicKey
  mint: web3.PublicKey
  holderAccount: web3.PublicKey
  tokenAccount: web3.PublicKey
  wallet: web3.PublicKey
  profile: web3.PublicKey
  vault: web3.PublicKey
  systemProgram?: web3.PublicKey
  compressionProgram: web3.PublicKey
  hiveControl: web3.PublicKey
  characterManager: web3.PublicKey
  tokenProgram?: web3.PublicKey
  currencyManagerProgram: web3.PublicKey
  clock: web3.PublicKey
  rentSysvar: web3.PublicKey
  instructionsSysvar: web3.PublicKey
  logWrapper: web3.PublicKey
  anchorRemainingAccounts?: web3.AccountMeta[]
}

export const participateInstructionDiscriminator = [
  71, 30, 209, 149, 172, 95, 73, 193,
]

/**
 * Creates a _Participate_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @param args to provide as instruction data to the program
 *
 * @category Instructions
 * @category Participate
 * @category generated
 */
export function createParticipateInstruction(
  accounts: ParticipateInstructionAccounts,
  args: ParticipateInstructionArgs,
  programId = new web3.PublicKey('BNdAHQMniLicundk1jo4qKWyNr9C8bK7oUrzgSwoSGmZ')
) {
  const [data] = participateStruct.serialize({
    instructionDiscriminator: participateInstructionDiscriminator,
    ...args,
  })
  const keys: web3.AccountMeta[] = [
    {
      pubkey: accounts.project,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.missionPool,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.mission,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.characterModel,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.merkleTree,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.currency,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.mint,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.holderAccount,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.tokenAccount,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.wallet,
      isWritable: true,
      isSigner: true,
    },
    {
      pubkey: accounts.profile,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.vault,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.systemProgram ?? web3.SystemProgram.programId,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.compressionProgram,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.hiveControl,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.characterManager,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.tokenProgram ?? splToken.TOKEN_PROGRAM_ID,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.currencyManagerProgram,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.clock,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.rentSysvar,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.instructionsSysvar,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.logWrapper,
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
