// Guards the "remove nothing" rule: every API route in docs/ios/feature-inventory.md must still be
// registered by the real server (same method + path). Health checks live in server/index.ts.
import { describe, it, expect, vi, beforeAll } from "vitest";
import { readFileSync } from "fs";
import path from "path";

vi.mock("../server/db", async () => (await import("./mocks")).testDbModule());
vi.mock("connect-pg-simple", async () => (await import("./mocks")).memorySessionStore());

import { buildApp } from "./helpers/app";

function registered(app: any): Set<string> {
  const out = new Set<string>();
  for (const layer of app._router.stack) {
    if (layer.route) for (const m of Object.keys(layer.route.methods)) out.add(`${m.toUpperCase()} ${layer.route.path}`);
  }
  return out;
}

describe("feature inventory", () => {
  let routes: Set<string>;
  beforeAll(async () => { routes = registered(await buildApp()); });

  const md = readFileSync(path.resolve(__dirname, "../docs/ios/feature-inventory.md"), "utf8");
  const rows = [...md.matchAll(/^\|\s*\[[^\]]*\]\s*\|\s*(GET|POST|PUT|PATCH|DELETE)\s*\|\s*`([^`]+)`/gm)]
    .map((m) => [m[1], m[2]] as const)
    .filter(([, p]) => !["/health", "/_health"].includes(p));

  it("parses the inventory", () => expect(rows.length).toBeGreaterThanOrEqual(50));

  it.each(rows)("%s %s is still registered", (method, p) => {
    expect(routes.has(`${method} ${p}`)).toBe(true);
  });

  it("health checks are still served by server/index.ts", () => {
    const src = readFileSync(path.resolve(__dirname, "../server/index.ts"), "utf8");
    expect(src).toMatch(/["']\/health["']/);
    expect(src).toMatch(/["']\/_health["']/);
  });
});
