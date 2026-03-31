/**
 * x402 Protocol Types
 *
 * Implements the x402 HTTP 402 Payment Required protocol for machine-to-machine
 * crypto payments (USDC on Base). See: https://github.com/coinbase/x402
 */

/** Supported payment schemes */
export type PaymentScheme = 'exact'

/** Supported blockchain networks */
export type PaymentNetwork =
  | 'base'
  | 'base-sepolia'
  | 'ethereum'
  | 'ethereum-sepolia'

/** Payment requirement returned in 402 response headers */
export interface PaymentRequirement {
  /** Payment scheme (currently only 'exact') */
  scheme: PaymentScheme
  /** Target blockchain network */
  network: PaymentNetwork
  /** Maximum amount required in smallest unit (e.g. USDC has 6 decimals) */
  maxAmountRequired: string
  /** The resource URL being paid for */
  resource: string
  /** Human-readable description of what's being purchased */
  description: string
  /** MIME type of the resource */
  mimeType?: string
  /** Recipient wallet address (EIP-55 checksummed) */
  payTo: string
  /** Max seconds the server will wait for payment settlement */
  maxTimeoutSeconds: number
  /** Token contract address */
  asset: string
  /** Additional token metadata */
  extra?: {
    name?: string
    version?: string
  }
}

/** Signed payment payload sent in request header */
export interface PaymentPayload {
  /** x402 protocol version */
  x402Version: 1
  /** Payment scheme */
  scheme: PaymentScheme
  /** Target blockchain network */
  network: PaymentNetwork
  /** Payment authorization details */
  payload: {
    /** Signature of the EIP-712 typed data */
    signature: string
    /** Authorization details for EIP-3009 transferWithAuthorization */
    authorization: {
      /** Payer wallet address */
      from: string
      /** Recipient wallet address */
      to: string
      /** Payment amount in smallest unit */
      value: string
      /** Validity start timestamp (usually 0) */
      validAfter: string
      /** Validity end timestamp */
      validBefore: string
      /** Unique nonce to prevent replay */
      nonce: string
    }
  }
}

/** x402 wallet configuration stored in global config */
export interface X402WalletConfig {
  /** Whether x402 payments are enabled */
  enabled: boolean
  /** Blockchain network to use */
  network: PaymentNetwork
  /** Wallet address (derived from private key, stored for display) */
  address?: string
  /** Maximum payment per request in USD (safety limit) */
  maxPaymentPerRequestUSD: number
  /** Maximum total spend per session in USD */
  maxSessionSpendUSD: number
  /** Facilitator URL for payment verification */
  facilitatorUrl?: string
}

/** x402 payment record for cost tracking */
export interface X402PaymentRecord {
  /** Timestamp of payment */
  timestamp: number
  /** URL that required payment */
  resource: string
  /** Amount paid in token smallest unit */
  amount: string
  /** USD equivalent at time of payment */
  amountUSD: number
  /** Token used (e.g. 'USDC') */
  token: string
  /** Network used */
  network: PaymentNetwork
  /** Recipient address */
  payTo: string
  /** Transaction signature/hash */
  signature: string
}

/** Header names used in the x402 protocol */
export const X402_HEADERS = {
  /** Server → Client: Payment requirement details (JSON) */
  PAYMENT_REQUIRED: 'x-payment-required',
  /** Client → Server: Signed payment payload (base64 JSON) */
  PAYMENT: 'x-payment',
} as const

/** Default facilitator URLs by network */
export const DEFAULT_FACILITATOR_URLS: Record<PaymentNetwork, string> = {
  'base': 'https://x402.org/facilitator',
  'base-sepolia': 'https://x402.org/facilitator',
  'ethereum': 'https://x402.org/facilitator',
  'ethereum-sepolia': 'https://x402.org/facilitator',
} as const

/** USDC contract addresses by network */
export const USDC_ADDRESSES: Record<PaymentNetwork, string> = {
  'base': '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  'base-sepolia': '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  'ethereum': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
  'ethereum-sepolia': '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
} as const

/** Default configuration values */
export const X402_DEFAULTS: X402WalletConfig = {
  enabled: false,
  network: 'base',
  maxPaymentPerRequestUSD: 0.10,
  maxSessionSpendUSD: 5.00,
} as const
