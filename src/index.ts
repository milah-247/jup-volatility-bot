import 'dotenv/config'
import { BotConfig, ApiCallLog, DecisionLog } from './types'
import { fetchPrice, updateVolatility } from './price'
import { buildSwapOrder, executeSwap } from './swap'
import { placeOCOOrder, cancelAllOrders } from './trigger'
import { startDCA, cancelDCA } from './recurring'
import { logDecision, printSummary } from './logger'

const config: BotConfig = {
  apiKey: process.env.JUPITER_API_KEY!,
  privateKey: process.env.PRIVATE_KEY!,
  publicKey: process.env.PUBLIC_KEY!,
  targetMint: process.env.TARGET_TOKEN_MINT!,
  quoteMint: process.env.QUOTE_TOKEN_MINT!,
  dcaAmountUsdc: parseFloat(process.env.DCA_AMOUNT_USDC || '5'),
  volatilityThreshold: parseFloat(process.env.VOLATILITY_THRESHOLD || '0.015')
}

const POLL_INTERVAL_MS = 30_000
const RUN_DURATION_MS = 5 * 60 * 1000

let lastDecision: 'place_oco' | 'start_dca' | 'hold' | 'error' | null = null

async function tick(): Promise<void> {
  const apiCalls: ApiCallLog[] = []
  const timestamp = new Date().toISOString()

  console.log(`\n[${timestamp}] Polling price...`)

  const price = await fetchPrice(config, apiCalls)

  if (!price) {
    logDecision({ timestamp, price: 0, volatility: 0, decision: 'error', api_calls: apiCalls })
    return
  }

  const { stdDev, isVolatile } = updateVolatility(price, config.volatilityThreshold)

  console.log(`  price=${price.toFixed(4)} stdDev=${stdDev.toFixed(4)} volatile=${isVolatile}`)

  let decision: DecisionLog['decision'] = 'hold'

  if (isVolatile && lastDecision !== 'place_oco') {
    console.log('  ⚡ Volatility spike detected — placing OCO order')

    await cancelDCA(config, apiCalls)

    const placed = await placeOCOOrder(config, {
      inputMint: config.quoteMint,
      outputMint: config.targetMint,
      amount: config.dcaAmountUsdc * 1_000_000,
      takeProfitPrice: price * 1.08,
      stopLossPrice: price * 0.95
    }, apiCalls)

    decision = placed ? 'place_oco' : 'error'

  } else if (!isVolatile && lastDecision !== 'start_dca') {
    console.log('  🟢 Market calm — starting DCA')

    await cancelAllOrders(config, apiCalls)

    const started = await startDCA(config, {
      inputMint: config.quoteMint,
      outputMint: config.targetMint,
      amount: config.dcaAmountUsdc * 1_000_000,
      intervalSeconds: 3600
    }, apiCalls)

    decision = started ? 'start_dca' : 'error'

  } else {
    console.log(`  — Holding current strategy: ${lastDecision}`)
  }

  lastDecision = decision

  logDecision({
    timestamp,
    price,
    volatility: stdDev,
    decision,
    api_calls: apiCalls
  })
}

async function main(): Promise<void> {
  console.log('🚀 jup-volatility-bot starting...')
  console.log(`   Target: ${config.targetMint}`)
  console.log(`   Quote:  ${config.quoteMint}`)
  console.log(`   Threshold: ${config.volatilityThreshold}`)
  console.log(`   Run duration: ${RUN_DURATION_MS / 1000}s\n`)

  if (!config.apiKey || !config.privateKey) {
    console.error('❌ Missing JUPITER_API_KEY or PRIVATE_KEY in .env')
    process.exit(1)
  }

  const endTime = Date.now() + RUN_DURATION_MS

  await tick()

  const interval = setInterval(async () => {
    if (Date.now() >= endTime) {
      clearInterval(interval)
      printSummary()
      process.exit(0)
    }
    await tick()
  }, POLL_INTERVAL_MS)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})