import type { FastifyRequest } from "fastify";
import type { HTTPAdapter } from "@x402/core/server";

export class FastifyAdapter implements HTTPAdapter {
  constructor(private request: FastifyRequest) {}

  getHeader(name: string): string | undefined {
    const value = this.request.headers[name.toLowerCase()];
    return Array.isArray(value) ? value[0] : value;
  }

  getMethod(): string {
    return this.request.method;
  }

  getPath(): string {
    return this.request.url.split("?")[0];
  }

  getUrl(): string {
    return `${this.request.protocol}://${this.request.hostname}${this.request.url}`;
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
