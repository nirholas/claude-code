/**
 * /x402 command implementation
 *
 * Manages x402 wallet configuration for HTTP 402 crypto payments.
 *
 * Subcommands:
 *   /x402 setup     - Generate a new wallet or import an existing private key
 *   /x402 status    - Show wallet address, balance, and payment history
 *   /x402 enable    - Enable x402 payments
 *   /x402 disable   - Disable x402 payments
 *   /x402 set-limit - Set per-request or session spend limits
 *   /x402 network   - Switch blockchain network
 *   /x402 remove    - Remove wallet and disable payments
 *   /x402           - Show help
 */

import type { LocalCommandCall } from '../../types/command.js'
import {
  generateX402PrivateKey,
  getX402Config,
  getX402WalletAddress,
  isX402Enabled,
  removeX402PrivateKey,
  saveX402Config,
  saveX402PrivateKey,
  setX402MaxPayment,
  setX402MaxSessionSpend,
  setX402Network,
  type PaymentNetwork,
} from '../../services/x402/index.js'
import {
  formatX402Cost,
  getX402PaymentCount,
  getX402SessionSpentUSD,
} from '../../services/x402/tracker.js'

const VALID_NETWORKS: PaymentNetwork[] = [
  'base',
  'base-sepolia',
  'ethereum',
  'ethereum-sepolia',
]

function showHelp(): string {
  return `x402 — HTTP 402 Crypto Payment Protocol (USDC on Base)

Usage:
  /x402 setup              Generate a new wallet for x402 payments
  /x402 setup <key>        Import an existing private key (hex)
  /x402 status             Show wallet info and session payment history
  /x402 enable             Enable automatic x402 payments
  /x402 disable            Disable x402 payments
  /x402 set-limit <amt>    Set max payment per request (USD)
  /x402 set-session <amt>  Set max session spend (USD)
  /x402 network <name>     Switch network (base, base-sepolia, ethereum, ethereum-sepolia)
  /x402 remove             Remove wallet and disable payments
  /x402                    Show this help

When enabled, x402 automatically handles HTTP 402 Payment Required responses
by signing USDC payment authorizations within your configured limits.

Environment:
  X402_PRIVATE_KEY         Override wallet private key (for CI/automation)

Learn more: https://github.com/coinbase/x402`
}

function handleSetup(args: string): string {
  const parts = args.trim().split(/\s+/)
  const keyArg = parts[1]

  if (keyArg) {
    // Import existing key
    try {
      const address = saveX402PrivateKey(keyArg)
      saveX402Config({ enabled: true })
      return `Wallet imported and enabled.\nAddress: ${address}\n\nFund this address with USDC on ${getX402Config().network} to enable payments.`
    } catch (err) {
      return `Error importing key: ${err instanceof Error ? err.message : String(err)}`
    }
  }

  // Generate new key
  const privateKey = generateX402PrivateKey()
  const address = saveX402PrivateKey(privateKey)
  saveX402Config({ enabled: true })

  return `New wallet generated and enabled.
Address: ${address}
Network: ${getX402Config().network}

IMPORTANT: Fund this address with USDC to enable payments.
Your private key is stored in ~/.claude/config.json

To use on testnet first: /x402 network base-sepolia`
}

function handleStatus(): string {
  const config = getX402Config()
  const address = getX402WalletAddress()
  const enabled = isX402Enabled()
  const sessionSpent = getX402SessionSpentUSD()
  const paymentCount = getX402PaymentCount()

  const lines: string[] = []
  lines.push('x402 Payment Status')
  lines.push('─'.repeat(40))
  lines.push(`Enabled:          ${config.enabled ? 'Yes' : 'No'}`)
  lines.push(`Wallet:           ${address ?? 'Not configured'}`)
  lines.push(`Network:          ${config.network}`)
  lines.push(`Max per request:  $${config.maxPaymentPerRequestUSD.toFixed(2)}`)
  lines.push(`Max per session:  $${config.maxSessionSpendUSD.toFixed(2)}`)
  lines.push(`Ready:            ${enabled ? 'Yes' : 'No (need wallet + enabled)'}`)
  lines.push('')
  lines.push('Session:')
  lines.push(`  Payments:       ${paymentCount}`)
  lines.push(`  Total spent:    $${sessionSpent.toFixed(4)}`)

  const x402Summary = formatX402Cost()
  if (x402Summary) {
    lines.push('')
    lines.push(x402Summary)
  }

  return lines.join('\n')
}

function handleSetLimit(args: string): string {
  const parts = args.trim().split(/\s+/)
  const amount = parseFloat(parts[1] ?? '')

  if (isNaN(amount) || amount <= 0) {
    return 'Usage: /x402 set-limit <amount>\nAmount must be a positive number (USD).\nExample: /x402 set-limit 0.25'
  }

  try {
    setX402MaxPayment(amount)
    return `Max payment per request set to $${amount.toFixed(2)}`
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : String(err)}`
  }
}

function handleSetSession(args: string): string {
  const parts = args.trim().split(/\s+/)
  const amount = parseFloat(parts[1] ?? '')

  if (isNaN(amount) || amount <= 0) {
    return 'Usage: /x402 set-session <amount>\nAmount must be a positive number (USD).\nExample: /x402 set-session 10.00'
  }

  try {
    setX402MaxSessionSpend(amount)
    return `Max session spend set to $${amount.toFixed(2)}`
  } catch (err) {
    return `Error: ${err instanceof Error ? err.message : String(err)}`
  }
}

function handleNetwork(args: string): string {
  const parts = args.trim().split(/\s+/)
  const network = parts[1] as PaymentNetwork | undefined

  if (!network || !VALID_NETWORKS.includes(network)) {
    return `Usage: /x402 network <name>\nValid networks: ${VALID_NETWORKS.join(', ')}`
  }

  setX402Network(network)
  return `Network switched to ${network}`
}

function handleRemove(): string {
  removeX402PrivateKey()
  return 'Wallet removed and x402 payments disabled.\nPrivate key has been deleted from config.'
}

export const call: LocalCommandCall = async (args) => {
  const subcommand = (args ?? '').trim().split(/\s+/)[0]?.toLowerCase()

  let value: string

  switch (subcommand) {
    case 'setup':
      value = handleSetup(args ?? '')
      break
    case 'status':
      value = handleStatus()
      break
    case 'enable':
      saveX402Config({ enabled: true })
      value = isX402Enabled()
        ? 'x402 payments enabled.'
        : 'x402 enabled but no wallet configured. Run /x402 setup first.'
      break
    case 'disable':
      saveX402Config({ enabled: false })
      value = 'x402 payments disabled.'
      break
    case 'set-limit':
      value = handleSetLimit(args ?? '')
      break
    case 'set-session':
      value = handleSetSession(args ?? '')
      break
    case 'network':
      value = handleNetwork(args ?? '')
      break
    case 'remove':
      value = handleRemove()
      break
    default:
      value = showHelp()
  }

  return { type: 'text', value }
}
