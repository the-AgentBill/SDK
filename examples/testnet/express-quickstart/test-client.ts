import { createPayingClient } from "@agent-bill/sdk";

async function main() {
  const privateKey = process.env.CLIENT_PRIVATE_KEY as `0x${string}`;
  if (!privateKey) throw new Error("CLIENT_PRIVATE_KEY is required in .env");

  const client = createPayingClient({
    privateKey,
    network: "base-sepolia",
  });

  console.log(`Calling http://localhost:3000/api/weather as ${client.address}...`);

  const response = await client.fetch("http://localhost:3000/api/weather");

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
