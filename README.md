# AgentBill

![image](./new_logo.png)
**The "Stripe" for x402 — make any API payable by an AI agent in two lines of code.**

Built on [Base](https://base.org) · Powered by [x402 V2](https://x402.org) · Settles in USDC

**Live demo:** [agent-billmiddleware-production.up.railway.app](https://agent-billmiddleware-production.up.railway.app/api/weather)
· **Proof of payment:** [Basescan tx](https://basescan.org/tx/0x8be8fc88d7f7fb768315bc4bcd1b438d32b76bfa9ba24a95ed6dacdd2d1224cb)

---

## The Problem

The internet is shifting from humans clicking buttons to **AI agents calling APIs**. But most APIs still require a credit card, a monthly subscription, or a complex API key setup that an agent can't navigate.

The **x402 protocol** (by Coinbase) fixes this: a server returns `402 Payment Required` and the agent pays instantly in USDC — no signup, no OAuth, no human in the loop.

**The catch:** wiring up x402 from scratch means configuring resource servers, registering payment schemes, handling CAIP-2 network IDs, and getting the headers right. Most developers won't bother.

AgentBill makes it two lines.

---

## What is AgentBill?

A unified SDK that wraps x402 V2. Use it as a **server** to add payment walls, or as a **client** to auto-pay endpoints.

```typescript
import { agentBill, requirePayment } from "@agent-bill/sdk";

agentBill.init({ receivingAddress: "0xYours", network: "base-sepolia" });

app.get(
  "/api/data",
  requirePayment({ amount: "0.01", currency: "USDC" }),
  handler
);
```

That's it. Your API now accepts USDC payments from any AI agent or x402-compatible client.

---

## How It Works

```
AI Agent                    Your API (AgentBill)         x402.org Facilitator
    │                               │                            │
    │── GET /api/data ─────────────►│                            │
    │◄── 402 + PAYMENT-REQUIRED ────│                            │
    │                               │                            │
    │  [signs payment authorization]│                            │
    │                               │                            │
    │── GET /api/data ──────────────│                            │
    │   + PAYMENT-SIGNATURE header  │── verify ─────────────────►│
    │                               │◄── valid ──────────────────│
    │◄── 200 + data ────────────────│                            │
```

---

## Project Structure

```
agent-bill/
├── packages/
│   └── sdk/              # @agent-bill/sdk — unified SDK (server + client)
├── examples/
│   ├── testnet/express-quickstart/   # Base Sepolia demo
│   └── mainnet/express-quickstart/   # Base mainnet demo (deployed on Railway)
└── README.md
```

---

## Getting Started

### Install

```bash
npm install @agent-bill/sdk
```

### Server — Add a Payment Wall (Express)

```typescript
import express from "express";
import { agentBill, requirePayment } from "@agent-bill/sdk";

const app = express();

agentBill.init({
  receivingAddress: "0xYourWalletAddress",
  network: "base-sepolia",
});

app.get(
  "/api/weather",
  requirePayment({
    amount: "0.01",
    currency: "USDC",
    description: "Weather data",
  }),
  (req, res) => {
    res.json({ city: "New York", temp: "72°F" });
  }
);

app.listen(3000);
```

### Client — Auto-Pay for Endpoints

```typescript
import { createPayingClient } from "@agent-bill/sdk";

const client = createPayingClient({
  privateKey: "0xYourWalletPrivateKey",
  network: "base-sepolia",
});

const response = await client.fetch("http://localhost:3000/api/weather");
const data = await response.json();
```

### Next.js (App Router)

```typescript
// app/api/weather/route.ts
import { agentBill, withPayment } from "@agent-bill/sdk";

// Initialize once (e.g. in instrumentation.ts)
agentBill.init({
  receivingAddress: "0xYourWalletAddress",
  network: "base-sepolia",
});

async function handler(req: NextRequest) {
  return NextResponse.json({ city: "New York", temp: "72°F" });
}

export const GET = withPayment({ amount: "0.01", currency: "USDC" }, handler);
```

---

## Roadmap

- [x] `@agent-bill/sdk` v0.1 — Unified SDK (server + client)
- [x] Express payment wall
- [x] Next.js App Router support
- [x] Payment-enabled fetch client
- [x] Mainnet deployment on Railway — [live 402 paywall](https://agent-billmiddleware-production.up.railway.app/api/weather)
- [ ] Hono adapter — Cloudflare Workers edge support
- [ ] Dashboard — payment analytics per endpoint

---

## Why Base?

Base has near-zero gas fees, making micro-transactions (e.g. $0.01) economically viable. AgentBill is designed for the Base ecosystem — settles in USDC, compatible with Coinbase AgentKit and the x402 facilitator out of the box.

---

## License

MIT

---

_AgentBill is not affiliated with Coinbase. x402 is an open protocol._
