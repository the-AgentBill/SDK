import { base, baseSepolia } from "viem/chains";
import type { Chain } from "viem";
import type { NetworkName } from "./types";

export const CHAINS: Record<NetworkName, Chain> = {
  "base-mainnet": base,
  "base-sepolia": baseSepolia,
};
