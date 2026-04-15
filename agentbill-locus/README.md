# AgentBill × Locus

**Showcasing [`@agent-bill/sdk`](https://github.com/the-AgentBill/SDK) with [Locus](https://paywithlocus.com) as the agent payment layer.**

`@agent-bill/sdk` is the "Stripe for x402" — one middleware line gates any Express endpoint behind a USDC payment on Base. Locus is the agent wallet layer that pays for those endpoints automatically, with no private keys exposed.

Built for the [Locus Paygentic Hackathon #1](https://discord.gg/locus).

**Proof of payment on Base mainnet:**
[`0x8be8fc88...`](https://basescan.org/tx/0x8be8fc88d7f7fb768315bc4bcd1b438d32b76bfa9ba24a95ed6dacdd2d1224cb)

---

## How it works

```
Buyer Agent
  │  POST locus /api/x402/call { url: server/api/analyze, body }
  │
  │  Locus proxy ──► POST /api/analyze               (no payment)
  │                ◄── 402 + x402 payment terms      (from AgentBill)
  │                     pays $0.10 USDC on Base
  │                ──► POST /api/analyze + payment header
  │                ◄── 200 { analysis }
  │
  ◄─ 200 { analysis }   (Locus returns the final response)

AgentBill Server
  agentBill.init({ receivingAddress, network: "base-mainnet" })
  app.post("/api/analyze", requirePayment({ amount: "0.10" }), handler)
  //                       ↑ this is the entire payment layer
  //                         handler only runs after payment confirmed

  Inside handler → POST locus /api/wrapped/anthropic/chat → analysis
```

The agent writes zero payment logic. The server writes zero payment logic. Both delegate to their respective layers.

---

## Quick start

### 1. Install

```bash
cd agentbill-locus
npm install
cp .env.example .env
```

### 2. Configure `.env`

```
RECEIVING_ADDRESS=0xYourWallet     # where USDC lands (Base mainnet)
LOCUS_API_KEY=claw_dev_...         # for Locus Wrapped Anthropic on server
SERVER_URL=https://...             # public URL (Locus proxy can't reach localhost)
```

The buyer agent needs a separate `LOCUS_API_KEY` with USDC on Base mainnet.

### 3. Run the server

```bash
npm run example:server
```

```
AgentBill × Locus — AI Market Analyst
──────────────────────────────────────────────────
  SDK:      @agent-bill/sdk
  Network:  Base mainnet
  Wallet:   0xabc...
  URL:      http://localhost:3000

  Routes:
    GET  /           → service info
    POST /api/analyze → $0.10 USDC (x402 via AgentBill)

  Waiting for agent payments...
```

### 4. Run the agent

```bash
npm run example:agent
```

```
╔══════════════════════════════════════════════════╗
║     AgentBill × Locus — Buyer Agent Demo         ║
╚══════════════════════════════════════════════════╝

Agent wallet:  0xdef...
Balance:       $15.00 USDC

Calling AgentBill endpoint via Locus x402 proxy...
(Locus handles the 402 → pay → retry flow automatically)

╔══════════════════════════════════════════════════╗
║  Analysis                                        ║
╚══════════════════════════════════════════════════╝

AI infrastructure stocks present compelling opportunities...

  Paid:    $0.10 USDC
  Model:   claude-haiku-4-5 via Locus Wrapped APIs
  SDK:     @agent-bill/sdk v0.2.1

  Agent balance: $15.00 → $14.90 USDC
```

---

## What each layer does

| Layer | Library | Role |
|---|---|---|
| Payment gate | `@agent-bill/sdk` `requirePayment()` | x402 on Base — handles 402, verify, settle |
| Agent wallet | Locus `/api/x402/call` | Pays x402 endpoints from agent's USDC balance |
| AI backend | Locus `/api/wrapped/anthropic/chat` | Claude — billed from server's Locus wallet |

---

## Extending this

```typescript
// Any endpoint. Any price. One line.
app.post("/api/transcribe", requirePayment({ amount: "0.05" }), handler);
app.post("/api/research",   requirePayment({ amount: "0.25" }), handler);
app.post("/api/generate",   requirePayment({ amount: "0.50" }), handler);
```

Any Locus-powered agent can call all of them — no extra integration needed.

---

## Related

- [`@agent-bill/sdk`](https://github.com/the-AgentBill/SDK) — the core SDK
- [agentbill-hsk](../agentbill-hsk/) — HashKey Chain variant
- [agentbill-base](../agentbill-base/) — Base variant with dashboard
- [PayWithLocus](https://paywithlocus.com)
