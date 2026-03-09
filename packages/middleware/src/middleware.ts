/**
 * Express adapter for the AgentBill x402 V2 payment wall.
 *
 * Request comes in
 *  │
 *  ├── Has PAYMENT-SIGNATURE header?
 *  │     ├── YES → verify with x402 resource server → call next()
 *  │     └── NO  → return 402 with PAYMENT-REQUIRED requirements
 */
import { Request, Response, NextFunction } from "express";
import { paymentMiddleware } from "@x402/express";
import { getState, NETWORK_IDS } from "./state";
import type { RequirePaymentOptions } from "./types";

/**
 * Express middleware factory. Wraps a route with a real x402 V2 payment wall.
 *
 * Usage:
 *   app.get("/api/data", requirePayment({ amount: "0.01", currency: "USDC" }), handler)
 *
 * Flow:
 *   1. No PAYMENT-SIGNATURE header → 402 with payment requirements
 *   2. PAYMENT-SIGNATURE present → x402 V2 resource server verifies → next()
 */
export function requirePayment(options: RequirePaymentOptions) {
  // Middleware is built once on first request then cached per route
  let _cachedMiddleware:
    | ((req: Request, res: Response, next: NextFunction) => Promise<void>)
    | null = null;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { config, server } = getState();

    if (!_cachedMiddleware) {
      const network = NETWORK_IDS[config.network];
      if (!network) {
        throw new Error(`Unsupported network: ${config.network}`);
      }

      const routes = {
        "/*": {
          description:
            options.description ??
            `Payment required: ${options.amount} ${options.currency}`,
          accepts: [
            {
              scheme: "exact",
              payTo: config.receivingAddress,
              price: `$${options.amount}`,
              network,
            },
          ],
        },
      };

      _cachedMiddleware = paymentMiddleware(routes, server);
    }

    return _cachedMiddleware(req, res, next);
  };
}
