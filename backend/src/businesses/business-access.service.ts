import { Injectable, NotFoundException } from '@nestjs/common';
import { and, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { businesses, resources } from '../database/schema';
import { apiError } from '../common/api-error';

export type Business = typeof businesses.$inferSelect;

const notFound = () => new NotFoundException(apiError('BUSINESS_NOT_FOUND'));

// Tenant checks in one place. Someone else's business answers 404, the same as a missing one, so ids can't be probed
@Injectable()
export class BusinessAccessService {
  constructor(private readonly database: DatabaseService) {}

  async owned(userId: string, businessId: string): Promise<Business> {
    const [business] = await this.database.db
      .select()
      .from(businesses)
      .where(and(eq(businesses.id, businessId), eq(businesses.ownerId, userId)))
      .limit(1);
    if (!business) throw notFound();
    return business;
  }

  // Public reads: an active business, or an inactive one to its own owner (to preview it)
  async visible(businessId: string, userId: string | undefined): Promise<Business> {
    const [business] = await this.database.db.select().from(businesses).where(eq(businesses.id, businessId)).limit(1);
    if (!business || (!business.isActive && business.ownerId !== userId)) throw notFound();
    return business;
  }

  // MVP: every schedule and booking goes to the business's one default resource, never chosen by a client
  async defaultResourceId(businessId: string): Promise<string> {
    const [resource] = await this.database.db
      .select({ id: resources.id })
      .from(resources)
      .where(and(eq(resources.businessId, businessId), eq(resources.isDefault, true)))
      .limit(1);
    // Created with the business in one transaction, so missing means a broken database
    if (!resource) throw new Error(`Business ${businessId} has no default resource`);
    return resource.id;
  }
}
