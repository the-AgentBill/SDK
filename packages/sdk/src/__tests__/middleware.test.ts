import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockPaymentMiddleware } = vi.hoisted(() => ({
  mockPaymentMiddleware: vi.fn(),
}));

vi.mock("@x402/express", () => ({
  paymentMiddleware: mockPaymentMiddleware,
}));

vi.mock("../server/state", () => ({
  getState: vi.fn(() => ({
    config: { receivingAddress: "0xABC", network: "base-sepolia" },
    server: {},
  })),
  NETWORK_IDS: {
    "base-mainnet": "eip155:8453",
    "base-sepolia": "eip155:84532",
  },
}));

import { requirePayment } from "../server/middleware";
import { getState } from "../server/state";

describe("requirePayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockPaymentMiddleware.mockReturnValue(vi.fn());
  });

  it("builds correct route config with default description", async () => {
    const middleware = requirePayment({ amount: "0.01", currency: "USDC" });
    const req = { route: { path: "/api/weather" } } as any;
    const res = {} as any;
    const next = vi.fn();

    await middleware(req, res, next);

    expect(mockPaymentMiddleware).toHaveBeenCalledWith(
      {
        "/api/weather": {
          description: "Payment required: 0.01 USDC",
          accepts: [
            {
              scheme: "exact",
              payTo: "0xABC",
              price: "$0.01",
              network: "eip155:84532",
            },
          ],
        },
      },
      expect.anything(),
    );
  });

  it("uses custom description", async () => {
    const middleware = requirePayment({
      amount: "0.01",
      currency: "USDC",
      description: "Weather API",
    });
    const req = { route: { path: "/api/weather" } } as any;

    await middleware(req, {} as any, vi.fn());

    const routeConfig = mockPaymentMiddleware.mock.calls[0][0];
    expect(routeConfig["/api/weather"].description).toBe("Weather API");
  });

  it("converts :param to [param] in route pattern", async () => {
    const middleware = requirePayment({ amount: "0.01", currency: "USDC" });
    const req = { route: { path: "/api/data/:id" } } as any;

    await middleware(req, {} as any, vi.fn());

    const routeConfig = mockPaymentMiddleware.mock.calls[0][0];
    expect(routeConfig).toHaveProperty("/api/data/[id]");
  });

  it("converts multiple :params", async () => {
    const middleware = requirePayment({ amount: "0.01", currency: "USDC" });
    const req = { route: { path: "/api/:v/items/:id" } } as any;

    await middleware(req, {} as any, vi.fn());

    const routeConfig = mockPaymentMiddleware.mock.calls[0][0];
    expect(routeConfig).toHaveProperty("/api/[v]/items/[id]");
  });

  it("falls back to /* when req.route is undefined", async () => {
    const middleware = requirePayment({ amount: "0.01", currency: "USDC" });
    const req = {} as any;

    await middleware(req, {} as any, vi.fn());

    const routeConfig = mockPaymentMiddleware.mock.calls[0][0];
    expect(routeConfig).toHaveProperty("/*");
  });

  it("caches middleware on second call", async () => {
    const middleware = requirePayment({ amount: "0.01", currency: "USDC" });
    const req = { route: { path: "/api/weather" } } as any;

    await middleware(req, {} as any, vi.fn());
    await middleware(req, {} as any, vi.fn());

    expect(mockPaymentMiddleware).toHaveBeenCalledTimes(1);
  });

  it("throws on unsupported network", async () => {
    vi.mocked(getState).mockReturnValueOnce({
      config: { receivingAddress: "0xABC", network: "ethereum-mainnet" as any },
      server: {} as any,
    });

    const middleware = requirePayment({ amount: "0.01", currency: "USDC" });
    const req = { route: { path: "/test" } } as any;

    await expect(middleware(req, {} as any, vi.fn())).rejects.toThrow(
      "Unsupported network",
    );
  });
});
