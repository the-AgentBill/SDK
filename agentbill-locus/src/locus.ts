/**
 * Locus API client (beta environment).
 *
 * Used by the server to call Locus Wrapped Anthropic after AgentBill
 * verifies payment, and by the agent to check its wallet balance.
 *
 * The agent's actual payment is handled by Locus's x402 proxy
 * (POST /api/x402/call) — not this client.
 */

export const LOCUS_BASE_URL = "https://beta-api.paywithlocus.com/api";

export interface LocusBalance {
  balance: string;
  walletAddress: string;
  network: string;
}

export interface AnthropicContent {
  type: "text";
  text: string;
}

export interface AnthropicResponse {
  id: string;
  content: AnthropicContent[];
  model: string;
  stop_reason: string;
  usage: { input_tokens: number; output_tokens: number };
}

export class LocusClient {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl = LOCUS_BASE_URL
  ) {}

  private async req<T>(method: string, path: string, body?: object): Promise<T> {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: body != null ? JSON.stringify(body) : undefined,
    });

    const json: { success: boolean; data?: T; error?: string; message?: string } =
      await res.json();

    if (!json.success) {
      throw new Error(
        `Locus ${method} ${path} → ${json.error ?? json.message ?? res.status}`
      );
    }

    return json.data as T;
  }

  /** Get USDC balance and wallet address for this API key. */
  async getBalance(): Promise<LocusBalance> {
    return this.req<LocusBalance>("GET", "/pay/balance");
  }

  /**
   * Generate a response using Claude via Locus Wrapped Anthropic.
   * Cost is billed per-call from the Locus wallet (no separate API key needed).
   */
  async chat(opts: {
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    system?: string;
    model?: string;
    max_tokens?: number;
  }): Promise<AnthropicResponse> {
    return this.req<AnthropicResponse>("POST", "/wrapped/anthropic/chat", {
      model: opts.model ?? "claude-haiku-4-5",
      messages: opts.messages,
      system: opts.system,
      max_tokens: opts.max_tokens ?? 1024,
    });
  }
}
