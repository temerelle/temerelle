import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { and, asc, eq } from 'drizzle-orm';
import { DatabaseService } from '../database/database.service';
import { services } from '../database/schema';
import { apiError } from '../common/api-error';
import { BusinessAccessService } from '../businesses/business-access.service';
import type { CreateServiceDto, UpdateServiceDto } from './dto/service.dto';

type Service = typeof services.$inferSelect;

const view = (s: Service) => ({
  id: s.id,
  name: s.name,
  durationMinutes: s.durationMinutes,
  priceMinor: s.priceMinor,
  currency: s.currency,
  isActive: s.isActive,
});

// Services are never deleted, only switched off: bookings keep snapshots, and the row stays for history
@Injectable()
export class ServicesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly access: BusinessAccessService,
  ) {}

  async list(businessId: string, userId: string | undefined, includeInactive = false) {
    if (includeInactive) {
      // 401 rather than a quietly shorter list: the client refreshes its session and asks again
      if (!userId) throw new UnauthorizedException();
      await this.access.owned(userId, businessId);
    } else {
      await this.access.visible(businessId, userId);
    }
    const rows = await this.database.db
      .select()
      .from(services)
      .where(and(eq(services.businessId, businessId), includeInactive ? undefined : eq(services.isActive, true)))
      .orderBy(asc(services.createdAt));
    return { items: rows.map(view) };
  }

  async create(userId: string, businessId: string, dto: CreateServiceDto) {
    await this.access.owned(userId, businessId);
    const [service] = await this.database.db
      .insert(services)
      .values({ businessId, name: dto.name, durationMinutes: dto.durationMinutes, priceMinor: dto.priceMinor })
      .returning();
    return view(service);
  }

  async update(userId: string, businessId: string, serviceId: string, dto: UpdateServiceDto) {
    await this.access.owned(userId, businessId);
    const changes = Object.fromEntries(Object.entries(dto).filter(([, value]) => value !== undefined));
    const where = and(eq(services.id, serviceId), eq(services.businessId, businessId));
    const [service] = Object.keys(changes).length
      ? await this.database.db.update(services).set(changes).where(where).returning()
      : await this.database.db.select().from(services).where(where).limit(1);
    if (!service) throw new NotFoundException(apiError('SERVICE_NOT_FOUND'));
    return view(service);
  }
}
