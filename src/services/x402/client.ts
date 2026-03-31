/**
 * x402 Payment Client
 *
 * Handles the x402 payment protocol flow:
 * 1. Parse 402 response headers for payment requirements
 * 2. Validate payment amounts against configured limits
 * 3. Sign EIP-3009 transferWithAuthorization via EIP-712
 * 4. Construct payment header for retry
 */

import { createHash, randomBytes } from 'crypto'
import { logForDebugging } from '../../utils/debug.js'
import { getX402Config, getX402PrivateKey } from './config.js'
import { addX402Payment } from './tracker.js'
import {
  DEFAULT_FACILITATOR_URLS,
  type PaymentNetwork,
  type PaymentPayload,
  type PaymentRequirement,
  USDC_ADDRESSES,
  X402_HEADERS,
  type X402PaymentRecord,
} from './types.js'

/** USDC has 6 decimal places */
const USDC_DECIMALS = 6

/** Convert token amount (smallest unit) to USD, assuming 1 USDC = 1 USD */
function tokenAmountToUSD(amount: string): number {
  return parseInt(amount, 10) / 10 ** USDC_DECIMALS
}

/**
 * Parse the X-Payment-Required header from a 402 response.
 */
export function parsePaymentRequirement(
  headerValue: string,
): PaymentRequirement {
  try {
    const parsed = JSON.parse(headerValue) as PaymentRequirement
    if (!parsed.scheme || !parsed.network || !parsed.maxAmountRequired || !parsed.payTo) {
      throw new Error('Missing required fields in payment requirement')
    }
    return parsed
  } catch (error) {
    throw new Error(
      `Invalid x402 payment requirement header: ${error instanceof Error ? error.message : String(error)}`,
    )
  }
}

/**
 * Validate that a payment requirement is within configured limits.
 */
export function validatePaymentRequirement(
  requirement: PaymentRequirement,
  sessionSpentUSD: number,
): { valid: boolean; reason?: string } {
  const config = getX402Config()

  if (!config.enabled) {
    return { valid: false, reason: 'x402 payments are not enabled' }
  }

  const amountUSD = tokenAmountToUSD(requirement.maxAmountRequired)

  if (amountUSD > config.maxPaymentPerRequestUSD) {
    return {
      valid: false,
      reason: `Payment of $${amountUSD.toFixed(4)} exceeds per-request limit of $${config.maxPaymentPerRequestUSD.toFixed(2)}`,
    }
  }

  if (sessionSpentUSD + amountUSD > config.maxSessionSpendUSD) {
    return {
      valid: false,
      reason: `Payment would exceed session limit of $${config.maxSessionSpendUSD.toFixed(2)} (already spent $${sessionSpentUSD.toFixed(4)})`,
    }
  }

  // Validate network matches config
  if (requirement.network !== config.network) {
    return {
      valid: false,
      reason: `Payment requires network ${requirement.network} but wallet is configured for ${config.network}`,
    }
  }

  // Validate asset is USDC on the configured network
  const expectedAsset = USDC_ADDRESSES[requirement.network]
  if (
    expectedAsset &&
    requirement.asset.toLowerCase() !== expectedAsset.toLowerCase()
  ) {
    return {
      valid: false,
      reason: `Unknown payment token ${requirement.asset} (expected USDC: ${expectedAsset})`,
    }
  }

  return { valid: true }
}

/**
 * EIP-712 domain separator for EIP-3009 transferWithAuthorization.
 *
 * This follows the USDC contract's EIP-712 domain:
 *   name: token name (e.g. "USD Coin")
 *   version: token version (e.g. "2")
 *   chainId: network chain ID
 *   verifyingContract: USDC contract address
 */
function getEIP712Domain(requirement: PaymentRequirement): {
  name: string
  version: string
  chainId: number
  verifyingContract: string
} {
  const chainIds: Record<PaymentNetwork, number> = {
    'base': 8453,
    'base-sepolia': 84532,
    'ethereum': 1,
    'ethereum-sepolia': 11155111,
  }

  return {
    name: requirement.extra?.name ?? 'USD Coin',
    version: requirement.extra?.version ?? '2',
    chainId: chainIds[requirement.network],
    verifyingContract: requirement.asset,
  }
}

/**
 * EIP-712 type hash for TransferWithAuthorization.
 *
 * TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)
 */
const TRANSFER_WITH_AUTHORIZATION_TYPEHASH = createHash('sha3-256')
  .update(
    'TransferWithAuthorization(address from,address to,uint256 value,uint256 validAfter,uint256 validBefore,bytes32 nonce)',
  )
  .digest()

/**
 * Compute EIP-712 domain separator hash.
 */
function computeDomainSeparator(domain: {
  name: string
  version: string
  chainId: number
  verifyingContract: string
}): Buffer {
  const EIP712_DOMAIN_TYPEHASH = createHash('sha3-256')
    .update(
      'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)',
    )
    .digest()

  const nameHash = createHash('sha3-256').update(domain.name).digest()
  const versionHash = createHash('sha3-256').update(domain.version).digest()

  // ABI encode: typeHash + nameHash + versionHash + chainId + verifyingContract
  const encoded = Buffer.alloc(5 * 32)
  EIP712_DOMAIN_TYPEHASH.copy(encoded, 0)
  nameHash.copy(encoded, 32)
  versionHash.copy(encoded, 64)
  // chainId as uint256
  const chainIdBuf = Buffer.alloc(32)
  chainIdBuf.writeBigUInt64BE(BigInt(domain.chainId), 24)
  chainIdBuf.copy(encoded, 96)
  // verifyingContract as address (left-padded to 32 bytes)
  const addrBuf = Buffer.alloc(32)
  Buffer.from(domain.verifyingContract.replace('0x', ''), 'hex').copy(
    addrBuf,
    12,
  )
  addrBuf.copy(encoded, 128)

  return createHash('sha3-256').update(encoded).digest()
}

/**
 * Compute the EIP-712 struct hash for TransferWithAuthorization.
 */
function computeStructHash(authorization: {
  from: string
  to: string
  value: string
  validAfter: string
  validBefore: string
  nonce: string
}): Buffer {
  // ABI encode all fields as 32-byte words
  const encoded = Buffer.alloc(7 * 32)

  TRANSFER_WITH_AUTHORIZATION_TYPEHASH.copy(encoded, 0)

  // from address
  const fromBuf = Buffer.alloc(32)
  Buffer.from(authorization.from.replace('0x', ''), 'hex').copy(fromBuf, 12)
  fromBuf.copy(encoded, 32)

  // to address
  const toBuf = Buffer.alloc(32)
  Buffer.from(authorization.to.replace('0x', ''), 'hex').copy(toBuf, 12)
  toBuf.copy(encoded, 64)

  // value as uint256
  const valueBuf = Buffer.alloc(32)
  const value = BigInt(authorization.value)
  valueBuf.writeBigUInt64BE(value >> 192n, 0)
  valueBuf.writeBigUInt64BE((value >> 128n) & 0xffffffffffffffffn, 8)
  valueBuf.writeBigUInt64BE((value >> 64n) & 0xffffffffffffffffn, 16)
  valueBuf.writeBigUInt64BE(value & 0xffffffffffffffffn, 24)
  valueBuf.copy(encoded, 96)

  // validAfter as uint256
  const validAfterBuf = Buffer.alloc(32)
  validAfterBuf.writeBigUInt64BE(BigInt(authorization.validAfter), 24)
  validAfterBuf.copy(encoded, 128)

  // validBefore as uint256
  const validBeforeBuf = Buffer.alloc(32)
  validBeforeBuf.writeBigUInt64BE(BigInt(authorization.validBefore), 24)
  validBeforeBuf.copy(encoded, 160)

  // nonce as bytes32
  const nonceBuf = Buffer.from(authorization.nonce.replace('0x', ''), 'hex')
  const noncePadded = Buffer.alloc(32)
  nonceBuf.copy(noncePadded, 32 - nonceBuf.length)
  noncePadded.copy(encoded, 192)

  return createHash('sha3-256').update(encoded).digest()
}

/**
 * Sign an EIP-712 typed data hash with a secp256k1 private key.
 * Returns the signature in compact format (r + s + v).
 */
function signEIP712(
  domainSeparator: Buffer,
  structHash: Buffer,
  privateKeyHex: string,
): string {
  const { sign } = require('crypto') as typeof import('crypto')

  // EIP-712 signing hash: keccak256("\x19\x01" + domainSeparator + structHash)
  const prefix = Buffer.from('1901', 'hex')
  const message = createHash('sha3-256')
    .update(Buffer.concat([prefix, domainSeparator, structHash]))
    .digest()

  const keyHex = privateKeyHex.startsWith('0x')
    ? privateKeyHex.slice(2)
    : privateKeyHex
  const keyBuf = Buffer.from(keyHex, 'hex')

  // Use secp256k1 ECDSA signing
  // Node.js crypto sign with EC key
  const { createPrivateKey } = require('crypto') as typeof import('crypto')

  // DER prefix for secp256k1 private key
  const derPrefix = Buffer.from('30740201010420', 'hex')
  const derMiddle = Buffer.from('a00706052b8104000aa144034200', 'hex')

  const ecPrivateKey = createPrivateKey({
    key: Buffer.concat([derPrefix, keyBuf, derMiddle]),
    format: 'der',
    type: 'sec1',
  })

  const signature = sign(null, message, {
    key: ecPrivateKey,
    dsaEncoding: 'ieee-p1363',
  })

  // Extract r and s (each 32 bytes for secp256k1)
  const r = signature.subarray(0, 32)
  const s = signature.subarray(32, 64)

  // Recovery ID (v) — for Ethereum it's 27 or 28
  // We try v=27 first; the facilitator will handle recovery
  const v = 27

  return (
    '0x' + r.toString('hex') + s.toString('hex') + v.toString(16)
  )
}

/**
 * Create a signed x402 payment payload for a given requirement.
 */
export function createPayment(
  requirement: PaymentRequirement,
  fromAddress: string,
  privateKeyHex: string,
): PaymentPayload {
  const nonce = '0x' + randomBytes(32).toString('hex')
  const validAfter = '0'
  const validBefore = String(
    Math.floor(Date.now() / 1000) + requirement.maxTimeoutSeconds,
  )

  const authorization = {
    from: fromAddress,
    to: requirement.payTo,
    value: requirement.maxAmountRequired,
    validAfter,
    validBefore,
    nonce,
  }

  const domain = getEIP712Domain(requirement)
  const domainSeparator = computeDomainSeparator(domain)
  const structHash = computeStructHash(authorization)
  const signature = signEIP712(domainSeparator, structHash, privateKeyHex)

  return {
    x402Version: 1,
    scheme: requirement.scheme,
    network: requirement.network,
    payload: {
      signature,
      authorization,
    },
  }
}

/**
 * Encode a payment payload as a base64 string for the X-Payment header.
 */
export function encodePaymentHeader(payload: PaymentPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64')
}

/**
 * Handle a 402 response by creating and encoding a payment.
 * Returns the payment header value, or null if payment is not possible.
 */
export function handlePaymentRequired(
  headerValue: string,
  sessionSpentUSD: number,
): {
  paymentHeader: string
  record: X402PaymentRecord
} | null {
  const requirement = parsePaymentRequirement(headerValue)
  const validation = validatePaymentRequirement(requirement, sessionSpentUSD)

  if (!validation.valid) {
    logForDebugging(`[x402] Payment rejected: ${validation.reason}`)
    return null
  }

  const privateKey = getX402PrivateKey()
  if (!privateKey) {
    logForDebugging('[x402] No private key configured')
    return null
  }

  const config = getX402Config()
  const fromAddress = config.address
  if (!fromAddress) {
    logForDebugging('[x402] No wallet address configured')
    return null
  }

  const payment = createPayment(requirement, fromAddress, privateKey)
  const paymentHeader = encodePaymentHeader(payment)

  const record: X402PaymentRecord = {
    timestamp: Date.now(),
    resource: requirement.resource,
    amount: requirement.maxAmountRequired,
    amountUSD: tokenAmountToUSD(requirement.maxAmountRequired),
    token: requirement.extra?.name ?? 'USDC',
    network: requirement.network,
    payTo: requirement.payTo,
    signature: payment.payload.signature,
  }

  // Track the payment
  addX402Payment(record)

  logForDebugging(
    `[x402] Payment signed: $${record.amountUSD.toFixed(4)} to ${requirement.payTo} for ${requirement.resource}`,
  )

  return { paymentHeader, record }
}

/**
 * Get the facilitator URL for a given network.
 */
export function getFacilitatorUrl(network: PaymentNetwork): string {
  const config = getX402Config()
  return config.facilitatorUrl ?? DEFAULT_FACILITATOR_URLS[network]
}
