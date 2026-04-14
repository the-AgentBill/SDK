import type { Request } from "express";
import type { HTTPAdapter } from "@x402/core/server";

export class ExpressAdapter implements HTTPAdapter {
  constructor(private request: Request) {}

  getHeader(name: string): string | undefined {
    const value = this.request.headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  }

  getMethod(): string {
    return this.request.method;
  }

  getPath(): string {
    return this.request.path;
  }

  getUrl(): string {
    return `${this.request.protocol}://${this.request.get("host")}${this.request.originalUrl}`;
  }

  getAcceptHeader(): string {
    return this.getHeader("accept") ?? "";
  }

  getUserAgent(): string {
    return this.getHeader("user-agent") ?? "";
  }

  getQueryParams(): Record<string, string | string[]> {
    return (this.request.query as Record<string, string | string[]>) ?? {};
  }

  getQueryParam(name: string): string | string[] | undefined {
    return this.getQueryParams()[name];
  }

  getBody(): unknown {
    return this.request.body;
  }
}
