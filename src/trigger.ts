import { BotConfig, TriggerOrder, ApiCallLog } from './types'
import { logApiCall } from './logger'

const BASE_URL = 'https://api.jup.ag'

export async function placeOCOOrder(
  config: BotConfig,
  order: TriggerOrder,
  apiCalls: ApiCallLog[]
): Promise<boolean> {
  const endpoint = 'POST /trigger/v1/createOrder'
  const start = Date.now()

  try {
    const res = await fetch(`${BASE_URL}/trigger/v1/createOrder`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey
      },
      body: JSON.stringify({
        maker: config.publicKey,
        payer: config.publicKey,
        inputMint: order.inputMint,
        outputMint: order.outputMint,
        params: {
          makingAmount: String(order.amount),
          takingAmount: String(Math.floor(order.amount * order.takeProfitPrice)),
        },
        computeUnitPrice: 'auto'
      }),
      signal: AbortSignal.timeout(5000)
    })

    const latency = Date.now() - start
    const raw = await res.text()

    if (!res.ok) {
      apiCalls.push(logApiCall(endpoint, latency, res.status, `HTTP error`, raw))
      return false
    }

    apiCalls.push(logApiCall(endpoint, latency, res.status))
    console.log(`  ✓ Trigger order placed — TP: ${order.takeProfitPrice.toFixed(4)} SL: ${order.stopLossPrice.toFixed(4)}`)
    return true

  } catch (err: any) {
    const latency = Date.now() - start
    apiCalls.push(logApiCall(endpoint, latency, 0, err.message))
    return false
  }
}

export async function cancelAllOrders(
  config: BotConfig,
  apiCalls: ApiCallLog[]
): Promise<boolean> {
  const endpoint = 'POST /trigger/v1/cancelOrders'
  const start = Date.now()

  try {
    const res = await fetch(`${BASE_URL}/trigger/v1/cancelOrders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey
      },
      body: JSON.stringify({
        maker: config.publicKey,
        computeUnitPrice: 'auto'
      }),
      signal: AbortSignal.timeout(5000)
    })

    const latency = Date.now() - start
    const raw = await res.text()

    if (!res.ok) {
      const parsed = JSON.parse(raw)
      if (parsed?.error === 'No orders to cancel') {
        apiCalls.push(logApiCall(endpoint, latency, res.status, null))
        console.log('  ✓ No open trigger orders to cancel')
        return true
      }
      apiCalls.push(logApiCall(endpoint, latency, res.status, `HTTP error`, raw))
      return false
    }

    apiCalls.push(logApiCall(endpoint, latency, res.status))
    console.log('  ✓ All trigger orders cancelled')
    return true

  } catch (err: any) {
    const latency = Date.now() - start
    apiCalls.push(logApiCall(endpoint, latency, 0, err.message))
    return false
  }
}
