import { describe, it, expect } from "vitest";
import { allowedOrigins } from "../server/cors";

describe("CORS allow-list", () => {
  it("always allows the Capacitor iOS origin", () => {
    expect(allowedOrigins({ NODE_ENV: "production" } as any)).toContain("capacitor://localhost");
  });
  it("adds the web origin and extra origins, without trailing slashes", () => {
    const list = allowedOrigins({ NODE_ENV: "production", WEB_ORIGIN: "https://app.example.com/", CORS_ORIGINS: "https://a.example.com, https://b.example.com" } as any);
    expect(list).toEqual(expect.arrayContaining(["https://app.example.com", "https://a.example.com", "https://b.example.com"]));
  });
  it("never allows localhost dev servers, wildcards or null in production", () => {
    const list = allowedOrigins({ NODE_ENV: "production", CORS_ORIGINS: "*,null,http://localhost:5173" } as any);
    expect(list).not.toContain("*");
    expect(list).not.toContain("null");
    expect(list).not.toContain("http://localhost");
    expect(list).toContain("http://localhost:5173"); // explicitly configured by the operator
  });
  it("allows local dev origins outside production", () => {
    expect(allowedOrigins({ NODE_ENV: "development" } as any)).toContain("http://localhost:5173");
  });
});
