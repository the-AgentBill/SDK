/**
 * Express adapter for the AgentBill x402 V2 payment wall.
 *
 * Uses x402HTTPResourceServer directly for full control over the payment
 * verification → handler → settlement flow, including dashboard integration.
 */
import { Request, Response, NextFunction } from "express";
import { x402HTTPResourceServer } from "@x402/core/server";
import { ExpressAdapter } from "./adapter";
import { getState, NETWORK_IDS } from "./state";
import { recordPayment } from "../dashboard/store";
import type { RequirePaymentOptions } from "../types";

/**
 * Express middleware factory. Wraps a route with a real x402 V2 payment wall.
 *
 * Usage:
 *   app.get("/api/data", requirePayment({ amount: "0.01", currency: "USDC" }), handler)
 *
 * Flow:
 *   1. No PAYMENT-SIGNATURE header → 402 with payment requirements
 *   2. PAYMENT-SIGNATURE present → x402 V2 resource server verifies → next()
 *   3. After handler responds, payment is settled and recorded to the dashboard
 */
export function requirePayment(options: RequirePaymentOptions) {
  let httpServer: x402HTTPResourceServer | null = null;
  let initialized = false;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const { config, server } = getState();

    if (!httpServer) {
      const network = NETWORK_IDS[config.network];
      if (!network) {
        throw new Error(`Unsupported network: ${config.network}`);
      }

      const routeConfig = {
        description:
          options.description ??
          `Payment required: ${options.amount} ${options.currency}`,
        accepts: [
          {
            scheme: "exact" as const,
            payTo: config.receivingAddress,
            price: `$${options.amount}`,
            network,
          },
        ],
      };

      httpServer = new x402HTTPResourceServer(server, routeConfig);
    }

    if (!initialized) {
      await httpServer.initialize();
      initialized = true;
    }

    const adapter = new ExpressAdapter(req);
    const requestContext = {
      adapter,
      path: adapter.getPath(),
      method: adapter.getMethod(),
    };

    const result = await httpServer.processHTTPRequest(requestContext);

    if (result.type === "no-payment-required") {
      next();
      return;
    }

    if (result.type === "payment-error") {
      const { status, headers, body, isHtml } = result.response;
      for (const [key, value] of Object.entries(headers)) {
        res.setHeader(key, value);
      }
      if (isHtml) {
        res.status(status).type("html").send(body);
      } else {
        res.status(status).json(body ?? {});
      }
      return;
    }

    if (result.type === "payment-verified") {
      // Intercept the response to capture the body for settlement
      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);

      const settle = async (responseBody: Buffer) => {
        if (res.statusCode >= 400) return;

        const settleResult = await httpServer!.processSettlement(
          result.paymentPayload,
          result.paymentRequirements,
          result.declaredExtensions,
          { request: requestContext, responseBody },
        );

        try {
          recordPayment({
            endpoint: adapter.getPath(),
            method: adapter.getMethod(),
            amount: options.amount,
            currency: options.currency,
            payer:
              (result.paymentPayload as any)?.payload?.permit2Authorization
                ?.from ?? "unknown",
            success: settleResult.success,
            network: config.network,
          });
        } catch {
          /* never block payment flow */
        }

        if (settleResult.success) {
          for (const [key, value] of Object.entries(settleResult.headers)) {
            res.setHeader(key, value);
          }
        } else if (settleResult.response) {
          for (const [key, value] of Object.entries(
            settleResult.response.headers ?? {},
          )) {
            res.setHeader(key, value);
          }
          res.status(settleResult.response.status);
        }
      };

      let settled = false;

      res.json = function (body: any) {
        if (!settled) {
          settled = true;
          const buf = Buffer.from(JSON.stringify(body));
          settle(buf).then(() => originalJson(body));
        }
        return res;
      };

      res.send = function (body: any) {
        if (!settled) {
          settled = true;
          const buf =
            typeof body === "string"
              ? Buffer.from(body)
              : Buffer.isBuffer(body)
                ? body
                : Buffer.from(JSON.stringify(body ?? {}));
          settle(buf).then(() => originalSend(body));
        }
        return res;
      };

      next();
    }
  };
}
