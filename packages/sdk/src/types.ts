// Server-side config
export interface AgentBillConfig {
  receivingAddress: string;
  network: "base-mainnet" | "base-sepolia";
}

export interface RequirePaymentOptions {
  amount: string;
  currency: "USDC";
  description?: string;
}

// Client-side config
export type NetworkName = "base-mainnet" | "base-sepolia";

export interface PayingClientConfig {
  privateKey: `0x${string}`;
  network: NetworkName;
  rpcUrl?: string;
  baseFetch?: typeof globalThis.fetch;
}

export interface PayingClient {
  fetch: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
  address: `0x${string}`;
}
