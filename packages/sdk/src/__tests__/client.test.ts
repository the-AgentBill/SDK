import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockWrapFetch, mockRegisterScheme, mockAccount } = vi.hoisted(() => ({
  mockWrapFetch: vi.fn(),
  mockRegisterScheme: vi.fn(),
  mockAccount: { address: "0x1234567890abcdef1234567890abcdef12345678" as `0x${string}` },
}));

vi.mock("viem", () => ({
  createWalletClient: vi.fn(() => ({
    extend: vi.fn(() => ({ mockWalletClient: true })),
  })),
  http: vi.fn((url?: string) => ({ url })),
  publicActions: "publicActions",
}));

vi.mock("viem/accounts", () => ({
  privateKeyToAccount: vi.fn(() => mockAccount),
}));

vi.mock("@x402/fetch", () => ({
  wrapFetchWithPayment: mockWrapFetch,
  x402Client: vi.fn().mockImplementation(() => ({ mockClient: true })),
}));

vi.mock("@x402/evm/exact/client", () => ({
  registerExactEvmScheme: mockRegisterScheme,
}));

import { createPayingClient } from "../client/client";
import { createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

describe("createPayingClient", () => {
  const validKey = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as `0x${string}`;

  beforeEach(() => {
    vi.clearAllMocks();
    mockWrapFetch.mockReturnValue(vi.fn());
  });

  it("returns object with fetch and address", () => {
    const client = createPayingClient({ privateKey: validKey, network: "base-sepolia" });
    expect(client).toHaveProperty("fetch");
    expect(client).toHaveProperty("address");
    expect(typeof client.fetch).toBe("function");
  });

  it("derives address from private key", () => {
    const client = createPayingClient({ privateKey: validKey, network: "base-sepolia" });
    expect(privateKeyToAccount).toHaveBeenCalledWith(validKey);
    expect(client.address).toBe(mockAccount.address);
  });

  it("creates wallet client with correct chain", () => {
    createPayingClient({ privateKey: validKey, network: "base-sepolia" });
    expect(createWalletClient).toHaveBeenCalledWith(
      expect.objectContaining({
        account: mockAccount,
        chain: expect.objectContaining({ id: 84532 }),
      }),
    );
  });

  it("uses custom rpcUrl", () => {
    createPayingClient({ privateKey: validKey, network: "base-sepolia", rpcUrl: "https://custom-rpc.com" });
    expect(http).toHaveBeenCalledWith("https://custom-rpc.com");
  });

  it("uses default fetch when baseFetch not provided", () => {
    createPayingClient({ privateKey: validKey, network: "base-sepolia" });
    expect(mockWrapFetch).toHaveBeenCalledWith(globalThis.fetch, expect.anything());
  });

  it("uses custom baseFetch", () => {
    const customFetch = vi.fn() as unknown as typeof fetch;
    createPayingClient({ privateKey: validKey, network: "base-sepolia", baseFetch: customFetch });
    expect(mockWrapFetch).toHaveBeenCalledWith(customFetch, expect.anything());
  });

  it("registers exact EVM scheme", () => {
    createPayingClient({ privateKey: validKey, network: "base-sepolia" });
    expect(mockRegisterScheme).toHaveBeenCalled();
  });

  it("throws on unsupported network", () => {
    expect(() =>
      createPayingClient({ privateKey: validKey, network: "ethereum-mainnet" as any }),
    ).toThrow("Unsupported network");
  });
});
