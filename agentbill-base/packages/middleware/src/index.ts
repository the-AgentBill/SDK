// Express adapter
export { requirePayment } from "./middleware";

// Shared init (works for both Express and Next.js)
export { init } from "./state";

export type { AgentBillConfig, RequirePaymentOptions } from "./types";

// Namespace import: import { agentBill } from "@agent-bill/middleware"
import { init } from "./state";
export const agentBill = { init };
