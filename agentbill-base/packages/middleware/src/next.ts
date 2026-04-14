/**
 * Next.js App Router adapter for the AgentBill x402 V2 payment wall.
 *
 * Usage in app/api/weather/route.ts:
 *
 *   import { withPayment } from "@agent-bill/middleware/next";
 *
 *   async function handler(req: NextRequest) {
 *     return NextResponse.json({ weather: "sunny" });
 *   }
 *
 *   export const GET = withPayment({ amount: "0.01", currency: "USDC" }, handler);
 *
 * agentBill.init() must be called before any request is handled.
 * Place the call in your instrumentation.ts / lib/init.ts and import it early.
 */
import { withX402 } from "@x402/next";
import type { NextRequest, NextResponse } from "next/server";
import { getState, NETWORK_IDS } from "./state";
import type { RequirePaymentOptions } from "./types";

type NextHandler<T = unknown> = (request: NextRequest) => Promise<NextResponse<T>>;

/**
 * Wraps a Next.js App Router route handler with an x402 V2 payment wall.
 *
 * Payment is verified *before* the handler runs. Settlement only occurs
 * after the handler returns a successful response (status < 400).
 *
 * @param options - Payment configuration (amount, currency, optional description)
 * @param handler - The Next.js route handler to protect
 * @returns A wrapped handler that enforces payment first
 */
export function withPayment<T = unknown>(
  options: RequirePaymentOptions,
  handler: NextHandler<T>
): NextHandler<T> {
  const { config, server } = getState();

  const network = NETWORK_IDS[config.network];
  if (!network) {
    throw new Error(`Unsupported network: ${config.network}`);
  }

  return withX402(
    handler,
    {
      accepts: [
        {
          scheme: "exact",
          payTo: config.receivingAddress,
          price: `$${options.amount}`,
          network,
        },
      ],
      description:
        options.description ??
        `Payment required: ${options.amount} ${options.currency}`,
    },
    server
  );
}
