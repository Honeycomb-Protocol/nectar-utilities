/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as beet from '@metaplex-foundation/beet'
import * as web3 from '@solana/web3.js'
import { CNFTArgs, cNFTArgsBeet } from '../types/CNFTArgs'

/**
 * @category Instructions
 * @category UnstakeCnft
 * @category generated
 */
export type UnstakeCnftInstructionArgs = {
  args: CNFTArgs
}
/**
 * @category Instructions
 * @category UnstakeCnft
 * @category generated
 */
export const unstakeCnftStruct = new beet.BeetArgsStruct<
  UnstakeCnftInstructionArgs & {
    instructionDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['args', cNFTArgsBeet],
  ],
  'UnstakeCnftInstructionArgs'
)
/**
 * Accounts required by the _unstakeCnft_ instruction
 *
 * @property [_writable_] stakingPool
 * @property [_writable_] nft
 * @property [_writable_] merkleTree
 * @property [] treeAuthority
 * @property [] creatorHash
 * @property [_writable_] staker
 * @property [_writable_, **signer**] wallet
 * @property [] bubblegumProgram
 * @property [] compressionProgram
 * @property [] logWrapper
 * @property [] clock
 * @property [] instructionsSysvar
 * @property [] project
 * @property [_writable_] vault
 * @category Instructions
 * @category UnstakeCnft
 * @category generated
 */
export type UnstakeCnftInstructionAccounts = {
  stakingPool: web3.PublicKey
  nft: web3.PublicKey
  merkleTree: web3.PublicKey
  treeAuthority: web3.PublicKey
  creatorHash: web3.PublicKey
  staker: web3.PublicKey
  wallet: web3.PublicKey
  systemProgram?: web3.PublicKey
  bubblegumProgram: web3.PublicKey
  compressionProgram: web3.PublicKey
  logWrapper: web3.PublicKey
  clock: web3.PublicKey
  instructionsSysvar: web3.PublicKey
  project: web3.PublicKey
  vault: web3.PublicKey
  anchorRemainingAccounts?: web3.AccountMeta[]
}

export const unstakeCnftInstructionDiscriminator = [
  171, 194, 46, 211, 116, 227, 222, 35,
]

/**
 * Creates a _UnstakeCnft_ instruction.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @param args to provide as instruction data to the program
 *
 * @category Instructions
 * @category UnstakeCnft
 * @category generated
 */
export function createUnstakeCnftInstruction(
  accounts: UnstakeCnftInstructionAccounts,
  args: UnstakeCnftInstructionArgs,
  programId = new web3.PublicKey('STAkY8Zx3rfY2MUyTJkdLB5jaM47mnDpKUUWzkj5d3L')
) {
  const [data] = unstakeCnftStruct.serialize({
    instructionDiscriminator: unstakeCnftInstructionDiscriminator,
    ...args,
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
      pubkey: accounts.merkleTree,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.treeAuthority,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.creatorHash,
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
      pubkey: accounts.bubblegumProgram,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.compressionProgram,
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
