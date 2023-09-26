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
 * @category ClaimRewards
 * @category generated
 */
export const claimRewardsStruct = new beet.BeetArgsStruct<{
  instructionDiscriminator: number[] /* size: 8 */
}>(
  [['instructionDiscriminator', beet.uniformFixedSizeArray(beet.u8, 8)]],
  'ClaimRewardsInstructionArgs'
)
/**
 * Accounts required by the _claimRewards_ instruction
 *
 * @property [_writable_] stakingPool
 * @property [] multipliers (optional)
 * @property [_writable_] nft
 * @property [] currency
 * @property [_writable_] mint
 * @property [_writable_] vaultHolderAccount
 * @property [_writable_] vaultTokenAccount
 * @property [] holderAccount
 * @property [_writable_] tokenAccount
 * @property [_writable_] staker
 * @property [_writable_, **signer**] wallet
 * @property [] hplEvents
 * @property [] clock
 * @property [] instructionsSysvar
 * @property [_writable_] project
 * @property [_writable_] vault
 * @property [] currencyManagerProgram
 * @category Instructions
 * @category ClaimRewards
 * @category generated
 */
export type ClaimRewardsInstructionAccounts = {
  stakingPool: web3.PublicKey
  multipliers?: web3.PublicKey
  nft: web3.PublicKey
  currency: web3.PublicKey
  mint: web3.PublicKey
  vaultHolderAccount: web3.PublicKey
  vaultTokenAccount: web3.PublicKey
  holderAccount: web3.PublicKey
  tokenAccount: web3.PublicKey
  staker: web3.PublicKey
  wallet: web3.PublicKey
  systemProgram?: web3.PublicKey
  tokenProgram?: web3.PublicKey
  hplEvents: web3.PublicKey
  clock: web3.PublicKey
  instructionsSysvar: web3.PublicKey
  project: web3.PublicKey
  vault: web3.PublicKey
  currencyManagerProgram: web3.PublicKey
  anchorRemainingAccounts?: web3.AccountMeta[]
}

export const claimRewardsInstructionDiscriminator = [
  4, 144, 132, 71, 116, 23, 151, 80,
]

/**
 * Creates a _ClaimRewards_ instruction.
 *
 * Optional accounts that are not provided will be omitted from the accounts
 * array passed with the instruction.
 * An optional account that is set cannot follow an optional account that is unset.
 * Otherwise an Error is raised.
 *
 * @param accounts that will be accessed while the instruction is processed
 * @category Instructions
 * @category ClaimRewards
 * @category generated
 */
export function createClaimRewardsInstruction(
  accounts: ClaimRewardsInstructionAccounts,
  programId = new web3.PublicKey('STAkY8Zx3rfY2MUyTJkdLB5jaM47mnDpKUUWzkj5d3L')
) {
  const [data] = claimRewardsStruct.serialize({
    instructionDiscriminator: claimRewardsInstructionDiscriminator,
  })
  const keys: web3.AccountMeta[] = [
    {
      pubkey: accounts.stakingPool,
      isWritable: true,
      isSigner: false,
    },
  ]

  if (accounts.multipliers != null) {
    keys.push({
      pubkey: accounts.multipliers,
      isWritable: false,
      isSigner: false,
    })
  }
  keys.push({
    pubkey: accounts.nft,
    isWritable: true,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.currency,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.mint,
    isWritable: true,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.vaultHolderAccount,
    isWritable: true,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.vaultTokenAccount,
    isWritable: true,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.holderAccount,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.tokenAccount,
    isWritable: true,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.staker,
    isWritable: true,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.wallet,
    isWritable: true,
    isSigner: true,
  })
  keys.push({
    pubkey: accounts.systemProgram ?? web3.SystemProgram.programId,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.tokenProgram ?? splToken.TOKEN_PROGRAM_ID,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.hplEvents,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.clock,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.instructionsSysvar,
    isWritable: false,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.project,
    isWritable: true,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.vault,
    isWritable: true,
    isSigner: false,
  })
  keys.push({
    pubkey: accounts.currencyManagerProgram,
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
