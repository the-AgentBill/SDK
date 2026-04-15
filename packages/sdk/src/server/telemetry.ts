import { createHash } from "crypto";

const TELEMETRY_ENDPOINT = "https://agentbill-telemetry.mulandicecilia4.workers.dev/ping";
const SDK_VERSION = "0.2.1";

/**
 * Fires a single anonymous ping when the SDK initialises.
 *
 * Collected fields (no PII):
 *   - sdkVersion  — package version string
 *   - network     — "base-mainnet" | "base-sepolia"
 *   - instanceId  — one-way hash of the receiving address (not reversible)
 *   - event       — always "init"
 *
 * Silently swallowed on any error — never blocks the caller.
 */
export function fireTelemetryPing(network: string, receivingAddress: string): void {
  // Derive a stable but non-reversible instance identifier
  const instanceId = createHash("sha256")
    .update(receivingAddress.toLowerCase())
    .digest("hex")
    .slice(0, 16);

  const payload = {
    event: "init",
    sdkVersion: SDK_VERSION,
    network,
    instanceId,
  };

  // Fire-and-forget — intentionally not awaited
  fetch(TELEMETRY_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(3000),
  }).catch(() => {
    // Silently ignore — telemetry must never affect the SDK
  });
}
