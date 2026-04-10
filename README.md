# jup-volatility-bot

> Volatility-triggered DCA + OCO limit order bot using Jupiter Price, Swap V2, Trigger, and Recurring APIs

A submission for the [Jupiter Developer Platform Bounty](https://developers.jup.ag). This bot monitors token price volatility on Solana in real time and dynamically switches between two strategies: time-based DCA (when markets are calm) and OCO take-profit/stop-loss limit orders (when volatility spikes). Built using four Jupiter APIs chained together through logic the platform wasn't explicitly designed for.

---

## What it does

- **Polls the Price API** every 30 seconds for a target token (e.g. SOL)
- **Calculates rolling volatility** from the last 10 price samples using standard deviation
- **Low volatility** → creates or resumes a DCA order via the Recurring API
- **High volatility** → cancels DCA and places an OCO order (TP +8%, SL -5%) via the Trigger API
- **Executes swaps** through Swap V2 (`/order` + `/execute`) using managed landing for best price
- **Logs every API call** with endpoint, latency, HTTP status, and raw error bodies — used directly for the DX report

---

## APIs used

| API | Endpoints | Purpose |
|---|---|---|
| Price | `GET /price/v2` | Real-time token price + volatility input |
| Swap V2 | `POST /swap/v2/order`, `POST /swap/v2/execute` | Managed swap execution |
| Trigger | `POST /trigger/v1/createOrder` | OCO limit orders (TP/SL) |
| Recurring | `POST /recurring/v1/createOrder` | Time-based DCA |

---

## Project structure

```
jup-volatility-bot/
├── src/
│   ├── index.ts          # Main loop — orchestrates all modules
│   ├── price.ts          # Price API poller + rolling volatility calculator
│   ├── swap.ts           # Swap V2 (/order, /execute)
│   ├── trigger.ts        # Trigger API — OCO limit orders
│   ├── recurring.ts      # Recurring API — DCA orders
│   ├── logger.ts         # Structured JSON decision logger
│   └── types.ts          # Shared TypeScript interfaces
├── logs/                 # Auto-created — JSON decision logs per run
├── .env.example
├── DX-REPORT.md
├── package.json
├── tsconfig.json
└── README.md
```

---

## Setup

### Prerequisites

- Node.js 20+
- A Jupiter Developer Platform API key from [developers.jup.ag](https://developers.jup.ag)
- A Solana wallet keypair (base58 encoded private key)

### Install

```bash
git clone https://github.com/YOUR_USERNAME/jup-volatility-bot
cd jup-volatility-bot
npm install
```

### Configure

```bash
cp .env.example .env
```

Edit `.env`:

```env
JUPITER_API_KEY=your_api_key_here
PRIVATE_KEY=your_base58_private_key
TARGET_TOKEN_MINT=So11111111111111111111111111111111111111112
QUOTE_TOKEN_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v
DCA_AMOUNT_USDC=5
VOLATILITY_THRESHOLD=0.015
```

| Variable | Description |
|---|---|
| `JUPITER_API_KEY` | Your key from developers.jup.ag |
| `PRIVATE_KEY` | Wallet private key (base58) — keep this secret |
| `TARGET_TOKEN_MINT` | Token to trade (default: SOL) |
| `QUOTE_TOKEN_MINT` | Quote currency (default: USDC) |
| `DCA_AMOUNT_USDC` | USDC amount per DCA cycle |
| `VOLATILITY_THRESHOLD` | Std deviation threshold to switch strategies (0.015 = 1.5%) |

### Run

```bash
npm run dev
```

The bot runs for 5 minutes, prints a summary, and exits cleanly. All decisions are logged to `logs/run-<timestamp>.json`.

---

## How the strategy works

```
Every 30s:
  Fetch price → update rolling window (last 10 samples)
  
  If std_dev < VOLATILITY_THRESHOLD:
    → Market is calm
    → Ensure DCA order is active (Recurring API)
    → Cancel any open limit orders

  If std_dev >= VOLATILITY_THRESHOLD:
    → Market is volatile
    → Pause DCA
    → Place OCO order: TP at price * 1.08, SL at price * 0.95 (Trigger API)
```

---

## Decision log format

Each run produces a JSON log in `logs/` for DX report analysis:

```json
{
  "timestamp": "2025-01-01T00:00:00Z",
  "price": 185.42,
  "volatility": 0.021,
  "decision": "place_oco",
  "api_calls": [
    {
      "endpoint": "POST /trigger/v1/createOrder",
      "latency_ms": 312,
      "http_status": 200,
      "error": null
    }
  ]
}
```

---

## DX Report

See [DX-REPORT.md](./DX-REPORT.md) for the full developer experience report covering onboarding, API friction, docs issues, AI stack feedback, and platform improvement ideas.

---

## Built with

- [Jupiter Developer Platform](https://developers.jup.ag)
- [@solana/web3.js](https://github.com/solana-labs/solana-web3.js)
- TypeScript + Node.js 20

---

## Disclaimer

This bot is a hackathon submission and proof of concept. Do not use it with funds you are not prepared to lose. No financial advice.
