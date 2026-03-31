/**
 * x402 Payment Tracker
 *
 * Tracks x402 payments within a session for cost display and safety limits.
 * Integrates with the main cost tracking system.
 */

import chalk from 'chalk'
import { logForDebugging } from '../../utils/debug.js'
import { formatNumber } from '../../utils/format.js'
import type { X402PaymentRecord } from './types.js'

/** In-memory payment records for the current session */
let sessionPayments: X402PaymentRecord[] = []
let sessionTotalUSD = 0

/** Add a payment record to the session tracker */
export function addX402Payment(record: X402PaymentRecord): void {
  sessionPayments.push(record)
  sessionTotalUSD += record.amountUSD
  logForDebugging(
    `[x402] Session total: $${sessionTotalUSD.toFixed(4)} (${sessionPayments.length} payments)`,
  )
}

/** Get total USD spent via x402 in the current session */
export function getX402SessionSpentUSD(): number {
  return sessionTotalUSD
}

/** Get all payment records for the current session */
export function getX402SessionPayments(): readonly X402PaymentRecord[] {
  return sessionPayments
}

/** Get the count of payments in this session */
export function getX402PaymentCount(): number {
  return sessionPayments.length
}

/** Reset session payment tracking (used on session switch) */
export function resetX402SessionPayments(): void {
  sessionPayments = []
  sessionTotalUSD = 0
}

/** Format x402 payment summary for display */
export function formatX402Cost(): string {
  if (sessionPayments.length === 0) {
    return ''
  }

  const lines: string[] = []
  lines.push(
    `x402 payments:         $${sessionTotalUSD.toFixed(4)} (${sessionPayments.length} ${sessionPayments.length === 1 ? 'payment' : 'payments'})`,
  )

  // Group by resource domain
  const byDomain: Record<string, { count: number; totalUSD: number }> = {}
  for (const payment of sessionPayments) {
    try {
      const domain = new URL(payment.resource).hostname
      if (!byDomain[domain]) {
        byDomain[domain] = { count: 0, totalUSD: 0 }
      }
      byDomain[domain].count += 1
      byDomain[domain].totalUSD += payment.amountUSD
    } catch {
      // Skip malformed URLs
    }
  }

  for (const [domain, stats] of Object.entries(byDomain)) {
    lines.push(
      `${domain}:`.padStart(21) +
        `  ${formatNumber(stats.count)} ${stats.count === 1 ? 'request' : 'requests'} ($${stats.totalUSD.toFixed(4)})`,
    )
  }

  return chalk.dim(lines.join('\n'))
}
