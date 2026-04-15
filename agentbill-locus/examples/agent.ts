/**
 * AgentBill × Locus — Buyer Agent
 *
 * Uses Locus's x402 proxy to call an AgentBill-gated endpoint.
 * The agent makes a single POST to Locus (/api/x402/call) with the
 * target URL and body. Locus handles the entire x402 protocol automatically:
 *
 *   Locus proxy → POST /api/analyze         (gets 402 from AgentBill)
 *              ← 402 + x402 payment terms
 *   Locus proxy → signs + submits USDC payment on Base
 *   Locus proxy → POST /api/analyze + payment header
 *              ← 200 { analysis }
 *   → returns 200 to this agent
 *
 * The agent itself writes zero payment logic.
 *
 * Env vars (see .env.example):
 *   LOCUS_API_KEY   — Locus key for the buying agent (must have USDC on Base)
 *   SERVER_URL      — public URL of the AgentBill server
 */

import dotenv from "dotenv";
import { LocusClient, LOCUS_BASE_URL } from "../src/locus.js";

dotenv.config();

const LOCUS_API_KEY = process.env.LOCUS_API_KEY ?? "";
const SERVER_URL = (process.env.SERVER_URL ?? "").replace(/\/$/, "");

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  if (!LOCUS_API_KEY) {
    console.error("ERROR: LOCUS_API_KEY is not set");
    process.exit(1);
  }
  if (!SERVER_URL) {
    console.error("ERROR: SERVER_URL is not set");
    process.exit(1);
  }

  const locus = new LocusClient(LOCUS_API_KEY);

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║     AgentBill × Locus — Buyer Agent Demo         ║");
  console.log("╚══════════════════════════════════════════════════╝\n");

  // ── Check balance ──────────────────────────────────────────────────────────
  const { balance, walletAddress } = await locus.getBalance();
  console.log(`Agent wallet:  ${walletAddress}`);
  console.log(`Balance:       $${balance} USDC\n`);

  if (parseFloat(balance) < 0.10) {
    console.error("Insufficient balance. Need at least $0.10 USDC.");
    process.exit(1);
  }

  // ── Fetch service info ─────────────────────────────────────────────────────
  const info = await fetch(`${SERVER_URL}/`).then((r) => r.json());
  console.log(`Service:  ${info.name}`);
  console.log(`Protocol: ${info.services?.["POST /api/analyze"]?.protocol}`);
  console.log(`Price:    ${info.services?.["POST /api/analyze"]?.price}\n`);

  const query =
    "What are the top investment opportunities in AI infrastructure for Q2 2026? " +
    "Cover semiconductor stocks, cloud providers, and key risks.";

  console.log(`Query: "${query}"\n`);

  // ── Pay and call via Locus x402 proxy ─────────────────────────────────────
  // This single API call does everything:
  //   1. Calls SERVER_URL/api/analyze — gets 402 from AgentBill
  //   2. Reads x402 payment terms from the 402 response
  //   3. Signs and submits the USDC payment on Base mainnet
  //   4. Retries the request with the payment header
  //   5. Returns the 200 response
  console.log("Calling AgentBill endpoint via Locus x402 proxy...");
  console.log("(Locus handles the 402 → pay → retry flow automatically)\n");

  const proxyRes = await fetch(`${LOCUS_BASE_URL}/x402/call`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOCUS_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: `${SERVER_URL}/api/analyze`,
      method: "POST",
      body: { query },
    }),
  });

  if (!proxyRes.ok) {
    const err = await proxyRes.json();
    console.error("Locus x402 proxy error:", JSON.stringify(err, null, 2));
    process.exit(1);
  }

  const result = await proxyRes.json();

  // ── Display results ────────────────────────────────────────────────────────
  // Locus wraps the upstream response in { success, data }
  const data = result?.data ?? result;

  console.log("╔══════════════════════════════════════════════════╗");
  console.log("║  Analysis                                        ║");
  console.log("╚══════════════════════════════════════════════════╝\n");
  console.log(data.analysis ?? data);

  console.log("\n╔══════════════════════════════════════════════════╗");
  console.log("║  Payment Summary                                 ║");
  console.log("╚══════════════════════════════════════════════════╝");
  console.log(`  Paid:    ${data.paid}`);
  console.log(`  Model:   ${data.model}`);
  console.log(`  SDK:     ${data.sdk}`);

  // ── Show updated balance ───────────────────────────────────────────────────
  const { balance: newBalance } = await locus.getBalance();
  console.log(`\n  Agent balance: $${balance} → $${newBalance} USDC`);
  console.log("  ($0.10 paid to seller via AgentBill x402 on Base mainnet)\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
