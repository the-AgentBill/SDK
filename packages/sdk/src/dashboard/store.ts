import { readFileSync, writeFile, mkdirSync } from "fs";
import { join } from "path";

export interface PaymentEvent {
  id: string;
  timestamp: number;
  endpoint: string;
  method: string;
  amount: string;
  currency: string;
  payer: string;
  success: boolean;
  network: string;
}

export interface DashboardStats {
  totalRevenue: number;
  todayRevenue: number;
  totalTransactions: number;
  todayTransactions: number;
  recentTransactions: PaymentEvent[];
  topEndpoints: { endpoint: string; count: number; revenue: number }[];
  topPayers: { payer: string; count: number; revenue: number }[];
}

const MAX_EVENTS = 1000;
const _events: PaymentEvent[] = [];

// Optional file persistence — set AGENTBILL_DATA_DIR to a writable directory
// (e.g. a Railway volume mounted at /data) to survive restarts and redeploys.
const DATA_DIR = process.env.AGENTBILL_DATA_DIR ?? null;
const EVENTS_FILE = DATA_DIR ? join(DATA_DIR, "events.json") : null;

if (EVENTS_FILE) {
  try {
    mkdirSync(DATA_DIR!, { recursive: true });
    const saved = JSON.parse(readFileSync(EVENTS_FILE, "utf8")) as PaymentEvent[];
    _events.push(...saved.slice(-MAX_EVENTS));
    console.log(`[AgentBill] Dashboard persistence enabled — loading events from ${EVENTS_FILE}`);
  } catch {
    // File doesn't exist yet — start fresh
  }
} else {
  console.warn(
    "[AgentBill] Dashboard running in-memory mode — payment history will be lost on restart.\n" +
    "           Set AGENTBILL_DATA_DIR to a writable directory to enable persistence.\n" +
    "           e.g. AGENTBILL_DATA_DIR=/data (Railway volume) or AGENTBILL_DATA_DIR=./.agentbill"
  );
}

function persist(): void {
  if (!EVENTS_FILE) return;
  writeFile(EVENTS_FILE, JSON.stringify(_events), () => {});
}

function isToday(timestamp: number): boolean {
  const now = new Date();
  const date = new Date(timestamp);
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth() &&
    date.getUTCDate() === now.getUTCDate()
  );
}

export function recordPayment(
  event: Omit<PaymentEvent, "id" | "timestamp">,
): void {
  _events.push({
    ...event,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  });
  if (_events.length > MAX_EVENTS) {
    _events.shift();
  }
  persist();
}

export function getEvents(): PaymentEvent[] {
  return [..._events];
}

export function getStats(): DashboardStats {
  let totalRevenue = 0;
  let todayRevenue = 0;
  let todayTransactions = 0;

  const endpointMap = new Map<string, { count: number; revenue: number }>();
  const payerMap = new Map<string, { count: number; revenue: number }>();

  for (const event of _events) {
    const amount = event.success ? parseFloat(event.amount) || 0 : 0;
    totalRevenue += amount;

    if (isToday(event.timestamp)) {
      todayTransactions++;
      todayRevenue += amount;
    }

    const ep = endpointMap.get(event.endpoint) ?? { count: 0, revenue: 0 };
    ep.count++;
    ep.revenue += amount;
    endpointMap.set(event.endpoint, ep);

    const pa = payerMap.get(event.payer) ?? { count: 0, revenue: 0 };
    pa.count++;
    pa.revenue += amount;
    payerMap.set(event.payer, pa);
  }

  const topEndpoints = [...endpointMap.entries()]
    .map(([endpoint, data]) => ({ endpoint, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  const topPayers = [...payerMap.entries()]
    .map(([payer, data]) => ({ payer, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  return {
    totalRevenue,
    todayRevenue,
    totalTransactions: _events.length,
    todayTransactions,
    recentTransactions: _events.slice(-20).reverse(),
    topEndpoints,
    topPayers,
  };
}

export function clearEvents(): void {
  _events.length = 0;
  persist();
}
