import type { CorsOptions } from "cors";

/** Origins a Capacitor iOS WebView uses, plus local dev. */
export const NATIVE_ORIGINS = ["capacitor://localhost", "ionic://localhost", "http://localhost", "https://localhost"];

export function allowedOrigins(env: NodeJS.ProcessEnv = process.env): string[] {
  const extra = [env.WEB_ORIGIN, ...(env.CORS_ORIGINS ?? "").split(",")]
    .map((o) => (o ?? "").trim().replace(/\/+$/, ""))
    .filter(Boolean);
  return Array.from(new Set([...NATIVE_ORIGINS, ...extra]));
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
