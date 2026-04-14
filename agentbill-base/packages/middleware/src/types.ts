// One-time setup passed to agentBill.init()
export interface AgentBillConfig {
  receivingAddress: string;
  network: "base-mainnet" | "base-sepolia";
}

// What the developer passes to requirePayment()
export interface RequirePaymentOptions {
  amount: string;
  currency: "USDC";
  description?: string;
}
