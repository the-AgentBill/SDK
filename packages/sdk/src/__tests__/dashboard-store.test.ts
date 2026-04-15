import { describe, it, expect, beforeEach } from "vitest";
import { recordPayment, getStats, getEvents, clearEvents } from "../dashboard/store";

function makeEvent(overrides: Record<string, unknown> = {}) {
  return {
    endpoint: "/api/weather",
    method: "GET",
    amount: "0.01",
    currency: "USDC",
    payer: "0xabc123",
    success: true,
    network: "base-sepolia",
    ...overrides,
  };
}

describe("dashboard store", () => {
  beforeEach(() => {
    clearEvents();
  });

  it("records and retrieves events", () => {
    recordPayment(makeEvent());
    const events = getEvents();
    expect(events).toHaveLength(1);
    expect(events[0].endpoint).toBe("/api/weather");
    expect(events[0].id).toBeDefined();
    expect(events[0].timestamp).toBeGreaterThan(0);
  });

  it("getStats returns zeros when empty", () => {
    const stats = getStats();
    expect(stats.totalRevenue).toBe(0);
    expect(stats.todayRevenue).toBe(0);
    expect(stats.totalTransactions).toBe(0);
    expect(stats.todayTransactions).toBe(0);
    expect(stats.recentTransactions).toHaveLength(0);
    expect(stats.topEndpoints).toHaveLength(0);
    expect(stats.topPayers).toHaveLength(0);
  });

  it("calculates total revenue from successful events", () => {
    recordPayment(makeEvent({ amount: "0.50", success: true }));
    recordPayment(makeEvent({ amount: "0.25", success: true }));
    recordPayment(makeEvent({ amount: "1.00", success: false }));
    const stats = getStats();
    expect(stats.totalRevenue).toBeCloseTo(0.75);
    expect(stats.totalTransactions).toBe(3);
  });

  it("counts today's transactions", () => {
    recordPayment(makeEvent());
    recordPayment(makeEvent());
    const stats = getStats();
    expect(stats.todayTransactions).toBe(2);
    expect(stats.todayRevenue).toBeCloseTo(0.02);
  });

  it("groups top endpoints by revenue", () => {
    recordPayment(makeEvent({ endpoint: "/api/a", amount: "1.00" }));
    recordPayment(makeEvent({ endpoint: "/api/a", amount: "2.00" }));
    recordPayment(makeEvent({ endpoint: "/api/b", amount: "0.50" }));
    const stats = getStats();
    expect(stats.topEndpoints[0].endpoint).toBe("/api/a");
    expect(stats.topEndpoints[0].revenue).toBeCloseTo(3.0);
    expect(stats.topEndpoints[0].count).toBe(2);
    expect(stats.topEndpoints[1].endpoint).toBe("/api/b");
  });

  it("groups top payers by revenue", () => {
    recordPayment(makeEvent({ payer: "0xAAA", amount: "5.00" }));
    recordPayment(makeEvent({ payer: "0xBBB", amount: "1.00" }));
    recordPayment(makeEvent({ payer: "0xAAA", amount: "3.00" }));
    const stats = getStats();
    expect(stats.topPayers[0].payer).toBe("0xAAA");
    expect(stats.topPayers[0].revenue).toBeCloseTo(8.0);
    expect(stats.topPayers[1].payer).toBe("0xBBB");
  });

  it("recentTransactions returns last 20 in reverse order", () => {
    for (let i = 0; i < 25; i++) {
      recordPayment(makeEvent({ endpoint: `/api/${i}` }));
    }
    const stats = getStats();
    expect(stats.recentTransactions).toHaveLength(20);
    expect(stats.recentTransactions[0].endpoint).toBe("/api/24");
    expect(stats.recentTransactions[19].endpoint).toBe("/api/5");
  });

  it("clearEvents empties the store", () => {
    recordPayment(makeEvent());
    clearEvents();
    expect(getEvents()).toHaveLength(0);
  });
});
