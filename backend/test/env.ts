// Integration tests run against a real PostgreSQL: docker compose up -d, database temerelle_test (README)
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://temerelle:temerelle@localhost:5432/temerelle_test';

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.JWT_SECRET = 'integration-test-secret-at-least-32-characters';
