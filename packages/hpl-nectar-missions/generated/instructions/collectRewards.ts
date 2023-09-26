/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

import * as splToken from '@solana/spl-token'
import * as beet from '@metaplex-foundation/beet'
import * as web3 from '@solana/web3.js'

/**
 * @category Instructions
 * @category CollectRewards
 * @category generated
 */
export const collectRewardsStruct = new beet.BeetArgsStruct<{
  instructionDiscriminator: number[] /* size: 8 */
}>(
  [['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)]],
  'CollectRewardsInstructionArgs'
)
/**
 * Accounts required by the _collectRewards_ instruction
 *
 * @property [_writable_] project
 * @property [_writable_] missionPool
 * @property [] mission
 * @property [_writable_] participation
 * @property [] nft
 * @property [_writable_] profile (optional)
 * @property [] currency (optional)
 * @property [] mint (optional)
 * @property [_writable_] vaultHolderAccount (optional)
 * @property [_writable_] vaultTokenAccount (optional)
 * @property [] holderAccount (optional)
 * @property [_writable_] tokenAccount (optional)
 * @property [_writable_, **signer**] wallet
 * @property [_writable_] vault
 * @property [] hiveControlProgram
 * @property [] currencyManagerProgram
 * @property [] hplEvents
 * @property [] compressionProgram
 * @property [] rentSysvar
 * @property [] instructionsSysvar
 * @property [] clock
 * @category Instructions
 * @category CollectRewards
 * @category generated
 */
export type CollectRewardsInstructionAccounts = {
  project: web3.PublicKey
  missionPool: web3.PublicKey
  mission: web3.PublicKey
  participation: web3.PublicKey
  nft: web3.PublicKey
  profile?: web3.PublicKey
  currency?: web3.PublicKey
  mint?: web3.PublicKey
  vaultHolderAccount?: web3.PublicKey
  vaultTokenAccount?: web3.PublicKey
  holderAccount?: web3.PublicKey
  tokenAccount?: web3.PublicKey
  wallet: web3.PublicKey
  vault: web3.PublicKey
  systemProgram?: web3.PublicKey
  hiveControlProgram: web3.PublicKey
  currencyManagerProgram: web3.PublicKey
  hplEvents: web3.PublicKey
  compressionProgram: web3.PublicKey
  tokenProgram?: web3.PublicKey
  rentSysvar: web3.PublicKey
  instructionsSysvar: web3.PublicKey
  clock: web3.PublicKey
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
 * @category Instructions
 * @category CollectRewards
 * @category generated
 */
export function createCollectRewardsInstruction(
  accounts: CollectRewardsInstructionAccounts,
  programId = new web3.PublicKey('HuntaX1CmUt5EByyFPE8pMf13SpvezybmMTtjmpmGmfj')
) {
  const [data] = collectRewardsStruct.serialize({
    instructionDiscriminator: collectRewardsInstructionDiscriminator,
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
      isWritable: false,
      isSigner: false,
    },
    {
      pubkey: accounts.participation,
      isWritable: true,
      isSigner: false,
    },
    {
      pubkey: accounts.nft,
      isWritable: false,
      isSigner: false,
    },
  ]

  if (accounts.profile != null) {
    keys.push({
      pubkey: accounts.profile,
      isWritable: true,
      isSigner: false,
    })
  }
  if (accounts.currency != null) {
    if (accounts.profile == null) {
      throw new Error(
        "When providing 'currency' then 'accounts.profile' need(s) to be provided as well."
      )
    }
    keys.push({
      pubkey: accounts.currency,
      isWritable: false,
      isSigner: false,
    })
  }
  if (accounts.mint != null) {
    if (accounts.profile == null || accounts.currency == null) {
      throw new Error(
        "When providing 'mint' then 'accounts.profile', 'accounts.currency' need(s) to be provided as well."
      )
    }
    keys.push({
      pubkey: accounts.mint,
      isWritable: false,
      isSigner: false,
    })
  }
  if (accounts.vaultHolderAccount != null) {
    if (
      accounts.profile == null ||
      accounts.currency == null ||
      accounts.mint == null
    ) {
      throw new Error(
        "When providing 'vaultHolderAccount' then 'accounts.profile', 'accounts.currency', 'accounts.mint' need(s) to be provided as well."
      )
    }
    keys.push({
      pubkey: accounts.vaultHolderAccount,
      isWritable: true,
      isSigner: false,
    })
  }
  if (accounts.vaultTokenAccount != null) {
    if (
      accounts.profile == null ||
      accounts.currency == null ||
      accounts.mint == null ||
      accounts.vaultHolderAccount == null
    ) {
      throw new Error(
        "When providing 'vaultTokenAccount' then 'accounts.profile', 'accounts.currency', 'accounts.mint', 'accounts.vaultHolderAccount' need(s) to be provided as well."
      )
    }
    keys.push({
      pubkey: accounts.vaultTokenAccount,
      isWritable: true,
      isSigner: false,
    })
  }
  if (accounts.holderAccount != null) {
    if (
      accounts.profile == null ||
      accounts.currency == null ||
      accounts.mint == null ||
      accounts.vaultHolderAccount == null ||
      accounts.vaultTokenAccount == null
    ) {
      throw new Error(
        "When providing 'holderAccount' then 'accounts.profile', 'accounts.currency', 'accounts.mint', 'accounts.vaultHolderAccount', 'accounts.vaultTokenAccount' need(s) to be provided as well."
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
      accounts.profile == null ||
      accounts.currency == null ||
      accounts.mint == null ||
      accounts.vaultHolderAccount == null ||
      accounts.vaultTokenAccount == null ||
      accounts.holderAccount == null
    ) {
      throw new Error(
        "When providing 'tokenAccount' then 'accounts.profile', 'accounts.currency', 'accounts.mint', 'accounts.vaultHolderAccount', 'accounts.vaultTokenAccount', 'accounts.holderAccount' need(s) to be provided as well."
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
    pubkey: accounts.systemProgram ?? web3.SystemProgram.programId,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.hiveControlProgram,
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
