import { describe, it, expect, vi } from "vitest";
import { HonoAdapter } from "../hono/adapter";

function mockContext(
  url: string,
  method = "GET",
  headers: Record<string, string> = {},
) {
  return {
    req: {
      url,
      method,
      header: (name: string) => headers[name.toLowerCase()],
      json: vi.fn(),
    },
  } as any;
}

describe("HonoAdapter", () => {
  it("getHeader returns header value", () => {
    const adapter = new HonoAdapter(
      mockContext("https://example.com", "GET", { authorization: "Bearer abc" }),
    );
    expect(adapter.getHeader("authorization")).toBe("Bearer abc");
  });

  it("getHeader returns undefined for missing header", () => {
    const adapter = new HonoAdapter(mockContext("https://example.com"));
    expect(adapter.getHeader("authorization")).toBeUndefined();
  });

  it("getMethod returns HTTP method", () => {
    const adapter = new HonoAdapter(mockContext("https://example.com", "POST"));
    expect(adapter.getMethod()).toBe("POST");
  });

  it("getPath extracts pathname from full URL", () => {
    const adapter = new HonoAdapter(
      mockContext("https://example.com/api/data?q=1"),
    );
    expect(adapter.getPath()).toBe("/api/data");
  });

  it("getUrl returns full URL", () => {
    const adapter = new HonoAdapter(
      mockContext("https://example.com/api/data?q=1"),
    );
    expect(adapter.getUrl()).toBe("https://example.com/api/data?q=1");
  });

  it("getAcceptHeader returns accept header", () => {
    const adapter = new HonoAdapter(
      mockContext("https://example.com", "GET", { accept: "application/json" }),
    );
    expect(adapter.getAcceptHeader()).toBe("application/json");
  });

  it("getAcceptHeader returns empty string when absent", () => {
    const adapter = new HonoAdapter(mockContext("https://example.com"));
    expect(adapter.getAcceptHeader()).toBe("");
  });

  it("getUserAgent returns user-agent header", () => {
    const adapter = new HonoAdapter(
      mockContext("https://example.com", "GET", { "user-agent": "TestBot/1.0" }),
    );
    expect(adapter.getUserAgent()).toBe("TestBot/1.0");
  });

  it("getUserAgent returns empty string when absent", () => {
    const adapter = new HonoAdapter(mockContext("https://example.com"));
    expect(adapter.getUserAgent()).toBe("");
  });

  it("getQueryParams parses single-value params", () => {
    const adapter = new HonoAdapter(
      mockContext("https://example.com?a=1&b=2"),
    );
    expect(adapter.getQueryParams()).toEqual({ a: "1", b: "2" });
  });

  it("getQueryParams parses multi-value params", () => {
    const adapter = new HonoAdapter(
      mockContext("https://example.com?tag=a&tag=b"),
    );
    expect(adapter.getQueryParams()).toEqual({ tag: ["a", "b"] });
  });

  it("getQueryParam returns single value", () => {
    const adapter = new HonoAdapter(
      mockContext("https://example.com?a=1"),
    );
    expect(adapter.getQueryParam("a")).toBe("1");
  });

  it("getQueryParam returns array for multiple values", () => {
    const adapter = new HonoAdapter(
      mockContext("https://example.com?tag=a&tag=b"),
    );
    expect(adapter.getQueryParam("tag")).toEqual(["a", "b"]);
  });

  it("getQueryParam returns undefined for missing param", () => {
    const adapter = new HonoAdapter(mockContext("https://example.com"));
    expect(adapter.getQueryParam("missing")).toBeUndefined();
  });

  it("getBody returns parsed JSON", async () => {
    const ctx = mockContext("https://example.com", "POST");
    ctx.req.json.mockResolvedValue({ foo: "bar" });
    const adapter = new HonoAdapter(ctx);
    expect(await adapter.getBody()).toEqual({ foo: "bar" });
  });

  it("getBody returns undefined on parse error", async () => {
    const ctx = mockContext("https://example.com", "POST");
    ctx.req.json.mockRejectedValue(new Error("invalid json"));
    const adapter = new HonoAdapter(ctx);
    expect(await adapter.getBody()).toBeUndefined();
  });
});
