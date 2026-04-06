/**
 * Fastify adapter for the AgentBill x402 V2 payment wall.
 *
 * Usage as a Fastify plugin (scoped to a prefix):
 *
 *   agentBill.init({ receivingAddress: "0x...", network: "base-sepolia" });
 *
 *   app.register(requirePayment({ amount: "0.01", currency: "USDC" }), {
 *     prefix: "/api/weather",
 *   });
 *
 *   app.get("/api/weather", (req, reply) => {
 *     reply.send({ city: "New York", temp: "72°F" });
 *   });
 */
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { x402HTTPResourceServer } from "@x402/core/server";
import { FastifyAdapter } from "./adapter";
import { getState, NETWORK_IDS } from "../server/state";
import type { RequirePaymentOptions } from "../types";
import { recordPayment } from "../dashboard/store";

interface X402PaymentContext {
  paymentPayload: unknown;
  paymentRequirements: unknown;
  declaredExtensions?: Record<string, unknown>;
  requestContext: {
    adapter: FastifyAdapter;
    path: string;
    method: string;
  };
}

/**
 * Returns a Fastify plugin that wraps routes with x402 V2 payment verification
 * and settlement. Register it with a prefix to scope to specific routes.
 */
export function requirePayment(options: RequirePaymentOptions) {
  return async function paymentPlugin(app: FastifyInstance): Promise<void> {
    const { config, server } = getState();

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

    const httpServer = new x402HTTPResourceServer(server, routeConfig);
    let initialized = false;

    app.decorateRequest("x402Context", undefined);

    app.addHook(
      "onRequest",
      async (request: FastifyRequest, reply: FastifyReply) => {
        if (!initialized) {
          await httpServer.initialize();
          initialized = true;
        }

        const adapter = new FastifyAdapter(request);
        const requestContext = {
          adapter,
          path: adapter.getPath(),
          method: adapter.getMethod(),
        };

        const result = await httpServer.processHTTPRequest(requestContext);

        if (result.type === "no-payment-required") {
          return;
        }

        if (result.type === "payment-error") {
          const { status, headers, body, isHtml } = result.response;
          for (const [key, value] of Object.entries(headers)) {
            reply.header(key, value);
          }
          if (isHtml) {
            return reply.status(status).type("text/html").send(body);
          }
          return reply.status(status).send(body ?? {});
        }

        if (result.type === "payment-verified") {
          (request as any).x402Context = {
            paymentPayload: result.paymentPayload,
            paymentRequirements: result.paymentRequirements,
            declaredExtensions: result.declaredExtensions,
            requestContext,
          } satisfies X402PaymentContext;
        }
      },
    );

    app.addHook(
      "onSend",
      async (
        request: FastifyRequest,
        reply: FastifyReply,
        payload: unknown,
      ) => {
        const ctx = (request as any).x402Context as
          | X402PaymentContext
          | undefined;
        if (!ctx) return payload;

        if (reply.statusCode >= 400) return payload;

        const responseBody =
          typeof payload === "string"
            ? Buffer.from(payload)
            : Buffer.isBuffer(payload)
              ? payload
              : Buffer.from(JSON.stringify(payload ?? {}));

        const settleResult = await httpServer.processSettlement(
          ctx.paymentPayload as any,
          ctx.paymentRequirements as any,
          ctx.declaredExtensions,
          { request: ctx.requestContext, responseBody },
        );

        try {
          recordPayment({
            endpoint: ctx.requestContext.path,
            method: ctx.requestContext.method,
            amount: options.amount,
            currency: options.currency,
            payer: (ctx.paymentPayload as any)?.payload?.permit2Authorization?.from ?? "unknown",
            success: settleResult.success,
            network: getState().config.network,
          });
        } catch { /* never block payment flow */ }

        if (settleResult.success) {
          for (const [key, value] of Object.entries(settleResult.headers)) {
            reply.header(key, value);
          }
          return payload;
        }

        const errorResponse = settleResult.response;
        if (errorResponse) {
          for (const [key, value] of Object.entries(
            errorResponse.headers ?? {},
          )) {
            reply.header(key, value);
          }
          reply.status(errorResponse.status);
          return JSON.stringify(errorResponse.body ?? {});
        }

        return payload;
      },
    );
  };
}
