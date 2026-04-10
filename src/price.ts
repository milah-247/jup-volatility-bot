import { BotConfig, VolatilityState, ApiCallLog } from './types'
import { logApiCall } from './logger'

const BASE_URL = 'https://api.jup.ag'
const WINDOW_SIZE = 10

let priceWindow: number[] = []

function calcStdDev(samples: number[]): number {
  if (samples.length < 2) return 0
  const mean = samples.reduce((a, b) => a + b, 0) / samples.length
  const variance = samples.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / samples.length
  return Math.sqrt(variance)
}

export async function fetchPrice(
  config: BotConfig,
  apiCalls: ApiCallLog[]
): Promise<number | null> {
  const endpoint = `GET /price/v3?ids=${config.targetMint}`
  const start = Date.now()

  try {
    const res = await fetch(`${BASE_URL}/price/v3?ids=${config.targetMint}`, {
      headers: { 'x-api-key': config.apiKey },
      signal: AbortSignal.timeout(5000)
    })

    const latency = Date.now() - start
    const raw = await res.text()

    if (!res.ok) {
      apiCalls.push(logApiCall(endpoint, latency, res.status, `HTTP error`, raw))
      return null
    }

    const data = JSON.parse(raw)
    const price = parseFloat(data?.[config.targetMint]?.usdPrice)

    apiCalls.push(logApiCall(endpoint, latency, res.status))

    if (isNaN(price)) {
      console.warn('  ⚠ Could not parse price from response')
      return null
    }

    return price

  } catch (err: any) {
    const latency = Date.now() - start
    apiCalls.push(logApiCall(endpoint, latency, 0, err.message))
    return null
  }
}

export function updateVolatility(price: number, threshold: number): VolatilityState {
  priceWindow.push(price)
  if (priceWindow.length > WINDOW_SIZE) priceWindow.shift()

  const stdDev = calcStdDev(priceWindow)
  const isVolatile = stdDev >= threshold

  return {
    samples: [...priceWindow],
    stdDev,
    isVolatile
  }
}