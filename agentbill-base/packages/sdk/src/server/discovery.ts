/**
 * x402 discovery manifest — served at /.well-known/x402-discovery
 *
 * Auto-indexed by x402scout and compatible registries. Every endpoint wrapped
 * with requirePayment() is registered here on its first request, making the
 * server discoverable with zero extra configuration.
 *
 * Mount with:
 *   app.use(createDiscoveryRoute())
 */
import { Router } from "express";
import { getState } from "./state";

export interface DiscoveryEndpoint {
  path: string;
  method: string;
  price: string;
  currency: string;
  description?: string;
}

// Module-level registry — populated automatically by requirePayment()
const _endpoints: DiscoveryEndpoint[] = [];
const _seen = new Set<string>();

/**
 * Register an endpoint in the discovery manifest.
 * Called automatically by requirePayment() on first request — no manual calls needed.
 * Deduplicates by method + path.
 */
export function registerEndpoint(endpoint: DiscoveryEndpoint): void {
  const key = `${endpoint.method.toUpperCase()}:${endpoint.path}`;
  if (_seen.has(key)) return;
  _seen.add(key);
  _endpoints.push(endpoint);
}

/**
 * Returns the full discovery manifest for this server.
 * Throws if agentBill.init() hasn't been called yet.
 */
export function getDiscoveryManifest() {
  const { config } = getState();
  return {
    name: "AgentBill Service",
    network: config.network,
    wallet: config.receivingAddress,
    endpoints: [..._endpoints],
  };
}

/**
 * Returns an Express Router that serves GET /.well-known/x402-discovery.
 *
 * Mount once after agentBill.init():
 *   app.use(createDiscoveryRoute())
 *
 * x402scout and compatible agent registries will auto-index this endpoint.
 */
export function createDiscoveryRoute(): Router {
  const router = Router();

  router.get("/.well-known/x402-discovery", (_req, res) => {
    try {
      res.json(getDiscoveryManifest());
    } catch {
      res.status(503).json({ error: "AgentBill not initialized. Call agentBill.init() first." });
    }
  });

  return router;
}
