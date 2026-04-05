# express-quickstart

A minimal runnable example showing how to gate an Express route with a USDC payment wall using `@agent-bill/middleware`.

## What this example does

- Exposes a free route at `GET /`
- Exposes a paid route at `GET /api/weather`:requires $0.01 USDC on Base Sepolia
- Includes a test client that automatically pays and fetches the data end-to-end

## Prerequisites

- Node.js 20+
- pnpm
- Two Base Sepolia wallets:
  - **Server wallet**:receives payments (you only need the address)
  - **Client wallet**:pays for API calls (you need the private key)
- Base Sepolia USDC in the client wallet:get it free from [faucet.circle.com](https://faucet.circle.com)

## Setup

**1. Install dependencies** (from the repo root):

```bash
pnpm install
```

**2. Generate two fresh wallets** if you don't have them:

```bash
node -e "
const { generatePrivateKey, privateKeyToAccount } = require('./node_modules/viem/accounts');
const server = generatePrivateKey();
const client = generatePrivateKey();
console.log('RECEIVING_ADDRESS=' + privateKeyToAccount(server).address);
console.log('SERVER_PRIVATE_KEY=' + server + '  (keep safe, store in your own wallet)');
console.log('');
console.log('CLIENT_PRIVATE_KEY=' + client);
console.log('CLIENT_ADDRESS=' + privateKeyToAccount(client).address + '  (fund this with USDC)');
"
```

**3. Create `.env`:**

```bash
cp .env.example .env
```

Fill in your values:

```env
RECEIVING_ADDRESS=0xYourServerWalletAddress
CLIENT_PRIVATE_KEY=0xYourClientPrivateKey
```

**4. Fund the client wallet** with Base Sepolia USDC:
- Go to [faucet.circle.com](https://faucet.circle.com)
- Select **Base Sepolia**
- Paste your client wallet address

> Note: do not use well-known test addresses (e.g. Hardhat defaults):bots sweep them instantly.

## Run

**Terminal 1:start the server:**

```bash
pnpm dev
# Server running on http://localhost:3000
```

**Terminal 2:run the test client:**

```bash
pnpm tsx --env-file=.env test-client.ts
```

Expected output:

```
Calling http://localhost:3000/api/weather as 0xYourClient...
→ Sending payment request with PAYMENT-SIGNATURE header
← Response status: 200
Status: 200
Body: { city: 'New York', temp: '72°F', humidity: '60%' }
```

## How it works

```
test-client.ts                 server.ts (AgentBill)         x402.org facilitator
      │                               │                              │
      │── GET /api/weather ──────────►│                              │
      │◄── 402 + PAYMENT-REQUIRED ────│                              │
      │                               │                              │
      │  [signs USDC permit]          │                              │
      │                               │                              │
      │── GET /api/weather ──────────►│                              │
      │   + PAYMENT-SIGNATURE header  │── verify + settle ──────────►│
      │                               │◄── success + tx hash ────────│
      │◄── 200 + weather data ────────│                              │
```

1. Client calls the API:gets `402` with payment requirements in the `PAYMENT-REQUIRED` header
2. `wrapFetchWithPayment` signs a USDC permit (no ETH needed:gasless)
3. Client retries with the `PAYMENT-SIGNATURE` header
4. Server verifies + settles via x402.org:USDC moves on-chain
5. Client gets the `200` response

## Files

| File | Purpose |
|---|---|
| `server.ts` | Express server with a payment-gated route |
| `test-client.ts` | x402-compatible client that auto-pays and fetches |
| `package.json` | Dependencies and scripts |
