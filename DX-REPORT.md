# DX Report — jup-volatility-bot

**Builder:** @milah-247  
**Project:** Volatility-triggered DCA + OCO limit order bot  
**APIs used:** Price V3, Swap V2, Trigger, Recurring  
**Repo:** https://github.com/milah-247/jup-volatility-bot  
**Date:** April 10, 2026

---

## 1. Onboarding

**Time to first successful API call:** ~2 hours from landing on developers.jup.ag

**What went well:**
- Getting an API key was fast. One key for everything is the right call.
- The dashboard is clean.

**What was confusing:**

The single biggest onboarding failure was the Price API endpoint. The docs reference `/price/v2` but that returns a 404. Trying `/v6/price` also returns a 404. The actual working endpoint is `/price/v3`. There is zero guidance at the point of failure — no redirect, no error message pointing you to the right path, just a blank 404. A first-time developer would have no way of knowing this without digging through changelogs or asking in Discord.

Additionally, V3 changed the price field from `price` to `usdPrice`. This is not surfaced anywhere in the onboarding flow. The result is that even after finding the correct endpoint, price data returns as `NaN` until you read the raw response carefully enough to notice the field rename.

These two issues together mean a new developer can spend hours just getting a price quote to work — the most basic possible API call.

---

## 2. Docs Issues

**Price API:**
- Page: https://dev.jup.ag/docs/price
- `/price/v2` is listed as deprecated but there is no banner or redirect pointing developers to `/price/v3`
- The field rename from `price` to `usdPrice` is buried. It should be the first thing on the migration notice.
- The old endpoints (`price.jup.ag`, `lite-api.jup.ag/price/v2`) return 404 with no helpful error body

**Trigger API:**
- Page: https://dev.jup.ag/docs/trigger-api/create-order
- The `payer` field is required but not shown in the main request body example
- It is only discoverable by reading the raw Zod validation error: `{"code":"invalid_type","expected":"string","received":"undefined","path":["payer"]}`
- The `params` wrapper object is also required but the docs show flat fields in some examples and nested in others — inconsistent

**Recurring API:**
- Page: https://dev.jup.ag/docs/recurring-api/create-order
- The docs show `user` as the field name but behavior is inconsistent
- No mention anywhere that the underlying server (`recurring-actions-api.raccoons.dev`) may return 502 HTML pages instead of JSON errors

**cancelOrders endpoint:**
- Returns HTTP 400 with `{"error":"No orders to cancel","code":1}` when there are no open orders
- This should be a 200 success response, not a 400 error
- Forces developers to write special-case error handling for what is a normal expected state

---

## 3. API Friction

**Price API `/price/v3`**
- Works well once you find it
- Response time: 55–237ms, consistent
- Response structure clean and predictable

**Trigger API `/trigger/v1/createOrder`**
- Eventually worked after discovering `payer` and `params` requirements from raw error responses
- Error messages from Zod are actually helpful once you get them — but you only get them after fixing the wrong field
- Successfully placed OCO order at TP: 89.62, SL: 78.84 on a real volatility spike
- Response time: 32–366ms

**Trigger API `/trigger/v1/cancelOrders`**
- Returns 400 for "No orders to cancel" — should be 200
- Once orders exist it works correctly
- Response time: 70–436ms

**Recurring API `/recurring/v1/createOrder`**
- Consistently returning 502 Bad Gateway from `recurring-actions-api.raccoons.dev`
- The error response is a raw Cloudflare HTML page, not JSON
- Completely unhandleable programmatically — no error code, no message, no retry guidance
- This was down for the entire build session (3+ hours)
- No mention of this outage on the status page or in Discord during the build

**Recurring API `/recurring/v1/cancelOrder`**
- Returns 422 when there are no orders to cancel
- Same problem as trigger cancelOrders — should be 200

---

## 4. AI Stack Feedback

Did not use Agent Skills, Docs MCP, or Jupiter CLI during this build. Here is why and what would have helped:

**Agent Skills** — not aware these existed until reading the bounty brief more carefully after the build. There was no prominent callout on developers.jup.ag pointing to them. If the correct endpoint paths and required fields had been in a Skills file fed to my coding agent at the start, it would have saved 2+ hours of endpoint discovery.

**Docs MCP** — would have been useful for querying "what fields does createOrder require" without leaving the editor. The friction of switching between browser docs and editor was real.

**Jupiter CLI** — not used. Would be useful for quick endpoint testing without writing a full fetch call. Essentially a curl wrapper with auth built in — that is genuinely useful for debugging field requirements.

**What is missing from the AI stack:**
- Agent Skills should be linked directly from the API reference pages, not buried in a separate section
- A "copy as curl" button on every endpoint in the docs would eliminate half the field discovery friction
- The Skills files should include known gotchas like the `payer` requirement and the `usdPrice` field rename

---

## 5. Platform Redesign Ideas

**Get developers to first API call in under 5 minutes:**

Right now the flow is: get key → read docs → write code → hit 404 → debug → find correct endpoint → hit field error → debug → finally get a response. That is 2+ hours.

It should be: get key → see a working curl command with your key pre-filled → copy → run → see a real response. Done in 2 minutes.

Specific changes:

1. **Pre-filled curl examples on the dashboard.** When a developer gets their API key, show them a ready-to-run curl command with their actual key inserted. One click to copy. One paste to run. First successful API call in under 60 seconds.

2. **Inline API playground.** Let developers run API calls directly from the docs page with their key pre-loaded. No code required for exploration.

3. **Sticky deprecation banners.** Every deprecated endpoint should redirect with a 301 and include a `Location` header pointing to the new endpoint. A 404 with no body is a dead end.

4. **Field validation errors in docs.** The Zod errors returned by the API are actually good — show examples of them in the docs alongside the request body so developers know what to expect when they get a field wrong.

5. **Status page integration.** If a core API like Recurring is down, there should be a banner on the docs page and dashboard. Discovering a 3-hour outage by getting 502 HTML pages is not acceptable DX.

6. **Separate the "concept" docs from the "reference" docs.** Right now some pages mix explanation with API reference. The reference section should be purely: endpoint, method, required fields, optional fields, example request, example response. Nothing else.

---

## 6. Wishlist

**Endpoints:**
- `GET /recurring/v1/orders?user=` — need to check if a DCA order already exists before trying to create one
- `GET /trigger/v1/orders?maker=` — same for trigger orders
- `DELETE /trigger/v1/cancelOrders` should return 200 when no orders exist, not 400

**SDK:**
- A TypeScript SDK with typed request/response bodies would eliminate the field discovery problem entirely
- Even just auto-generated types from the OpenAPI schema would be enough
- The Zod schemas are clearly already defined on the backend — expose them

**Tooling:**
- Jupiter CLI needs a `test` command that validates your API key and returns a sample price quote — instant onboarding health check
- A `jup init` command that scaffolds a TypeScript project with correct tsconfig and all imports pre-configured would save 30–60 minutes of setup

**Documentation:**
- Changelog with breaking changes clearly marked — the `price` → `usdPrice` rename needed a migration guide
- A "common errors" page per API listing the most frequent error responses and what causes them

---

## Summary

The Jupiter Developer Platform has the right vision — one key, one place, everything you need. The APIs themselves work. The Trigger API placed a real OCO order on a detected volatility spike during this build session.

The friction is entirely in the discovery layer. Wrong endpoints, renamed fields, missing required fields, and a core API being down with no notification added 2+ hours to what should have been a 30-minute integration. Every one of those hours is a developer who might have given up.

Fix the endpoint redirect, add pre-filled curl examples to the dashboard, expose the TypeScript types, and put a status banner on the docs when an API is down. Those four changes alone would cut onboarding time in half.

The bones are good. The DX just needs to match the ambition.
