import { describe, it, expect } from "vitest";
import { CHAINS } from "../client/networks";

describe("CHAINS", () => {
  it("maps base-mainnet to base chain (id 8453)", () => {
    expect(CHAINS["base-mainnet"].id).toBe(8453);
  });

  it("maps base-sepolia to baseSepolia chain (id 84532)", () => {
    expect(CHAINS["base-sepolia"].id).toBe(84532);
  });

  it("has exactly two entries", () => {
    expect(Object.keys(CHAINS)).toHaveLength(2);
  });
});
