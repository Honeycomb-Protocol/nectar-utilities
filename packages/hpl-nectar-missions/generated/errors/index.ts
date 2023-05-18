/**
 * This code was GENERATED using the solita package.
 * Please DO NOT EDIT THIS FILE, instead rerun solita to update it or write a wrapper to add functionality.
 *
 * See: https://github.com/metaplex-foundation/solita
 */

type ErrorWithCode = Error & { code: number }
type MaybeErrorWithCode = ErrorWithCode | null | undefined

const createErrorFromCodeLookup: Map<number, () => ErrorWithCode> = new Map()
const createErrorFromNameLookup: Map<string, () => ErrorWithCode> = new Map()

/**
 * Overflow: 'Opertaion overflowed'
 *
 * @category Errors
 * @category generated
 */
export class OverflowError extends Error {
  readonly code: number = 0x1770
  readonly name: string = 'Overflow'
  constructor() {
    super('Opertaion overflowed')
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, OverflowError)
    }
  }
}

createErrorFromCodeLookup.set(0x1770, () => new OverflowError())
createErrorFromNameLookup.set('Overflow', () => new OverflowError())

/**
 * NftNotRecognized: 'The NFT provided is not recognized by the mission pool'
 *
 * @category Errors
 * @category generated
 */
export class NftNotRecognizedError extends Error {
  readonly code: number = 0x1771
  readonly name: string = 'NftNotRecognized'
  constructor() {
    super('The NFT provided is not recognized by the mission pool')
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, NftNotRecognizedError)
    }
  }
}

createErrorFromCodeLookup.set(0x1771, () => new NftNotRecognizedError())
createErrorFromNameLookup.set(
  'NftNotRecognized',
  () => new NftNotRecognizedError()
)

/**
 * NotImplemented: 'Not implemented yet'
 *
 * @category Errors
 * @category generated
 */
export class NotImplementedError extends Error {
  readonly code: number = 0x1772
  readonly name: string = 'NotImplemented'
  constructor() {
    super('Not implemented yet')
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, NotImplementedError)
    }
  }
}

createErrorFromCodeLookup.set(0x1772, () => new NotImplementedError())
createErrorFromNameLookup.set('NotImplemented', () => new NotImplementedError())

/**
 * NotStaked: 'NFT is not staked'
 *
 * @category Errors
 * @category generated
 */
export class NotStakedError extends Error {
  readonly code: number = 0x1773
  readonly name: string = 'NotStaked'
  constructor() {
    super('NFT is not staked')
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, NotStakedError)
    }
  }
}

createErrorFromCodeLookup.set(0x1773, () => new NotStakedError())
createErrorFromNameLookup.set('NotStaked', () => new NotStakedError())

/**
 * NotEnded: 'Participation is not ended yet'
 *
 * @category Errors
 * @category generated
 */
export class NotEndedError extends Error {
  readonly code: number = 0x1774
  readonly name: string = 'NotEnded'
  constructor() {
    super('Participation is not ended yet')
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, NotEndedError)
    }
  }
}

createErrorFromCodeLookup.set(0x1774, () => new NotEndedError())
createErrorFromNameLookup.set('NotEnded', () => new NotEndedError())

/**
 * RewardNotAvailable: 'Reward is either collected or not available'
 *
 * @category Errors
 * @category generated
 */
export class RewardNotAvailableError extends Error {
  readonly code: number = 0x1775
  readonly name: string = 'RewardNotAvailable'
  constructor() {
    super('Reward is either collected or not available')
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, RewardNotAvailableError)
    }
  }
}

createErrorFromCodeLookup.set(0x1775, () => new RewardNotAvailableError())
createErrorFromNameLookup.set(
  'RewardNotAvailable',
  () => new RewardNotAvailableError()
)

/**
 * HolderAccountsNotProvided: 'Mint, Holder account or token account not provided'
 *
 * @category Errors
 * @category generated
 */
export class HolderAccountsNotProvidedError extends Error {
  readonly code: number = 0x1776
  readonly name: string = 'HolderAccountsNotProvided'
  constructor() {
    super('Mint, Holder account or token account not provided')
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, HolderAccountsNotProvidedError)
    }
  }
}

createErrorFromCodeLookup.set(
  0x1776,
  () => new HolderAccountsNotProvidedError()
)
createErrorFromNameLookup.set(
  'HolderAccountsNotProvided',
  () => new HolderAccountsNotProvidedError()
)

/**
 * RewardsNotCollected: 'All rewards are not yet collected for this participaton'
 *
 * @category Errors
 * @category generated
 */
export class RewardsNotCollectedError extends Error {
  readonly code: number = 0x1777
  readonly name: string = 'RewardsNotCollected'
  constructor() {
    super('All rewards are not yet collected for this participaton')
    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, RewardsNotCollectedError)
    }
  }
}

createErrorFromCodeLookup.set(0x1777, () => new RewardsNotCollectedError())
createErrorFromNameLookup.set(
  'RewardsNotCollected',
  () => new RewardsNotCollectedError()
)

/**
 * Attempts to resolve a custom program error from the provided error code.
 * @category Errors
 * @category generated
 */
export function errorFromCode(code: number): MaybeErrorWithCode {
  const createError = createErrorFromCodeLookup.get(code)
  return createError != null ? createError() : null
}

/**
 * Attempts to resolve a custom program error from the provided error name, i.e. 'Unauthorized'.
 * @category Errors
 * @category generated
 */
export function errorFromName(name: string): MaybeErrorWithCode {
  const createError = createErrorFromNameLookup.get(name)
  return createError != null ? createError() : null
}
