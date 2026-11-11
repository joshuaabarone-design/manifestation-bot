// In-memory Postgres (PGlite) with the real Drizzle schema pushed, used in place of server/db.
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "@shared/schema";

export async function createTestDb() {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  const { pushSchema } = await import("drizzle-kit/api");
  const { apply } = await pushSchema(schema as any, db as any);
  await apply();
  return { client, db, pool: { end: async () => client.close() } };
}
