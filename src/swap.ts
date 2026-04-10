import { BotConfig, SwapOrder, ApiCallLog } from './types'
import { logApiCall } from './logger'

const BASE_URL = 'https://api.jup.ag'

export async function buildSwapOrder(
  config: BotConfig,
  order: SwapOrder,
  apiCalls: ApiCallLog[]
): Promise<any | null> {
  const endpoint = 'POST /swap/v2/order'
  const start = Date.now()

  try {
    const res = await fetch(`${BASE_URL}/swap/v2/order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey
      },
      body: JSON.stringify({
        inputMint: order.inputMint,
        outputMint: order.outputMint,
        amount: order.amount,
        slippageBps: order.slippageBps,
        taker: config.privateKey
      }),
      signal: AbortSignal.timeout(5000)
    })

    const latency = Date.now() - start
    const raw = await res.text()

    if (!res.ok) {
      apiCalls.push(logApiCall(endpoint, latency, res.status, `HTTP error`, raw))
      return null
    }

    apiCalls.push(logApiCall(endpoint, latency, res.status))
    return JSON.parse(raw)

  } catch (err: any) {
    const latency = Date.now() - start
    apiCalls.push(logApiCall(endpoint, latency, 0, err.message))
    return null
  }
}

export async function executeSwap(
  config: BotConfig,
  orderResponse: any,
  apiCalls: ApiCallLog[]
): Promise<boolean> {
  const endpoint = 'POST /swap/v2/execute'
  const start = Date.now()

  try {
    const res = await fetch(`${BASE_URL}/swap/v2/execute`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.apiKey
      },
      body: JSON.stringify({
        signedTransaction: orderResponse.transaction
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
    console.log('  ✓ Swap executed successfully')
    return true

  } catch (err: any) {
    const latency = Date.now() - start
    apiCalls.push(logApiCall(endpoint, latency, 0, err.message))
    return false
  }
}