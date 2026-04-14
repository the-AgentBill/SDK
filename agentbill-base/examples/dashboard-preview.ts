import express from "express";
import { createDashboard, recordPayment } from "../packages/sdk/src/dashboard";

const app = express();

// Seed some testing payment events
const endpoints = ["/api/weather", "/api/translate", "/api/summarize"];
const payers = ["0xABC1", "0xDEF2", "0x789A", "0xBBB3"];
for (let i = 0; i < 30; i++) {
  recordPayment({
    endpoint: endpoints[i % endpoints.length],
    method: "GET",
    amount: (Math.random() * 2).toFixed(2),
    currency: "USDC",
    payer: payers[i % payers.length],
    success: Math.random() > 0.1,
    network: "base-sepolia",
  });
}

app.use(createDashboard());

app.listen(3001, () => {
  console.log("Dashboard preview: http://localhost:3001/dashboard");
});
