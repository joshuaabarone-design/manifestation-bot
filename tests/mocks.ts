// Shared mock factories (imported inside vi.mock factories).
export async function testDbModule() {
  const { createTestDb } = await import("./helpers/db");
  return createTestDb();
}
export async function memorySessionStore() {
  const session = (await import("express-session")).default;
  return { default: () => session.MemoryStore };
}
