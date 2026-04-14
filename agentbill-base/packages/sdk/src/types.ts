// Server-side config
export interface AgentBillConfig {
  receivingAddress: string;
  network: "base-mainnet" | "base-sepolia";
  /**
   * Set to false to opt out of anonymous usage telemetry.
   * No PII is collected — only SDK version, network, and a random instance ID.
   * Defaults to true.
   */
  telemetry?: boolean;
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
