import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, ilike, like, or, sql } from 'drizzle-orm';
import { IANAZone } from 'luxon';
import { DatabaseService } from '../database/database.service';
import { businesses, resources } from '../database/schema';
import { apiError } from '../common/api-error';
import { BusinessAccessService, type Business } from './business-access.service';
import { codeFromName, firstFreeCode } from './business-code';
import type { CreateBusinessDto, UpdateBusinessDto } from './dto/business.dto';

export const SEARCH_PAGE_SIZE = 20;
const UNIQUE_VIOLATION = '23505';
const pgCode = (err: unknown) =>
  (err as { cause?: { code?: string }; code?: string }).cause?.code ?? (err as { code?: string }).code;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// What anyone may see: no owner, no flags
export const publicView = (b: Business) => ({
  id: b.id,
  name: b.name,
  code: b.code,
  description: b.description,
  timezone: b.timezone,
});

export const ownerView = (b: Business) => ({ ...publicView(b), isActive: b.isActive, createdAt: b.createdAt });

// LIKE wildcards in what people type are matched literally
const escapeLike = (text: string) => text.replace(/[\\%_]/g, (ch) => `\\${ch}`);

@Injectable()
export class BusinessesService {
  constructor(
    private readonly database: DatabaseService,
    private readonly access: BusinessAccessService,
  ) {}

  private get db() {
    return this.database.db;
  }

  // Active businesses by part of the name or of the code; an exact code comes first
  async search(query: string | undefined, page = 1) {
    const q = query?.trim().toLowerCase() ?? '';
    if (q.length < 2) return { items: [], page, pageSize: SEARCH_PAGE_SIZE };
    const text = escapeLike(q);
    const rows = await this.db
      .select()
      .from(businesses)
      .where(
        and(eq(businesses.isActive, true), or(ilike(businesses.name, `%${text}%`), like(businesses.code, `%${text}%`))),
      )
      .orderBy(desc(sql`${businesses.code} = ${q}`), asc(businesses.name))
      .limit(SEARCH_PAGE_SIZE)
      .offset((page - 1) * SEARCH_PAGE_SIZE);
    return { items: rows.map(publicView), page, pageSize: SEARCH_PAGE_SIZE };
  }

  // By id or by code (the shared link /b/<code>)
  async profile(idOrCode: string, userId: string | undefined) {
    const [row] = await this.db
      .select({ id: businesses.id })
      .from(businesses)
      .where(UUID.test(idOrCode) ? eq(businesses.id, idOrCode) : eq(businesses.code, idOrCode.toLowerCase()))
      .limit(1);
    if (!row) throw new NotFoundException(apiError('BUSINESS_NOT_FOUND'));
    return publicView(await this.access.visible(row.id, userId));
  }

  async mine(userId: string) {
    const rows = await this.db
      .select()
      .from(businesses)
      .where(eq(businesses.ownerId, userId))
      .orderBy(asc(businesses.createdAt));
    return rows.map(ownerView);
  }

  // The business and its default resource in one transaction: a business never exists without one
  async create(userId: string, dto: CreateBusinessDto) {
    for (let attempt = 0; ; attempt++) {
      const code = dto.code ?? (await this.freeCode(codeFromName(dto.name)));
      try {
        const business = await this.db.transaction(async (tx) => {
          const [created] = await tx
            .insert(businesses)
            .values({ ownerId: userId, name: dto.name, description: dto.description ?? '', code })
            .returning();
          await tx.insert(resources).values({ businessId: created.id, name: dto.name, isDefault: true });
          return created;
        });
        return ownerView(business);
      } catch (err) {
        if (pgCode(err) !== UNIQUE_VIOLATION) throw err;
        // A code the owner chose is theirs to change; a generated one lost a race, so try the next free one
        if (dto.code || attempt >= 2) throw new ConflictException(apiError('CODE_TAKEN'));
      }
    }
  }

  async update(userId: string, businessId: string, dto: UpdateBusinessDto) {
    await this.access.owned(userId, businessId);
    if (dto.timezone !== undefined && !IANAZone.isValidZone(dto.timezone))
      throw new BadRequestException(apiError('INVALID_TIMEZONE'));
    const changes = Object.fromEntries(Object.entries(dto).filter(([, value]) => value !== undefined));
    if (Object.keys(changes).length === 0) return ownerView(await this.access.owned(userId, businessId));
    try {
      const [business] = await this.db.update(businesses).set(changes).where(eq(businesses.id, businessId)).returning();
      return ownerView(business);
    } catch (err) {
      if (pgCode(err) === UNIQUE_VIOLATION) throw new ConflictException(apiError('CODE_TAKEN'));
      throw err;
    }
  }

  private async freeCode(base: string) {
    const taken = await this.db
      .select({ code: businesses.code })
      .from(businesses)
      .where(or(eq(businesses.code, base), like(businesses.code, `${escapeLike(base.slice(0, 28))}-%`)));
    return firstFreeCode(
      base,
      taken.map((row) => row.code),
    );
  }
}
