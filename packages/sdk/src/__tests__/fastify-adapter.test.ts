import { describe, it, expect, vi } from "vitest";
import { FastifyAdapter } from "../fastify/adapter";

function mockRequest(
  url: string,
  method = "GET",
  headers: Record<string, string> = {},
  query: Record<string, string | string[]> = {},
  body?: unknown,
) {
  return {
    url,
    method,
    protocol: "https",
    hostname: "example.com",
    headers: Object.fromEntries(
      Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]),
    ),
    query,
    body,
  } as any;
}

describe("FastifyAdapter", () => {
  it("getHeader returns header value", () => {
    const adapter = new FastifyAdapter(
      mockRequest("/", "GET", { authorization: "Bearer abc" }),
    );
    expect(adapter.getHeader("authorization")).toBe("Bearer abc");
  });

  it("getHeader returns undefined for missing header", () => {
    const adapter = new FastifyAdapter(mockRequest("/"));
    expect(adapter.getHeader("authorization")).toBeUndefined();
  });

  it("getHeader returns first value for array headers", () => {
    const req = mockRequest("/");
    req.headers["x-custom"] = ["first", "second"];
    const adapter = new FastifyAdapter(req);
    expect(adapter.getHeader("x-custom")).toBe("first");
  });

  it("getMethod returns HTTP method", () => {
    const adapter = new FastifyAdapter(mockRequest("/", "POST"));
    expect(adapter.getMethod()).toBe("POST");
  });

  it("getPath extracts pathname without query string", () => {
    const adapter = new FastifyAdapter(mockRequest("/api/data?q=1"));
    expect(adapter.getPath()).toBe("/api/data");
  });

  it("getUrl returns full URL", () => {
    const adapter = new FastifyAdapter(mockRequest("/api/data?q=1"));
    expect(adapter.getUrl()).toBe("https://example.com/api/data?q=1");
  });

  it("getAcceptHeader returns accept header", () => {
    const adapter = new FastifyAdapter(
      mockRequest("/", "GET", { accept: "application/json" }),
    );
    expect(adapter.getAcceptHeader()).toBe("application/json");
  });

  it("getAcceptHeader returns empty string when absent", () => {
    const adapter = new FastifyAdapter(mockRequest("/"));
    expect(adapter.getAcceptHeader()).toBe("");
  });

  it("getUserAgent returns user-agent header", () => {
    const adapter = new FastifyAdapter(
      mockRequest("/", "GET", { "user-agent": "TestBot/1.0" }),
    );
    expect(adapter.getUserAgent()).toBe("TestBot/1.0");
  });

  it("getUserAgent returns empty string when absent", () => {
    const adapter = new FastifyAdapter(mockRequest("/"));
    expect(adapter.getUserAgent()).toBe("");
  });

  it("getQueryParams returns query object", () => {
    const adapter = new FastifyAdapter(
      mockRequest("/", "GET", {}, { a: "1", b: "2" }),
    );
    expect(adapter.getQueryParams()).toEqual({ a: "1", b: "2" });
  });

  it("getQueryParam returns single value", () => {
    const adapter = new FastifyAdapter(
      mockRequest("/", "GET", {}, { a: "1" }),
    );
    expect(adapter.getQueryParam("a")).toBe("1");
  });

  it("getQueryParam returns undefined for missing param", () => {
    const adapter = new FastifyAdapter(mockRequest("/", "GET", {}, {}));
    expect(adapter.getQueryParam("missing")).toBeUndefined();
  });

  it("getBody returns request body", () => {
    const adapter = new FastifyAdapter(
      mockRequest("/", "POST", {}, {}, { foo: "bar" }),
    );
    expect(adapter.getBody()).toEqual({ foo: "bar" });
  });
});
