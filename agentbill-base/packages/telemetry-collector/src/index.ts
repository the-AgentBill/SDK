/**
 * AgentBill Telemetry Collector — Cloudflare Worker
 *
 * Receives anonymous SDK init pings and stores them in KV.
 *
 * KV key format:
 *   ping:{timestamp}:{instanceId}  →  JSON payload
 *
 * Also maintains a running counter at:
 *   stats:total_inits
 *   stats:by_network:{network}
 */

export interface Env {
  TELEMETRY: KVNamespace;
}

interface PingPayload {
  event: string;
  sdkVersion: string;
  network: string;
  instanceId: string;
}

const ALLOWED_NETWORKS = new Set(["base-mainnet", "base-sepolia"]);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/health") {
      return new Response("ok", { status: 200 });
    }

    // Stats endpoint (for your own dashboard use)
    if (url.pathname === "/stats" && request.method === "GET") {
      const [total, mainnet, sepolia] = await Promise.all([
        env.TELEMETRY.get("stats:total_inits"),
        env.TELEMETRY.get("stats:by_network:base-mainnet"),
        env.TELEMETRY.get("stats:by_network:base-sepolia"),
      ]);
      return Response.json({
        total_inits: Number(total ?? 0),
        by_network: {
          "base-mainnet": Number(mainnet ?? 0),
          "base-sepolia": Number(sepolia ?? 0),
        },
      });
    }

    // Ping ingestion
    if (url.pathname === "/ping" && request.method === "POST") {
      let body: PingPayload;

      try {
        body = await request.json();
      } catch {
        return new Response("bad request", { status: 400 });
      }

      // Validate
      if (
        body.event !== "init" ||
        typeof body.sdkVersion !== "string" ||
        typeof body.instanceId !== "string" ||
        !ALLOWED_NETWORKS.has(body.network)
      ) {
        return new Response("bad request", { status: 400 });
      }

      const timestamp = Date.now();
      const key = `ping:${timestamp}:${body.instanceId}`;

      // Store the event (TTL: 1 year)
      await env.TELEMETRY.put(key, JSON.stringify({ ...body, timestamp }), {
        expirationTtl: 60 * 60 * 24 * 365,
      });

      // Increment counters
      const [currentTotal, currentNetwork] = await Promise.all([
        env.TELEMETRY.get("stats:total_inits"),
        env.TELEMETRY.get(`stats:by_network:${body.network}`),
      ]);

      await Promise.all([
        env.TELEMETRY.put(
          "stats:total_inits",
          String(Number(currentTotal ?? 0) + 1)
        ),
        env.TELEMETRY.put(
          `stats:by_network:${body.network}`,
          String(Number(currentNetwork ?? 0) + 1)
        ),
      ]);

      return new Response("ok", { status: 200 });
    }

    return new Response("not found", { status: 404 });
  },
};
