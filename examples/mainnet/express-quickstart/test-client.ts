import { createPayingClient } from "@agent-bill/client";
import dotenv from "dotenv";
dotenv.config();

const DEMO_URL = "https://agent-billmiddleware-production.up.railway.app";

async function main() {
  const privateKey = process.env.CLIENT_PRIVATE_KEY as `0x${string}`;
  if (!privateKey) throw new Error("CLIENT_PRIVATE_KEY is required in .env");

  const client = createPayingClient({
    privateKey,
    network: "base-mainnet",
  });

  console.log(`Calling ${DEMO_URL}/api/weather as ${client.address}...`);

  const response = await client.fetch(`${DEMO_URL}/api/weather`);

  console.log("Status:", response.status);

  if (response.status === 402) {
    const paymentRequired = response.headers.get("PAYMENT-REQUIRED");
    if (paymentRequired) {
      const decoded = JSON.parse(
        Buffer.from(paymentRequired, "base64").toString("utf8"),
      );
      console.log("Payment error:", decoded.error);
    }
  } else {
    console.log("Body:", await response.json());
  }
}

main().catch(console.error);
