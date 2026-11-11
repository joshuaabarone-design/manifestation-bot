// Test-only environment. These are dummy values, not credentials.
process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";
process.env.JWT_SECRET = "test-only-jwt-secret-0123456789abcdef0123456789";
process.env.SESSION_SECRET ??= "test-only-session-secret-0123456789abcdef";
process.env.AI_INTEGRATIONS_OPENAI_API_KEY ??= "test-key";
process.env.AI_INTEGRATIONS_OPENAI_BASE_URL ??= "http://127.0.0.1:9/v1";
process.env.NODE_ENV = "test";
