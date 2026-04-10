export interface PriceData {
  mint: string
  price: number
  timestamp: number
}

export interface VolatilityState {
  samples: number[]
  stdDev: number
  isVolatile: boolean
}

export interface ApiCallLog {
  endpoint: string
  latency_ms: number
  http_status: number
  error: string | null
  raw_response?: string
}

export interface DecisionLog {
  timestamp: string
  price: number
  volatility: number
  decision: 'place_oco' | 'start_dca' | 'hold' | 'error'
  api_calls: ApiCallLog[]
}

export interface SwapOrder {
  inputMint: string
  outputMint: string
  amount: number
  slippageBps: number
}

export interface TriggerOrder {
  inputMint: string
  outputMint: string
  takeProfitPrice: number
  stopLossPrice: number
  amount: number
}

export interface RecurringOrder {
  inputMint: string
  outputMint: string
  amount: number
  intervalSeconds: number
}

export interface BotConfig {
  apiKey: string
  privateKey: string
  targetMint: string
  quoteMint: string
  dcaAmountUsdc: number
  volatilityThreshold: number
  publicKey: string
}
