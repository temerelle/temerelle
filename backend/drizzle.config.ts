import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

// Migrations go over the direct connection: Neon's pooler (PgBouncer) can break DDL in a transaction
export default defineConfig({
  schema: './src/database/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL!,
  },
});
