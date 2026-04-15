import { x402ResourceServer } from "@x402/express";
import type { Network } from "@x402/express";
import { HTTPFacilitatorClient } from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";
import { facilitator as cdpFacilitator } from "@coinbase/x402";
import type { AgentBillConfig } from "./types";

// EIP-155 CAIP-2 network ID mapping
export const NETWORK_IDS: Record<string, Network> = {
  "base-mainnet": "eip155:8453",
  "base-sepolia": "eip155:84532",
};

const MAINNET_NETWORKS = new Set(["base-mainnet"]);

// Module-level singleton — set once via init()
let _config: AgentBillConfig | null = null;
let _server: x402ResourceServer | null = null;

/**
 * Call once at server start. Configures the x402 V2 resource server with the
 * exact EVM payment scheme. Works for both Express and Next.js adapters.
 *
 * On mainnet networks, uses the Coinbase CDP facilitator (requires
 * CDP_API_KEY_ID and CDP_API_KEY_SECRET env vars).
 * On testnet networks, uses the public x402.org facilitator (no auth needed).
 */
export function init(config: AgentBillConfig): void {
  _config = config;
  const isMainnet = MAINNET_NETWORKS.has(config.network);
  const facilitatorClient = isMainnet
    ? new HTTPFacilitatorClient(cdpFacilitator)
    : undefined;
  const server = new x402ResourceServer(facilitatorClient);
  registerExactEvmScheme(server);
  _server = server;
}

/**
 * Returns the initialised config and server, or throws if init() hasn't been
 * called yet.
 */
export function getState(): { config: AgentBillConfig; server: x402ResourceServer } {
  if (!_config || !_server) {
    throw new Error("AgentBill not initialized. Call agentBill.init() first.");
  }
  return { config: _config, server: _server };
}
