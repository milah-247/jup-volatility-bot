import { BotConfig, RecurringOrder, ApiCallLog } from './types'
import { logApiCall } from './logger'

const BASE_URL = 'https://api.jup.ag'

export async function startDCA(
  config: BotConfig,
  order: RecurringOrder,
  apiCalls: ApiCallLog[]
): Promise<boolean> {
  const endpoint = 'POST /recurring/v1/createOrder'
  const start = Date.now()

  try {
    const res = await fetch(`${BASE_URL}/recurring/v1/createOrder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey
      },
      body: JSON.stringify({
        user: config.publicKey,
        inputMint: order.inputMint,
        outputMint: order.outputMint,
        params: {
          time: {
            inAmount: order.amount,
            numberOfOrders: 10,
            interval: order.intervalSeconds,
            minPrice: null,
            maxPrice: null,
            startAt: null
          }
        }
      }),
      signal: AbortSignal.timeout(5000)
    })

    const latency = Date.now() - start
    const raw = await res.text()

    if (res.status === 502) {
      apiCalls.push(logApiCall(endpoint, latency, res.status, 'Recurring API server down (502) — known outage on recurring-actions-api.raccoons.dev'))
      console.log('  ⚠ Recurring API is down (502) — skipping DCA, will retry next cycle')
      return false
    }

    if (!res.ok) {
      apiCalls.push(logApiCall(endpoint, latency, res.status, `HTTP error`, raw))
      return false
    }

    apiCalls.push(logApiCall(endpoint, latency, res.status))
    console.log(`  ✓ DCA order created — ${order.amount} every ${order.intervalSeconds}s`)
    return true

  } catch (err: any) {
    const latency = Date.now() - start
    apiCalls.push(logApiCall(endpoint, latency, 0, err.message))
    return false
  }
}

export async function cancelDCA(
  config: BotConfig,
  apiCalls: ApiCallLog[]
): Promise<boolean> {
  const endpoint = 'POST /recurring/v1/cancelOrder'
  const start = Date.now()

  try {
    const res = await fetch(`${BASE_URL}/recurring/v1/cancelOrder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey
      },
      body: JSON.stringify({
        user: config.publicKey,
        computeUnitPrice: 'auto'
      }),
      signal: AbortSignal.timeout(5000)
    })

    const latency = Date.now() - start
    const raw = await res.text()

    if (res.status === 502 || res.status === 422) {
      apiCalls.push(logApiCall(endpoint, latency, res.status, 'Recurring API unavailable — skipping cancel'))
      console.log('  ⚠ Recurring API unavailable — skipping cancel')
      return true
    }

    if (!res.ok) {
      apiCalls.push(logApiCall(endpoint, latency, res.status, `HTTP error`, raw))
      return false
    }

    apiCalls.push(logApiCall(endpoint, latency, res.status))
    console.log('  ✓ DCA order cancelled')
    return true

  } catch (err: any) {
    const latency = Date.now() - start
    apiCalls.push(logApiCall(endpoint, latency, 0, err.message))
    return false
  }
}
