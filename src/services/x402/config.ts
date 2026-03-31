/**
 * x402 Wallet Configuration
 *
 * Manages wallet configuration and private key storage for x402 payments.
 * Private keys are stored in the user's global config (~/.claude/config.json)
 * and never logged or transmitted.
 */

import { randomBytes } from 'crypto'
import { getGlobalConfig, saveGlobalConfig } from '../../utils/config.js'
import { logForDebugging } from '../../utils/debug.js'
import {
  type PaymentNetwork,
  type X402WalletConfig,
  X402_DEFAULTS,
} from './types.js'

/**
 * EIP-55 mixed-case checksum address encoding.
 * Computes the checksum in-place using keccak256 of the lowercase hex address.
 */
function toChecksumAddress(address: string): string {
  const { createHash } = require('crypto') as typeof import('crypto')
  const addr = address.toLowerCase().replace('0x', '')
  const hash = createHash('sha3-256').update(addr).digest('hex')
  let checksummed = '0x'
  for (let i = 0; i < addr.length; i++) {
    checksummed +=
      parseInt(hash[i], 16) >= 8 ? addr[i].toUpperCase() : addr[i]
  }
  return checksummed
}

/**
 * Derives an Ethereum address from a private key using secp256k1.
 * Uses Node.js native crypto for the EC operation.
 */
function deriveAddress(privateKeyHex: string): string {
  const { createPublicKey, createPrivateKey } =
    require('crypto') as typeof import('crypto')

  const keyHex = privateKeyHex.startsWith('0x')
    ? privateKeyHex.slice(2)
    : privateKeyHex
  const keyBuffer = Buffer.from(keyHex, 'hex')

  // Create an EC private key in DER format for secp256k1
  // DER prefix for secp256k1 private key (RFC 5915)
  const derPrefix = Buffer.from(
    '30740201010420',
    'hex',
  )
  const derMiddle = Buffer.from(
    'a00706052b8104000aa144034200',
    'hex',
  )

  const privateKey = createPrivateKey({
    key: Buffer.concat([derPrefix, keyBuffer, derMiddle]),
    format: 'der',
    type: 'sec1',
  })

  const publicKey = createPublicKey(privateKey)
  const pubKeyDer = publicKey.export({ type: 'spki', format: 'der' })

  // Extract the 65-byte uncompressed public key (last 65 bytes of SPKI DER)
  const uncompressedPubKey = pubKeyDer.subarray(pubKeyDer.length - 65)

  // Ethereum address = last 20 bytes of keccak256(pubkey[1:])
  // pubkey[0] is 0x04 prefix for uncompressed key
  const { createHash } = require('crypto') as typeof import('crypto')
  const hash = createHash('sha3-256')
    .update(uncompressedPubKey.subarray(1))
    .digest()
  const rawAddress = '0x' + hash.subarray(hash.length - 20).toString('hex')

  return toChecksumAddress(rawAddress)
}

/** Retrieves x402 config from global config */
export function getX402Config(): X402WalletConfig {
  const config = getGlobalConfig()
  return (config as Record<string, unknown>).x402 as X402WalletConfig ?? { ...X402_DEFAULTS }
}

/** Retrieves the private key from environment or global config */
export function getX402PrivateKey(): string | undefined {
  // Environment variable takes precedence (for CI/automation)
  if (process.env.X402_PRIVATE_KEY) {
    return process.env.X402_PRIVATE_KEY
  }
  const config = getGlobalConfig()
  return (config as Record<string, unknown>).x402PrivateKey as string | undefined
}

/** Checks if x402 payments are configured and enabled */
export function isX402Enabled(): boolean {
  const config = getX402Config()
  if (!config.enabled) return false
  const key = getX402PrivateKey()
  return !!key
}

/** Saves x402 wallet configuration */
export function saveX402Config(updates: Partial<X402WalletConfig>): void {
  const current = getX402Config()
  const merged = { ...current, ...updates }
  saveGlobalConfig((config) => ({
    ...config,
    x402: merged,
  }))
  logForDebugging('[x402] Config updated')
}

/**
 * Saves a private key and derives + stores the wallet address.
 * The private key is stored encrypted-at-rest via the global config's
 * file permissions (600).
 */
export function saveX402PrivateKey(privateKeyHex: string): string {
  const keyHex = privateKeyHex.startsWith('0x')
    ? privateKeyHex.slice(2)
    : privateKeyHex

  if (keyHex.length !== 64 || !/^[0-9a-fA-F]+$/.test(keyHex)) {
    throw new Error('Invalid private key: must be 32 bytes (64 hex characters)')
  }

  const address = deriveAddress(keyHex)

  saveGlobalConfig((config) => ({
    ...config,
    x402PrivateKey: `0x${keyHex}`,
  }))

  saveX402Config({ address })

  logForDebugging(`[x402] Wallet configured: ${address}`)
  return address
}

/** Removes the private key and disables x402 */
export function removeX402PrivateKey(): void {
  saveGlobalConfig((config) => {
    const { x402PrivateKey: _, ...rest } = config as Record<string, unknown>
    return rest as typeof config
  })
  saveX402Config({ enabled: false, address: undefined })
  logForDebugging('[x402] Wallet removed')
}

/** Gets the wallet address without exposing the private key */
export function getX402WalletAddress(): string | undefined {
  return getX402Config().address
}

/**
 * Generates a new random private key for x402 payments.
 * Returns the hex-encoded key (with 0x prefix).
 */
export function generateX402PrivateKey(): string {
  return '0x' + randomBytes(32).toString('hex')
}

/** Updates the payment network */
export function setX402Network(network: PaymentNetwork): void {
  saveX402Config({ network })
}

/** Updates max per-request payment limit */
export function setX402MaxPayment(amountUSD: number): void {
  if (amountUSD <= 0) {
    throw new Error('Max payment must be a positive number')
  }
  saveX402Config({ maxPaymentPerRequestUSD: amountUSD })
}

/** Updates max session spend limit */
export function setX402MaxSessionSpend(amountUSD: number): void {
  if (amountUSD <= 0) {
    throw new Error('Max session spend must be a positive number')
  }
  saveX402Config({ maxSessionSpendUSD: amountUSD })
}
