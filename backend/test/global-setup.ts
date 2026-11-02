import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { TEST_DATABASE_URL } from './env';

// A clean schema per run, built by the same migrations as production
export default async function globalSetup() {
  const pool = new Pool({ connectionString: TEST_DATABASE_URL });
  try {
    await pool.query(
      'DROP SCHEMA IF EXISTS public CASCADE; DROP SCHEMA IF EXISTS drizzle CASCADE; CREATE SCHEMA public',
    );
    await migrate(drizzle({ client: pool }), { migrationsFolder: `${__dirname}/../drizzle` });
  } finally {
    await pool.end();
  }
}
