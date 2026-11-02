import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { lt, sql } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { rateLimits } from '../database/schema';
import { apiError } from '../common/api-error';

// Fixed window in Postgres: one upsert per hit, atomic under concurrency, no Redis.
// The database clock decides the window, so all serverless instances agree
@Injectable()
export class RateLimitService {
  constructor(private readonly database: DatabaseService) {}

  async hit(key: string, [limit, windowSeconds]: readonly [number, number]) {
    const [row] = await this.database.db
      .insert(rateLimits)
      .values({ key, windowStart: sql`now()`, count: 1 })
      .onConflictDoUpdate({
        target: rateLimits.key,
        set: {
          count: sql`CASE WHEN ${rateLimits.windowStart} <= now() - make_interval(secs => ${windowSeconds})
            THEN 1 ELSE ${rateLimits.count} + 1 END`,
          windowStart: sql`CASE WHEN ${rateLimits.windowStart} <= now() - make_interval(secs => ${windowSeconds})
            THEN now() ELSE ${rateLimits.windowStart} END`,
        },
      })
      .returning({ count: rateLimits.count });
    if (row.count > limit) throw new HttpException(apiError('TOO_MANY_ATTEMPTS'), HttpStatus.TOO_MANY_REQUESTS);
  }

  // Runs on sign-in so the table doesn't grow forever; every window is shorter than a day
  async prune() {
    await this.database.db.delete(rateLimits).where(lt(rateLimits.windowStart, sql`now() - interval '1 day'`));
  }
}
