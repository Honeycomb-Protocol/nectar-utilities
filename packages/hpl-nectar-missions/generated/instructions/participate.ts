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
 * @property [_writable_] project
 * @property [] stakingPool
 * @property [_writable_] missionPool
 * @property [] mission
 * @property [_writable_] nft
 * @property [] staker
 * @property [] currency
 * @property [] mint
 * @property [] vaultHolderAccount
 * @property [_writable_] vaultTokenAccount
 * @property [_writable_] holderAccount
 * @property [_writable_] tokenAccount
 * @property [_writable_] participation
 * @property [_writable_, **signer**] wallet
 * @property [_writable_] vault
 * @property [] currencyManagerProgram
 * @property [] nectarStakingProgram
 * @property [] logWrapper
 * @property [] clock
 * @property [] rentSysvar
 * @property [] instructionsSysvar
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
  currency: web3.PublicKey
  mint: web3.PublicKey
  vaultHolderAccount: web3.PublicKey
  vaultTokenAccount: web3.PublicKey
  holderAccount: web3.PublicKey
  tokenAccount: web3.PublicKey
  participation: web3.PublicKey
  wallet: web3.PublicKey
  vault: web3.PublicKey
  systemProgram?: web3.PublicKey
  tokenProgram?: web3.PublicKey
  currencyManagerProgram: web3.PublicKey
  nectarStakingProgram: web3.PublicKey
  logWrapper: web3.PublicKey
  clock: web3.PublicKey
  rentSysvar: web3.PublicKey
  instructionsSysvar: web3.PublicKey
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
  programId = new web3.PublicKey('HUNTopv9dHDdTPPMV1SfKZAxjXtuM4ic2PVEWPbsi9Z2')
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
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.staker,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.currency,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.mint,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.vaultHolderAccount,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.vaultTokenAccount,
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
      pubkey: accounts.nectarStakingProgram,
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
      pubkey: accounts.rentSysvar,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.instructionsSysvar,
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
