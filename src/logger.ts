import fs from 'fs'
import path from 'path'
import { DecisionLog, ApiCallLog } from './types'

const logsDir = path.resolve('logs')

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true })
}

const runTimestamp = new Date().toISOString().replace(/[:.]/g, '-')
const logFile = path.join(logsDir, `run-${runTimestamp}.json`)
const logs: DecisionLog[] = []

export function logDecision(entry: DecisionLog): void {
  logs.push(entry)
  fs.writeFileSync(logFile, JSON.stringify(logs, null, 2))
  console.log(`[${entry.timestamp}] decision=${entry.decision} price=${entry.price.toFixed(4)} volatility=${entry.volatility.toFixed(4)}`)
}

export function logApiCall(
  endpoint: string,
  latency_ms: number,
  http_status: number,
  error: string | null = null,
  raw_response?: string
): ApiCallLog {
  const call: ApiCallLog = { endpoint, latency_ms, http_status, error, raw_response }
  console.log(`  → ${endpoint} | ${http_status} | ${latency_ms}ms${error ? ' | ERROR: ' + error : ''}`)
  return call
}

export function printSummary(): void {
  console.log('\n========= RUN SUMMARY =========')
  console.log(`Total decisions logged: ${logs.length}`)
  const decisions = logs.map(l => l.decision)
  console.log(`DCA triggers:   ${decisions.filter(d => d === 'start_dca').length}`)
  console.log(`OCO triggers:   ${decisions.filter(d => d === 'place_oco').length}`)
  console.log(`Hold decisions: ${decisions.filter(d => d === 'hold').length}`)
  console.log(`Errors:         ${decisions.filter(d => d === 'error').length}`)
  console.log(`Log saved to:   ${logFile}`)
  console.log('================================\n')
}
