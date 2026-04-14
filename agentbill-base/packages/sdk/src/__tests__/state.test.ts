import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock x402 dependencies before importing state
vi.mock("@x402/core/server", () => ({
  x402ResourceServer: vi.fn().mockImplementation(() => ({
    initialize: vi.fn(),
    processHTTPRequest: vi.fn(),
  })),
  HTTPFacilitatorClient: vi.fn(),
}));

vi.mock("@x402/evm/exact/server", () => ({
  registerExactEvmScheme: vi.fn(),
}));

vi.mock("@coinbase/x402", () => ({
  facilitator: "https://facilitator.example.com",
}));

describe("state", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  async function freshImport() {
    // Re-mock after resetModules
    vi.mock("@x402/core/server", () => ({
      x402ResourceServer: vi.fn().mockImplementation(() => ({
        initialize: vi.fn(),
        processHTTPRequest: vi.fn(),
      })),
      HTTPFacilitatorClient: vi.fn(),
    }));
    vi.mock("@x402/evm/exact/server", () => ({
      registerExactEvmScheme: vi.fn(),
    }));
    vi.mock("@coinbase/x402", () => ({
      facilitator: "https://facilitator.example.com",
    }));

    return import("../server/state");
  }

  it("getState throws before init", async () => {
    const { getState } = await freshImport();
    expect(() => getState()).toThrow("AgentBill not initialized");
  });

  it("init with base-sepolia creates server without CDP facilitator", async () => {
    const { init, getState } = await freshImport();
    const { HTTPFacilitatorClient } = await import("@x402/core/server");

    init({ receivingAddress: "0xABC", network: "base-sepolia" });

    expect(HTTPFacilitatorClient).not.toHaveBeenCalled();
    expect(getState().config.network).toBe("base-sepolia");
  });

  it("init with base-mainnet creates server with CDP facilitator", async () => {
    const { init } = await freshImport();
    const { HTTPFacilitatorClient } = await import("@x402/core/server");

    init({ receivingAddress: "0xABC", network: "base-mainnet" });

    expect(HTTPFacilitatorClient).toHaveBeenCalled();
  });

  it("getState returns config and server after init", async () => {
    const { init, getState } = await freshImport();

    init({ receivingAddress: "0xABC", network: "base-sepolia" });

    const state = getState();
    expect(state.config).toEqual({
      receivingAddress: "0xABC",
      network: "base-sepolia",
    });
    expect(state.server).toBeDefined();
  });

  it("NETWORK_IDS maps correctly", async () => {
    const { NETWORK_IDS } = await freshImport();
    expect(NETWORK_IDS["base-mainnet"]).toBe("eip155:8453");
    expect(NETWORK_IDS["base-sepolia"]).toBe("eip155:84532");
  });
});
