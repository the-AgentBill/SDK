# @agent-bill/sdk

**The "Stripe" for x402. Make any API payable by an AI agent in two lines of code.**

Built on [Base](https://base.org) · Powered by [x402 V2](https://x402.org) · Settles in USDC

One package for both the **server** (payment wall) and **client** (paying agent).

## Install

```bash
npm install @agent-bill/sdk
```

## Quick Start: Server (Express)

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
  requirePayment({ amount: "0.01", currency: "USDC", description: "Weather data" }),
  (req, res) => {
    res.json({ city: "New York", temp: "72°F" });
  }
);

app.listen(3000);
```

## Quick Start: Client (Paying Agent)

```typescript
import { createPayingClient } from "@agent-bill/sdk/client";

const client = createPayingClient({
  privateKey: "0xYourWalletPrivateKey",
  network: "base-sepolia",
});

const response = await client.fetch("http://localhost:3000/api/weather");
const data = await response.json();
```

## Next.js (App Router)

### 1. Initialize once

```typescript
// lib/agentbill.ts
import { agentBill } from "@agent-bill/sdk";

agentBill.init({
  receivingAddress: "0xYourWalletAddress",
  network: "base-sepolia",
});
```

### 2. Protect a route handler

```typescript
// app/api/weather/route.ts
import "../../lib/agentbill";
import { withPayment } from "@agent-bill/sdk/server";
import { NextRequest, NextResponse } from "next/server";

async function handler(req: NextRequest) {
  return NextResponse.json({ city: "New York", temp: "72°F" });
}

export const GET = withPayment(
  { amount: "0.01", currency: "USDC", description: "Weather data" },
  handler
);
```

## How It Works

1. A request hits your protected endpoint with no payment header
2. Server returns `402 Payment Required` with payment details (price, address, network)
3. Client signs a USDC payment authorization using your wallet
4. Client retries with the payment signature
5. Server verifies via the [x402 facilitator](https://x402.org) and returns data

No API keys, no subscriptions, no human in the loop.

## API

### `agentBill.init(config)`

Call once when your server starts.

| Field | Type | Description |
|---|---|---|
| `receivingAddress` | `string` | Wallet address that receives USDC payments |
| `network` | `"base-mainnet" \| "base-sepolia"` | Network to accept payments on |

### `requirePayment(options)` (Express)

Returns Express middleware. Place before your route handler.

| Field | Type | Description |
|---|---|---|
| `amount` | `string` | Amount in USD, e.g. `"0.01"` |
| `currency` | `"USDC"` | Currency (USDC only for now) |
| `description` | `string` (optional) | Shown in the 402 response |

### `withPayment(options, handler)` (Next.js)

Wraps a Next.js App Router route handler with a payment wall. Import from `@agent-bill/sdk/server`.

| Field | Type | Description |
|---|---|---|
| `options.amount` | `string` | Amount in USD, e.g. `"0.01"` |
| `options.currency` | `"USDC"` | Currency (USDC only for now) |
| `options.description` | `string` (optional) | Shown in the 402 response |
| `handler` | `(req: NextRequest) => Promise<NextResponse>` | Route handler to protect |

### `createPayingClient(config)`

Import from `@agent-bill/sdk/client`.

| Field | Type | Description |
|---|---|---|
| `privateKey` | `` 0x${string} `` | Wallet private key for payments |
| `network` | `"base-mainnet" \| "base-sepolia"` | Network to use |
| `rpcUrl` | `string` (optional) | Custom RPC URL |
| `baseFetch` | `typeof fetch` (optional) | Underlying fetch to wrap |

Returns a `PayingClient` with `.fetch()` and `.address`.

## Networks

| Config value | Chain |
|---|---|
| `"base-sepolia"` | Base Sepolia testnet (development) |
| `"base-mainnet"` | Base mainnet (production) |

## Why Base?

Base has near-zero gas fees, making micro-transactions (e.g. $0.01) economically viable. Settles in USDC, compatible with Coinbase AgentKit and the x402 facilitator out of the box.

## Related Packages

| Package | Description |
|---|---|
| [`@agent-bill/middleware`](https://www.npmjs.com/package/@agent-bill/middleware) | Server middleware only (Express + Next.js) |
| [`@agent-bill/client`](https://www.npmjs.com/package/@agent-bill/client) | Payment-enabled fetch client only |

## License

MIT

[GitHub](https://github.com/the-AgentBill/SDK) · _AgentBill is not affiliated with Coinbase. x402 is an open protocol._
