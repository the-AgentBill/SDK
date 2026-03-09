import { createWalletClient, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";

async function main() {
  const privateKey = process.env.CLIENT_PRIVATE_KEY as `0x${string}`;
  if (!privateKey) throw new Error("CLIENT_PRIVATE_KEY is required in .env");

  const account = privateKeyToAccount(privateKey);

  // WalletClient + publicActions gives us signTypedData + readContract.
  // Spread account.address to satisfy ClientEvmSigner's `address` field.
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(),
  }).extend(publicActions);
  const signer = { ...walletClient, address: account.address };

  // Set up x402 client with EVM exact payment scheme
  const client = new x402Client();
  registerExactEvmScheme(client, { signer });

  // Intercept fetch to log the second (payment) request
  const loggingFetch: typeof fetch = async (input, init) => {
    const req = new Request(input, init);
    const hasPayment = req.headers.has("payment-signature");
    if (hasPayment) {
      console.log("→ Sending payment request with PAYMENT-SIGNATURE header");
    }
    const res = await fetch(req);
    if (hasPayment) {
      console.log("← Response status:", res.status);
      console.log("← Response headers:");
      res.headers.forEach((value, key) => console.log(`   ${key}: ${key === "payment-required" ? JSON.parse(Buffer.from(value, "base64").toString()) : value}`));
    }
    return res;
  };

  // Wrap fetch so it auto-handles 402 → pay → retry
  const fetchWithPayment = wrapFetchWithPayment(loggingFetch, client);

  console.log(`Calling http://localhost:3000/api/weather as ${account.address}...`);

  const response = await fetchWithPayment("http://localhost:3000/api/weather");

  console.log("Status:", response.status);

  if (response.status === 402) {
    const paymentRequired = response.headers.get("PAYMENT-REQUIRED");
    if (paymentRequired) {
      const decoded = JSON.parse(Buffer.from(paymentRequired, "base64").toString("utf8"));
      console.log("Payment error:", decoded.error);
    }
  } else {
    console.log("Body:", await response.json());
  }
}

main().catch(console.error);
