import { createWalletClient, http, publicActions } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { wrapFetchWithPayment, x402Client } from "@x402/fetch";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { CHAINS } from "./networks";
import type { PayingClientConfig, PayingClient } from "./types";

export function createPayingClient(config: PayingClientConfig): PayingClient {
  const chain = CHAINS[config.network];
  if (!chain) {
    throw new Error(
      `Unsupported network: "${config.network}". ` +
        `Supported: ${Object.keys(CHAINS).join(", ")}`,
    );
  }

  const account = privateKeyToAccount(config.privateKey);

  const walletClient = createWalletClient({
    account,
    chain,
    transport: http(config.rpcUrl),
  }).extend(publicActions);

  // WalletClient doesn't expose address at top level — spread it for ClientEvmSigner
  const signer = { ...walletClient, address: account.address };

  const client = new x402Client();
  registerExactEvmScheme(client, { signer });

  const baseFetch = config.baseFetch ?? globalThis.fetch;
  const payingFetch = wrapFetchWithPayment(baseFetch, client);

  return {
    fetch: payingFetch,
    address: account.address,
  };
}
