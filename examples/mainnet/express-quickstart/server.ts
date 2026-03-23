import express from "express";
import { agentBill, requirePayment } from "@agent-bill/middleware";

const app = express();
agentBill.init({
  receivingAddress: process.env.RECEIVING_ADDRESS!,
  network: "base-mainnet",
});

// free route -- no payment required
app.get("/", (req, res) => {
  res.json({ message: "AgentBill quickstart server" });
});

// Paid route -- requires $0.01 USDC
app.get(
  "/api/weather",
  requirePayment({
    amount: "0.01",
    currency: "USDC",
    description: "Weather data",
  }),
  (req, res) => {
    res.json({ city: "New York", temp: "72°F", humidity: "60%" });
  },
);
app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
