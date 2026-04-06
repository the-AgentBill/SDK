import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockProcessHTTPRequest, mockProcessSettlement, mockInitialize } =
  vi.hoisted(() => ({
    mockProcessHTTPRequest: vi.fn(),
    mockProcessSettlement: vi.fn(),
    mockInitialize: vi.fn(),
  }));

vi.mock("@x402/core/server", () => ({
  x402HTTPResourceServer: vi.fn().mockImplementation(() => ({
    processHTTPRequest: mockProcessHTTPRequest,
    processSettlement: mockProcessSettlement,
    initialize: mockInitialize,
  })),
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

vi.mock("../dashboard/store", () => ({
  recordPayment: vi.fn(),
}));

import { requirePayment } from "../server/middleware";
import { getState } from "../server/state";
import { recordPayment } from "../dashboard/store";

function makeReq(overrides: Record<string, unknown> = {}) {
  return {
    method: "GET",
    path: "/api/weather",
    originalUrl: "/api/weather",
    protocol: "http",
    headers: {},
    query: {},
    get: vi.fn(() => "localhost"),
    ...overrides,
  } as any;
}

function makeRes() {
  const res: any = {
    statusCode: 200,
    status: vi.fn(function (code: number) {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn(function () {
      return res;
    }),
    send: vi.fn(function () {
      return res;
    }),
    setHeader: vi.fn(),
    type: vi.fn(function () {
      return res;
    }),
  };
  return res;
}

describe("requirePayment (Express)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInitialize.mockResolvedValue(undefined);
  });

  it("calls next() when no payment is required", async () => {
    mockProcessHTTPRequest.mockResolvedValue({ type: "no-payment-required" });
    const middleware = requirePayment({ amount: "0.01", currency: "USDC" });
    const next = vi.fn();

    await middleware(makeReq(), makeRes(), next);

    expect(next).toHaveBeenCalled();
  });

  it("returns 402 on payment-error", async () => {
    mockProcessHTTPRequest.mockResolvedValue({
      type: "payment-error",
      response: {
        status: 402,
        headers: { "X-Payment": "required" },
        body: { error: "pay up" },
        isHtml: false,
      },
    });
    const middleware = requirePayment({ amount: "0.01", currency: "USDC" });
    const res = makeRes();

    await middleware(makeReq(), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(402);
    expect(res.json).toHaveBeenCalledWith({ error: "pay up" });
    expect(res.setHeader).toHaveBeenCalledWith("X-Payment", "required");
  });

  it("returns HTML 402 when isHtml is true", async () => {
    mockProcessHTTPRequest.mockResolvedValue({
      type: "payment-error",
      response: {
        status: 402,
        headers: {},
        body: "<html>pay</html>",
        isHtml: true,
      },
    });
    const middleware = requirePayment({ amount: "0.01", currency: "USDC" });
    const res = makeRes();

    await middleware(makeReq(), res, vi.fn());

    expect(res.type).toHaveBeenCalledWith("html");
    expect(res.send).toHaveBeenCalledWith("<html>pay</html>");
  });

  it("settles payment and records to dashboard after handler responds", async () => {
    mockProcessHTTPRequest.mockResolvedValue({
      type: "payment-verified",
      paymentPayload: { payload: { permit2Authorization: { from: "0xPAYER" } } },
      paymentRequirements: { maxAmountRequired: "10000" },
      declaredExtensions: {},
    });
    mockProcessSettlement.mockResolvedValue({
      success: true,
      headers: { "X-Settlement": "ok" },
    });

    const middleware = requirePayment({ amount: "0.01", currency: "USDC" });
    const res = makeRes();
    const next = vi.fn();

    await middleware(makeReq(), res, next);

    expect(next).toHaveBeenCalled();

    // Simulate handler calling res.json()
    await res.json({ data: "paid content" });

    expect(mockProcessSettlement).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith("X-Settlement", "ok");
    expect(recordPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: "/api/weather",
        method: "GET",
        amount: "0.01",
        currency: "USDC",
        payer: "0xPAYER",
        success: true,
        network: "base-sepolia",
      }),
    );
  });

  it("does not settle when handler returns error status", async () => {
    mockProcessHTTPRequest.mockResolvedValue({
      type: "payment-verified",
      paymentPayload: {},
      paymentRequirements: {},
    });

    const middleware = requirePayment({ amount: "0.01", currency: "USDC" });
    const res = makeRes();
    res.statusCode = 500;

    await middleware(makeReq(), res, vi.fn());

    // Simulate handler calling res.send()
    await res.send("error");

    expect(mockProcessSettlement).not.toHaveBeenCalled();
  });

  it("throws on unsupported network", async () => {
    vi.mocked(getState).mockReturnValueOnce({
      config: { receivingAddress: "0xABC", network: "ethereum-mainnet" as any },
      server: {} as any,
    });

    const middleware = requirePayment({ amount: "0.01", currency: "USDC" });

    await expect(middleware(makeReq(), makeRes(), vi.fn())).rejects.toThrow(
      "Unsupported network",
    );
  });

  it("initializes httpServer only once", async () => {
    mockProcessHTTPRequest.mockResolvedValue({ type: "no-payment-required" });
    const middleware = requirePayment({ amount: "0.01", currency: "USDC" });

    await middleware(makeReq(), makeRes(), vi.fn());
    await middleware(makeReq(), makeRes(), vi.fn());

    expect(mockInitialize).toHaveBeenCalledTimes(1);
  });
});
