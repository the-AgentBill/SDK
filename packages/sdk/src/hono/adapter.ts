import type { Context } from "hono";
import type { HTTPAdapter } from "@x402/core/server";

/**
 * Hono adapter for x402 HTTPAdapter interface.
 * Extracts request info from a Hono Context object.
 */
export class HonoAdapter implements HTTPAdapter {
  private ctx: Context;

  constructor(ctx: Context) {
    this.ctx = ctx;
  }

  getHeader(name: string): string | undefined {
    return this.ctx.req.header(name);
  }

  getMethod(): string {
    return this.ctx.req.method;
  }

  getPath(): string {
    return new URL(this.ctx.req.url).pathname;
  }

  getUrl(): string {
    return this.ctx.req.url;
  }

  getAcceptHeader(): string {
    return this.ctx.req.header("accept") ?? "";
  }

  getUserAgent(): string {
    return this.ctx.req.header("user-agent") ?? "";
  }

  getQueryParams(): Record<string, string | string[]> {
    const url = new URL(this.ctx.req.url);
    const params: Record<string, string | string[]> = {};
    url.searchParams.forEach((value, key) => {
      const existing = params[key];
      if (existing) {
        params[key] = Array.isArray(existing)
          ? [...existing, value]
          : [existing, value];
      } else {
        params[key] = value;
      }
    });
    return params;
  }

  getQueryParam(name: string): string | string[] | undefined {
    const url = new URL(this.ctx.req.url);
    const values = url.searchParams.getAll(name);
    if (values.length === 0) return undefined;
    if (values.length === 1) return values[0];
    return values;
  }

  async getBody(): Promise<unknown> {
    try {
      return await this.ctx.req.json();
    } catch {
      return undefined;
    }
  }
}
