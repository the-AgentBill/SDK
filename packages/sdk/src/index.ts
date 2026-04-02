export { init, getState, NETWORK_IDS, requirePayment, withPayment } from "./server";
export { createPayingClient } from "./client";

export type {
  AgentBillConfig,
  RequirePaymentOptions,
  PayingClient,
  PayingClientConfig,
  NetworkName,
} from "./types";

import { init } from "./server";
export const agentBill = { init };
