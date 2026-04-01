export type NetworkName = "base-mainnet" | "base-sepolia";

export interface PayingClientConfig {
  privateKey: `0x${string}`;
  network: NetworkName;
  rpcUrl?: string;
  baseFetch?: typeof globalThis.fetch;
}

export interface PayingClient {
  /** Payment-enabled fetch. Drop-in replacement for globalThis.fetch. */
  fetch: (
    input: string | URL | Request,
    init?: RequestInit
  ) => Promise<Response>;

  /** The wallet address derived from the private key. */
  address: `0x${string}`;
}
