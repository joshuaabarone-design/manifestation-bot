import type { CorsOptions } from "cors";

/** Origins a Capacitor iOS WebView uses. */
export const NATIVE_ORIGINS = ["capacitor://localhost", "ionic://localhost"];
/** Local dev servers; never allowed in production, where any local page could otherwise call the API. */
export const DEV_ORIGINS = ["http://localhost", "https://localhost", "http://localhost:5000", "http://localhost:5173"];

export function allowedOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const extra = [env.WEB_ORIGIN, ...(env.CORS_ORIGINS ?? "").split(",")]
    .map((o) => (o ?? "").trim().replace(/\/+$/, ""))
    // Never allow wildcards or the opaque "null" origin with credentials.
    .filter((o) => !!o && o !== "*" && o !== "null" && /^[a-z][a-z0-9+.-]*:\/\/[^/\s*]+$/i.test(o));
  const dev = env.NODE_ENV === "production" ? [] : DEV_ORIGINS;
  return Array.from(new Set([...NATIVE_ORIGINS, ...dev, ...extra]));
}

export function corsOptions(env: NodeJS.ProcessEnv = process.env): CorsOptions {
  const allow = allowedOrigins(env);
  return {
    origin(origin, cb) {
      // No Origin header: same-origin navigation, curl, Twilio webhooks. CORS does not apply.
      if (!origin) return cb(null, true);
      cb(null, allow.includes(origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Authorization", "Content-Type", "X-Auth-Mode", "Idempotency-Key"],
    maxAge: 600,
  };
}
