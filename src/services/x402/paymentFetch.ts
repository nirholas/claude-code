/**
 * x402 Payment Fetch Wrapper
 *
 * Wraps fetch (or axios) to automatically handle HTTP 402 Payment Required
 * responses using the x402 protocol. When a 402 is received:
 *
 * 1. Parse the X-Payment-Required header
 * 2. Validate against spending limits
 * 3. Sign a payment authorization
 * 4. Retry the request with the X-Payment header
 *
 * This integrates at the fetch level so it works transparently with
 * both the Anthropic SDK client and the WebFetchTool.
 */

import type { AxiosInstance, AxiosResponse } from 'axios'
import { logForDebugging } from '../../utils/debug.js'
import { handlePaymentRequired } from './client.js'
import { isX402Enabled } from './config.js'
import { getX402SessionSpentUSD } from './tracker.js'
import { X402_HEADERS } from './types.js'

/**
 * Create a fetch wrapper that intercepts 402 responses and handles x402 payment.
 *
 * Usage with the Anthropic SDK client:
 *   const wrappedFetch = wrapFetchWithX402(originalFetch)
 *   // Pass wrappedFetch as the `fetch` option to the SDK
 *
 * @param innerFetch - The underlying fetch function to wrap
 * @returns A fetch-compatible function with x402 payment handling
 */
export function wrapFetchWithX402(
  innerFetch: typeof globalThis.fetch,
): typeof globalThis.fetch {
  return async (
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> => {
    // Make the initial request
    const response = await innerFetch(input, init)

    // If not a 402, pass through
    if (response.status !== 402) {
      return response
    }

    // Check if x402 is enabled
    if (!isX402Enabled()) {
      logForDebugging('[x402] Received 402 but x402 payments are not enabled')
      return response
    }

    // Check for the x402 payment requirement header
    const paymentRequiredHeader = response.headers.get(
      X402_HEADERS.PAYMENT_REQUIRED,
    )
    if (!paymentRequiredHeader) {
      logForDebugging(
        '[x402] Received 402 but no X-Payment-Required header present',
      )
      return response
    }

    logForDebugging(`[x402] Received 402 Payment Required, processing...`)

    // Handle the payment
    const result = handlePaymentRequired(
      paymentRequiredHeader,
      getX402SessionSpentUSD(),
    )

    if (!result) {
      logForDebugging('[x402] Payment handling failed, returning original 402')
      return response
    }

    // Retry with payment header
    logForDebugging('[x402] Retrying request with payment header')

    const retryHeaders = new Headers(init?.headers)
    retryHeaders.set(X402_HEADERS.PAYMENT, result.paymentHeader)

    const retryResponse = await innerFetch(input, {
      ...init,
      headers: retryHeaders,
    })

    if (retryResponse.status === 402) {
      logForDebugging(
        '[x402] Payment was rejected by server (still got 402)',
      )
    } else {
      logForDebugging(
        `[x402] Payment accepted, response status: ${retryResponse.status}`,
      )
    }

    return retryResponse
  }
}

/**
 * Add x402 payment interceptor to an axios instance.
 *
 * Usage with WebFetchTool's axios:
 *   addX402AxiosInterceptor(axiosInstance)
 *
 * @param instance - The axios instance to add the interceptor to
 */
export function addX402AxiosInterceptor(instance: AxiosInstance): void {
  instance.interceptors.response.use(
    // Success handler — pass through non-402 responses
    (response) => response,
    // Error handler — intercept 402 responses
    async (error) => {
      if (
        !error.response ||
        error.response.status !== 402 ||
        !isX402Enabled()
      ) {
        throw error
      }

      const response: AxiosResponse = error.response

      const paymentRequiredHeader =
        response.headers[X402_HEADERS.PAYMENT_REQUIRED]
      if (!paymentRequiredHeader) {
        throw error
      }

      logForDebugging('[x402] Axios interceptor: handling 402 Payment Required')

      const result = handlePaymentRequired(
        paymentRequiredHeader,
        getX402SessionSpentUSD(),
      )

      if (!result) {
        throw error
      }

      // Retry the original request with the payment header
      const retryConfig = {
        ...error.config,
        headers: {
          ...error.config.headers,
          [X402_HEADERS.PAYMENT]: result.paymentHeader,
        },
      }

      return instance.request(retryConfig)
    },
  )
}
