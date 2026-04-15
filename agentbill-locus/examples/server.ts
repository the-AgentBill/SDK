/**
 * AgentBill × Locus — AI Market Analyst (Seller)
 *
 * Demonstrates @agent-bill/sdk: one middleware line gates any Express endpoint
 * behind a USDC payment. No payment logic in the handler — AgentBill handles
 * the full x402 flow (402 → sign → verify → settle) before next() is called.
 *
 * After AgentBill confirms payment, the handler calls Locus Wrapped Anthropic
 * to generate AI analysis and return it to the caller.
 *
 * Env vars (see .env.example):
 *   RECEIVING_ADDRESS     — Base mainnet wallet that receives USDC
 *   LOCUS_API_KEY         — Locus key for calling Claude via Wrapped APIs
 *   PORT                  — optional, default 3000
 */

import express from "express";
import dotenv from "dotenv";
import { agentBill, requirePayment } from "@agent-bill/sdk";
import { LocusClient } from "../src/locus.js";

dotenv.config();

// ─── Init ─────────────────────────────────────────────────────────────────────

if (!process.env.RECEIVING_ADDRESS) {
  console.error("ERROR: RECEIVING_ADDRESS is not set");
  process.exit(1);
}
if (!process.env.LOCUS_API_KEY) {
  console.error("ERROR: LOCUS_API_KEY is not set");
  process.exit(1);
}

// AgentBill: configure the x402 resource server for Base mainnet.
// All payment verification + on-chain settlement is handled here.
agentBill.init({
  receivingAddress: process.env.RECEIVING_ADDRESS as `0x${string}`,
  network: "base-mainnet",
});

// Locus: used only for AI generation (after payment is confirmed).
const locus = new LocusClient(process.env.LOCUS_API_KEY);

const app = express();
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get("/", (_req, res) => {
  res.json({
    name: "AgentBill × Locus — AI Market Analyst",
    sdk: "@agent-bill/sdk",
    network: "Base mainnet",
    services: {
      "POST /api/analyze": {
        price: "$0.10 USDC",
        description: "AI market analysis on any topic — powered by Claude via Locus",
        protocol: "x402",
      },
    },
  });
});

/**
 * Paid endpoint: AI market analysis.
 *
 * requirePayment() is the entire payment layer:
 *   → returns 402 with x402 payment terms to unpaid callers
 *   → verifies payment and settles on-chain for paid callers
 *   → calls next() only after payment is confirmed
 *
 * The handler below never runs without a valid payment.
 */
app.post(
  "/api/analyze",
  requirePayment({
    amount: "0.10",
    currency: "USDC",
    description: "AI market analysis via Claude",
  }),
  async (req, res) => {
    const query: string = req.body?.query ?? "Give a general market overview for today.";

    // Payment is already verified by AgentBill — just do the work.
    const response = await locus.chat({
      messages: [{ role: "user", content: query }],
      system:
        "You are an expert market analyst. Provide concise, actionable insights " +
        "in 2-3 focused paragraphs. Be specific with sectors, trends, and risks.",
      max_tokens: 600,
    });

    const analysis = response.content?.[0]?.text ?? "Analysis unavailable.";

    res.json({
      query,
      analysis,
      paid: "$0.10 USDC",
      model: "claude-haiku-4-5 via Locus Wrapped APIs",
      sdk: "@agent-bill/sdk v0.2.1",
    });
  }
);

// ─── Start ────────────────────────────────────────────────────────────────────

const PORT = process.env.PORT ?? 3000;
app.listen(PORT, () => {
  console.log("\nAgentBill × Locus — AI Market Analyst");
  console.log("─".repeat(50));
  console.log(`  SDK:      @agent-bill/sdk`);
  console.log(`  Network:  Base mainnet`);
  console.log(`  Wallet:   ${process.env.RECEIVING_ADDRESS}`);
  console.log(`  URL:      http://localhost:${PORT}`);
  console.log("\n  Routes:");
  console.log("    GET  /           → service info");
  console.log("    POST /api/analyze → $0.10 USDC (x402 via AgentBill)");
  console.log("\n  Waiting for agent payments...\n");
});
