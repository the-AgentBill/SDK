/**
 * Hono adapter for the AgentBill x402 V2 payment wall.
 *
 * Works on Cloudflare Workers, Deno, Bun, and Node.js.
 *
 *
 *   agentBill.init({ receivingAddress: "0x...", network: "base-sepolia" });
 *
 *   const app = new Hono();
 *   app.get("/api/data", requirePayment({ amount: "0.01", currency: "USDC" }), (c) => {
 *     return c.json({ data: "paid content" });
 *   });
 */
import type { Context, MiddlewareHandler } from "hono";
import { x402HTTPResourceServer } from "@x402/core/server";
import { HonoAdapter } from "./adapter";
import { getState, NETWORK_IDS } from "../server/state";
import type { RequirePaymentOptions } from "../types";
import { recordPayment } from "../dashboard/store";

/**
 * Hono middleware factory. Wraps a route with a real x402 V2 payment wall.
 *
 * Flow:
 *   1. No PAYMENT-SIGNATURE header -> 402 with payment requirements
 *   2. PAYMENT-SIGNATURE present -> x402 V2 resource server verifies
 *   3. Handler runs, then payment is settled
 */
export function requirePayment(
  options: RequirePaymentOptions
): MiddlewareHandler {
  let httpServer: x402HTTPResourceServer | null = null;
  let initialized = false;

  return async (ctx: Context, next) => {
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

    const adapter = new HonoAdapter(ctx);
    const requestContext = {
      adapter,
      path: adapter.getPath(),
      method: adapter.getMethod(),
    };
    const result = await httpServer.processHTTPRequest(requestContext);

    if (result.type === "no-payment-required") {
      await next();
      return;
    }

    if (result.type === "payment-error") {
      const { status, headers, body, isHtml } = result.response;
      for (const [key, value] of Object.entries(headers)) {
        ctx.header(key, value);
      }
      if (isHtml) {
        ctx.header("content-type", "text/html");
        return ctx.html(body as string, status as 402);
      }
      return ctx.json(body as object, status as 402);
    }

    if (result.type === "payment-verified") {
      // Run the handler
      await next();

      // Get the response status from the handler
      const responseStatus = ctx.res.status;

      // Only settle if handler returned success
      if (responseStatus >= 400) {
        return;
      }

      // Settle the payment
      const responseText = await ctx.res.clone().text();
      const responseBody = Buffer.from(responseText);
      const settleResult = await httpServer.processSettlement(
        result.paymentPayload,
        result.paymentRequirements,
        result.declaredExtensions,
        { request: requestContext, responseBody }
      );

      try {
        recordPayment({
          endpoint: adapter.getPath(),
          method: adapter.getMethod(),
          amount: options.amount,
          currency: options.currency,
          payer: (result.paymentPayload as any)?.payload?.permit2Authorization?.from ?? "unknown",
          success: settleResult.success,
          network: config.network,
        });
      } catch { /* never block payment flow */ }

      if (settleResult.success) {
        if (settleResult.headers) {
          const newHeaders = new Headers(ctx.res.headers);
          for (const [key, value] of Object.entries(settleResult.headers)) {
            newHeaders.set(key, value);
          }
          ctx.res = new Response(ctx.res.body, {
            status: ctx.res.status,
            statusText: ctx.res.statusText,
            headers: newHeaders,
          });
        }
      } else {
        const errorResponse = settleResult.response;
        if (errorResponse) {
          for (const [key, value] of Object.entries(
            errorResponse.headers ?? {}
          )) {
            ctx.header(key, value);
          }
          return ctx.json(
            errorResponse.body as object,
            errorResponse.status as 402
          );
        }
      }
    }
  };
}
