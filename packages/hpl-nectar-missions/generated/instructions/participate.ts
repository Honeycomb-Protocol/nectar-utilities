/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

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
export const participateStruct = new beet.FixableBeetArgsStruct<
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
 * @property [] project
 * @property [] stakingPool
 * @property [_writable_] missionPool
 * @property [] mission
 * @property [] nft
 * @property [] staker
 * @property [_writable_] participation
 * @property [_writable_, **signer**] wallet
 * @property [_writable_] vault
 * @property [] rentSysvar
 * @property [] clock
 * @category Instructions
 * @category Participate
 * @category generated
 */
export type ParticipateInstructionAccounts = {
  project: web3.PublicKey
  stakingPool: web3.PublicKey
  missionPool: web3.PublicKey
  mission: web3.PublicKey
  nft: web3.PublicKey
  staker: web3.PublicKey
  participation: web3.PublicKey
  wallet: web3.PublicKey
  vault: web3.PublicKey
  systemProgram?: web3.PublicKey
  rentSysvar: web3.PublicKey
  clock: web3.PublicKey
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
  programId = new web3.PublicKey('CW2fmed6FRSwoQMBcUDkvbUUHNQXMDgW4zk9Kwn56RRr')
) {
  const [data] = participateStruct.serialize({
    instructionDiscriminator: participateInstructionDiscriminator,
    ...args,
  })
  const keys: web3.AccountMeta[] = [
    {
      pubkey: accounts.project,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.stakingPool,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.missionPool,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.mission,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.nft,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.staker,
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
      pubkey: accounts.rentSysvar,
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