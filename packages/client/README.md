# @agent-bill/client

Payment-enabled fetch client for AI agents. Drop in and any x402-compatible API accepts USDC payments from your agent automatically.

## Install

```bash
npm install @agent-bill/client
```

## Quick Start

```typescript
import { createPayingClient } from "@agent-bill/client";

const client = createPayingClient({
  privateKey: "0xYourWalletPrivateKey",
  network: "base-sepolia",
});

// Drop-in fetch replacement. Handles 402 automatically
const response = await client.fetch("https://api.example.com/data");

const data = await response.json();
console.log(data);
```

## How It Works

1. Your agent calls an x402-protected endpoint
2. Server returns `402 Payment Required` with payment details
3. Client signs the payment authorization using your wallet
4. Client retries the request with the payment signature
5. Server verifies and returns the data

Your agent pays in USDC on Base. No API keys, no subscriptions, no human in the loop.

## API

### `createPayingClient(config)`

| Field | Type | Description |
|---|---|---|
| `privateKey` | `0x${string}` | Wallet private key that will pay for requests |
| `network` | `"base-mainnet" \| "base-sepolia"` | Network to use |
| `rpcUrl` | `string` (optional) | Custom RPC URL. Defaults to public Base RPC |
| `baseFetch` | `typeof fetch` (optional) | Underlying fetch to wrap. Defaults to `globalThis.fetch` |

### Returns `PayingClient`

| Field | Type | Description |
|---|---|---|
| `fetch` | `(input, init?) => Promise<Response>` | Drop-in replacement for `fetch`. Handles 402 automatically |
| `address` | `0x${string}` | Your wallet address (derived from private key) |

## Networks

| Config value | Chain |
|---|---|
| `"base-sepolia"` | Base Sepolia testnet (for development) |
| `"base-mainnet"` | Base mainnet (for production) |

## Requirements

- Wallet must hold USDC on the target network
- Base Sepolia USDC is faucet-available for testing
- On Base mainnet, USDC payments via permit are gasless

## License

MIT
