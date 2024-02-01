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
  CollectRewardsArgs,
  collectRewardsArgsBeet,
} from '../types/CollectRewardsArgs'

/**
 * @category Instructions
 * @category CollectRewards
 * @category generated
 */
export type CollectRewardsInstructionArgs = {
  args: CollectRewardsArgs
}
/**
 * @category Instructions
 * @category CollectRewards
 * @category generated
 */
export const collectRewardsStruct = new beet.FixableBeetArgsStruct<
  CollectRewardsInstructionArgs & {
    instructionDiscriminator: number[] /* size: 8 */
  }
>(
  [
    ['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)],
    ['args', collectRewardsArgsBeet],
  ],
  'CollectRewardsInstructionArgs'
)
/**
 * Accounts required by the _collectRewards_ instruction
 *
 * @property [] characterModel
 * @property [_writable_] project
 * @property [] missionPool
 * @property [] missionPoolDelegate (optional)
 * @property [] mission
 * @property [_writable_] profile (optional)
 * @property [_writable_] mint (optional)
 * @property [] currency (optional)
 * @property [] holderAccount (optional)
 * @property [_writable_] tokenAccount (optional)
 * @property [_writable_, **signer**] wallet
 * @property [_writable_] vault
 * @property [_writable_] merkleTree
 * @property [] hiveControl
 * @property [] characterManager
 * @property [] currencyManagerProgram
 * @property [] hplEvents
 * @property [] compressionProgram
 * @property [] rentSysvar
 * @property [] instructionsSysvar
 * @property [] clock
 * @property [] logWrapper
 * @category Instructions
 * @category CollectRewards
 * @category generated
 */
export type CollectRewardsInstructionAccounts = {
  characterModel: web3.PublicKey
  project: web3.PublicKey
  missionPool: web3.PublicKey
  missionPoolDelegate?: web3.PublicKey
  mission: web3.PublicKey
  profile?: web3.PublicKey
  mint?: web3.PublicKey
  currency?: web3.PublicKey
  holderAccount?: web3.PublicKey
  tokenAccount?: web3.PublicKey
  wallet: web3.PublicKey
  vault: web3.PublicKey
  merkleTree: web3.PublicKey
  systemProgram?: web3.PublicKey
  hiveControl: web3.PublicKey
  characterManager: web3.PublicKey
  currencyManagerProgram: web3.PublicKey
  hplEvents: web3.PublicKey
  compressionProgram: web3.PublicKey
  tokenProgram?: web3.PublicKey
  rentSysvar: web3.PublicKey
  instructionsSysvar: web3.PublicKey
  clock: web3.PublicKey
  logWrapper: web3.PublicKey
  anchorRemainingAccounts?: web3.AccountMeta[]
}

export const collectRewardsInstructionDiscriminator = [
  63, 130, 90, 197, 39, 16, 143, 176,
]

/**
 * Creates a _CollectRewards_ instruction.
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
 * @category CollectRewards
 * @category generated
 */
export function createCollectRewardsInstruction(
  accounts: CollectRewardsInstructionAccounts,
  args: CollectRewardsInstructionArgs,
  programId = new web3.PublicKey('HuntaX1CmUt5EByyFPE8pMf13SpvezybmMTtjmpmGmfj')
) {
  const [data] = collectRewardsStruct.serialize({
    instructionDiscriminator: collectRewardsInstructionDiscriminator,
    ...args,
  })
  const keys: web3.AccountMeta[] = [
    {
      pubkey: accounts.characterModel,
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.project,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.missionPool,
      isWritable: false,
      isSigner: false,
    },
  ]

  if (accounts.missionPoolDelegate != null) {
    keys.push({
      pubkey: accounts.missionPoolDelegate,
      isWritable: false,
      isSigner: false,
    })
  }
  keys.push({
    pubkey: accounts.mission,
    isWritable: false,
    isSigner: false,
  })
  if (accounts.profile != null) {
    if (accounts.missionPoolDelegate == null) {
      throw new Error(
        "When providing 'profile' then 'accounts.missionPoolDelegate' need(s) to be provided as well."
      )
    }
    keys.push({
      pubkey: accounts.profile,
      isWritable: true,
      isSigner: false,
    })
  }
  if (accounts.mint != null) {
    if (accounts.missionPoolDelegate == null || accounts.profile == null) {
      throw new Error(
        "When providing 'mint' then 'accounts.missionPoolDelegate', 'accounts.profile' need(s) to be provided as well."
      )
    }
    keys.push({
      pubkey: accounts.mint,
      isWritable: true,
      isSigner: false,
    })
  }
  if (accounts.currency != null) {
    if (
      accounts.missionPoolDelegate == null ||
      accounts.profile == null ||
      accounts.mint == null
    ) {
      throw new Error(
        "When providing 'currency' then 'accounts.missionPoolDelegate', 'accounts.profile', 'accounts.mint' need(s) to be provided as well."
      )
    }
    keys.push({
      pubkey: accounts.currency,
      isWritable: false,
      isSigner: false,
    })
  }
  if (accounts.holderAccount != null) {
    if (
      accounts.missionPoolDelegate == null ||
      accounts.profile == null ||
      accounts.mint == null ||
      accounts.currency == null
    ) {
      throw new Error(
        "When providing 'holderAccount' then 'accounts.missionPoolDelegate', 'accounts.profile', 'accounts.mint', 'accounts.currency' need(s) to be provided as well."
      )
    }
    keys.push({
      pubkey: accounts.holderAccount,
      isWritable: false,
      isSigner: false,
    })
  }
  if (accounts.tokenAccount != null) {
    if (
      accounts.missionPoolDelegate == null ||
      accounts.profile == null ||
      accounts.mint == null ||
      accounts.currency == null ||
      accounts.holderAccount == null
    ) {
      throw new Error(
        "When providing 'tokenAccount' then 'accounts.missionPoolDelegate', 'accounts.profile', 'accounts.mint', 'accounts.currency', 'accounts.holderAccount' need(s) to be provided as well."
      )
    }
    keys.push({
      pubkey: accounts.tokenAccount,
      isWritable: true,
      isSigner: false,
    })
  }
  keys.push({
    pubkey: accounts.wallet,
    isWritable: true,
    isSigner: true,
  })
  keys.push({
    pubkey: accounts.vault,
    isWritable: true,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.merkleTree,
    isWritable: true,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.systemProgram ?? web3.SystemProgram.programId,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.hiveControl,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.characterManager,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.currencyManagerProgram,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.hplEvents,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.compressionProgram,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.tokenProgram ?? splToken.TOKEN_PROGRAM_ID,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.rentSysvar,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.instructionsSysvar,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.clock,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.logWrapper,
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
