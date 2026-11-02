import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

// node-postgres works with Neon (pooled URL) and a plain local Postgres alike, so integration tests use the real driver
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  // Without a timeout a request waits forever for a database that is down
  private readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    connectionTimeoutMillis: 5_000,
  });
  readonly db = drizzle({ client: this.pool, schema });

  constructor() {
    // An idle client losing its connection (restart, Neon autosuspend) emits 'error'; unhandled, it kills the process
    this.pool.on('error', (err) => this.logger.error('Idle database client error', err));
  }

  async ping() {
    await this.pool.query('SELECT 1');
  }

  async onModuleDestroy() {
    await this.pool.end();
  }
}
