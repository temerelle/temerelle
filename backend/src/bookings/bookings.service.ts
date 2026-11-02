import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, desc, eq, gt, gte, inArray, lt, lte, type SQL } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { DatabaseService } from '../database/database.service';
import { bookings, businesses, scheduleExceptions, services, users, workingHours } from '../database/schema';
import { ClockService } from '../clock/clock.service';
import { apiError } from '../common/api-error';
import { BusinessAccessService, type Business } from '../businesses/business-access.service';
import { fromDbTime } from '../schedule/rules';
import { freeSlots, hoursOfDate, momentOf } from './availability';
import type { CreateBookingDto, CreateManualBookingDto, OwnerBookingsQuery } from './dto/booking.dto';

type Booking = typeof bookings.$inferSelect;

// The btree_gist EXCLUDE constraint bookings_no_active_overlap: someone took the time first
const EXCLUSION_VIOLATION = '23P01';
const pgCode = (err: unknown) =>
  (err as { cause?: { code?: string }; code?: string }).cause?.code ?? (err as { code?: string }).code;

// pending and confirmed hold their time; cancelled and completed don't
const ACTIVE = ['pending', 'confirmed'] as const;
const OWNER_LIST_LIMIT = 200;
const PAST_LIMIT = 50;

const notFound = () => new NotFoundException(apiError('BOOKING_NOT_FOUND'));
const notChangeable = (message?: string) => new ConflictException(apiError('BOOKING_NOT_CHANGEABLE', message));
const conflict = () => new ConflictException(apiError('BOOKING_CONFLICT'));

const common = (b: Booking) => ({
  id: b.id,
  serviceName: b.serviceNameSnapshot,
  priceMinor: b.priceMinorSnapshot,
  currency: b.currencySnapshot,
  durationMinutes: b.durationMinutesSnapshot,
  startsAt: b.startsAt.toISOString(),
  endsAt: b.endsAt.toISOString(),
  status: b.status,
  cancelledBy: b.cancelledBy,
  cancellationReason: b.cancellationReason,
});

// What the client sees: the business, never other people; canCancel = active and not started yet
const clientView = (b: Booking, business: Pick<Business, 'id' | 'name' | 'code' | 'timezone'>, now: DateTime) => ({
  ...common(b),
  canCancel: ACTIVE.includes(b.status as (typeof ACTIVE)[number]) && b.startsAt > now.toJSDate(),
  business: { id: business.id, name: business.name, code: business.code, timezone: business.timezone },
});

// What the owner sees: who booked; manual = created by the owner for someone without an account.
// canConfirm = pending and not started yet
const ownerView = (b: Booking, now: DateTime) => ({
  ...common(b),
  canConfirm: b.status === 'pending' && b.startsAt > now.toJSDate(),
  clientName: b.clientName,
  clientPhone: b.clientPhone,
  manual: b.clientId === null,
  createdAt: b.createdAt.toISOString(),
});

// The booking engine. Everything is on the business's default resource, resolved here, never sent by a client.
// Prices and durations come from the service row; the client sends only which service and which start
@Injectable()
export class BookingsService {
  constructor(
    private readonly database: DatabaseService,
    private readonly access: BusinessAccessService,
    private readonly clock: ClockService,
  ) {}

  private get db() {
    return this.database.db;
  }

  // Free start times of a date for a service, in the business's zone
  async availability(businessId: string, serviceId: string, date: string, userId: string | undefined) {
    const business = await this.access.visible(businessId, userId);
    const service = await this.activeService(businessId, serviceId);
    const slots = await this.slots(business, service.durationMinutes, date);
    return {
      date,
      timezone: business.timezone,
      slots: slots.map((s) => ({ time: s.time, startsAt: s.startsAt.toUTC().toISO() })),
    };
  }

  // A client's request: pending until the owner decides. The start must be one the availability offers now
  async request(userId: string, dto: CreateBookingDto) {
    const business = await this.access.visible(dto.businessId, undefined);
    const service = await this.activeService(business.id, dto.serviceId);
    const startsAt = DateTime.fromISO(dto.startsAt, { setZone: true });
    const date = startsAt.setZone(business.timezone).toISODate()!;
    const offered = await this.slots(business, service.durationMinutes, date);
    if (!offered.some((s) => s.startsAt.toMillis() === startsAt.toMillis())) throw conflict();

    const [user] = await this.db.select().from(users).where(eq(users.id, userId)).limit(1);
    const booking = await this.insert(business.id, service, startsAt, {
      clientId: userId,
      clientName: user.name,
      clientPhone: user.phone,
      status: 'pending',
    });
    return clientView(booking, business, this.clock.now());
  }

  // The owner books someone who called or came in: confirmed at once, any future time. Working hours are not
  // checked (the owner knows best), overlaps still are
  async createManual(ownerId: string, businessId: string, dto: CreateManualBookingDto) {
    const business = await this.access.owned(ownerId, businessId);
    const service = await this.activeService(businessId, dto.serviceId);
    const startsAt = momentOf(dto.date, dto.time, business.timezone);
    // null: a time the clock skips (spring forward)
    if (!startsAt || startsAt <= this.clock.now()) throw notChangeable('The time has passed or does not exist');
    const booking = await this.insert(businessId, service, startsAt, {
      clientId: null,
      clientName: dto.clientName,
      clientPhone: dto.clientPhone ?? null,
      status: 'confirmed',
    });
    return ownerView(booking, this.clock.now());
  }

  // The client's bookings: upcoming soonest first, then recent past
  async my(userId: string) {
    const clockNow = this.clock.now();
    const now = clockNow.toJSDate();
    const select = () =>
      this.db
        .select({ booking: bookings, business: businesses })
        .from(bookings)
        .innerJoin(businesses, eq(bookings.businessId, businesses.id));
    const [upcoming, past] = await Promise.all([
      select()
        .where(and(eq(bookings.clientId, userId), gt(bookings.endsAt, now)))
        .orderBy(asc(bookings.startsAt)),
      select()
        .where(and(eq(bookings.clientId, userId), lte(bookings.endsAt, now)))
        .orderBy(desc(bookings.startsAt))
        .limit(PAST_LIMIT),
    ]);
    return {
      upcoming: upcoming.map((r) => clientView(r.booking, r.business, clockNow)),
      past: past.map((r) => clientView(r.booking, r.business, clockNow)),
    };
  }

  // The owner's list: a date range in the business's zone (default from today on), optionally one status
  async forOwner(ownerId: string, businessId: string, query: OwnerBookingsQuery) {
    const business = await this.access.owned(ownerId, businessId);
    const zone = business.timezone;
    const from = query.from ? DateTime.fromISO(query.from, { zone }) : this.clock.now().setZone(zone).startOf('day');
    const conditions: (SQL | undefined)[] = [
      eq(bookings.businessId, businessId),
      gte(bookings.startsAt, from.toJSDate()),
      query.to ? lt(bookings.startsAt, DateTime.fromISO(query.to, { zone }).plus({ days: 1 }).toJSDate()) : undefined,
      query.status ? eq(bookings.status, query.status) : undefined,
    ];
    const rows = await this.db
      .select()
      .from(bookings)
      .where(and(...conditions))
      .orderBy(asc(bookings.startsAt))
      .limit(OWNER_LIST_LIMIT);
    return { timezone: zone, items: rows.map((b) => ownerView(b, this.clock.now())) };
  }

  // pending → confirmed, only before it starts
  async confirm(ownerId: string, businessId: string, bookingId: string) {
    await this.access.owned(ownerId, businessId);
    const now = this.clock.now().toJSDate();
    const [row] = await this.db
      .update(bookings)
      .set({ status: 'confirmed' })
      .where(
        and(
          eq(bookings.id, bookingId),
          eq(bookings.businessId, businessId),
          eq(bookings.status, 'pending'),
          gt(bookings.startsAt, now),
        ),
      )
      .returning();
    if (!row) throw await this.whyNot(businessId, bookingId);
    return ownerView(row, this.clock.now());
  }

  // pending → cancelled by the owner, with an optional reason for the client
  async reject(ownerId: string, businessId: string, bookingId: string, reason?: string) {
    await this.access.owned(ownerId, businessId);
    const [row] = await this.db
      .update(bookings)
      .set({ status: 'cancelled', cancelledBy: 'owner', cancellationReason: reason || null })
      .where(and(eq(bookings.id, bookingId), eq(bookings.businessId, businessId), eq(bookings.status, 'pending')))
      .returning();
    if (!row) throw await this.whyNot(businessId, bookingId);
    return ownerView(row, this.clock.now());
  }

  // The client cancels their own upcoming booking; the owner cancels any active booking of the business.
  // One conditional UPDATE, so cancel and confirm racing each other can't both win
  async cancel(userId: string, bookingId: string, reason?: string) {
    const [found] = await this.db
      .select({ booking: bookings, business: businesses })
      .from(bookings)
      .innerJoin(businesses, eq(bookings.businessId, businesses.id))
      .where(eq(bookings.id, bookingId))
      .limit(1);
    const isClient = found?.booking.clientId === userId;
    const isOwner = found?.business.ownerId === userId;
    if (!found || (!isClient && !isOwner)) throw notFound();

    const now = this.clock.now().toJSDate();
    const [row] = await this.db
      .update(bookings)
      .set({ status: 'cancelled', cancelledBy: isOwner ? 'owner' : 'client', cancellationReason: reason || null })
      .where(
        and(
          eq(bookings.id, bookingId),
          inArray(bookings.status, ACTIVE),
          // A client can't cancel what already started; the owner can tidy up
          isOwner ? undefined : gt(bookings.startsAt, now),
        ),
      )
      .returning();
    if (!row) throw notChangeable();
    return isOwner ? ownerView(row, this.clock.now()) : clientView(row, found.business, this.clock.now());
  }

  private async activeService(businessId: string, serviceId: string) {
    const [service] = await this.db
      .select()
      .from(services)
      .where(and(eq(services.id, serviceId), eq(services.businessId, businessId), eq(services.isActive, true)))
      .limit(1);
    if (!service) throw new NotFoundException(apiError('SERVICE_NOT_FOUND'));
    return service;
  }

  // Working hours of the date (week or its exception), minus what is already booked
  private async slots(business: Business, durationMinutes: number, date: string) {
    const zone = business.timezone;
    const now = this.clock.now();
    if (date < now.setZone(zone).toISODate()!) return [];
    const resourceId = await this.access.defaultResourceId(business.id);
    const dayStart = momentOf(date, '00:00', zone) ?? DateTime.fromISO(date, { zone });
    const dayEnd = momentOf(date, '24:00', zone)!;

    const [week, exceptionRows, busy] = await Promise.all([
      this.db.select().from(workingHours).where(eq(workingHours.resourceId, resourceId)),
      this.db
        .select()
        .from(scheduleExceptions)
        .where(and(eq(scheduleExceptions.resourceId, resourceId), eq(scheduleExceptions.date, date))),
      this.db
        .select({ startsAt: bookings.startsAt, endsAt: bookings.endsAt })
        .from(bookings)
        .where(
          and(
            eq(bookings.resourceId, resourceId),
            inArray(bookings.status, ACTIVE),
            lt(bookings.startsAt, dayEnd.toJSDate()),
            gt(bookings.endsAt, dayStart.toJSDate()),
          ),
        ),
    ]);

    const days = [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
      dayOfWeek,
      intervals: week
        .filter((row) => row.dayOfWeek === dayOfWeek)
        .map((row) => ({ start: fromDbTime(row.startTime), end: fromDbTime(row.endTime) })),
    }));
    const exception = exceptionRows.length
      ? {
          isDayOff: exceptionRows.some((row) => row.isDayOff),
          intervals: exceptionRows
            .filter((row) => !row.isDayOff && row.startTime && row.endTime)
            .map((row) => ({ start: fromDbTime(row.startTime!), end: fromDbTime(row.endTime!) })),
        }
      : undefined;

    return freeSlots({
      date,
      timezone: zone,
      intervals: hoursOfDate(date, zone, days, exception).sort((a, b) => a.start.localeCompare(b.start)),
      durationMinutes,
      busy: busy.map((b) => ({ startsAt: DateTime.fromJSDate(b.startsAt), endsAt: DateTime.fromJSDate(b.endsAt) })),
      now,
    });
  }

  // Snapshots of the service now, so later edits don't rewrite history. The database refuses an overlap
  private async insert(
    businessId: string,
    service: typeof services.$inferSelect,
    startsAt: DateTime,
    who: Pick<Booking, 'clientId' | 'clientName' | 'clientPhone' | 'status'>,
  ) {
    const resourceId = await this.access.defaultResourceId(businessId);
    try {
      const [booking] = await this.db
        .insert(bookings)
        .values({
          businessId,
          resourceId,
          serviceId: service.id,
          ...who,
          startsAt: startsAt.toJSDate(),
          endsAt: startsAt.plus({ minutes: service.durationMinutes }).toJSDate(),
          serviceNameSnapshot: service.name,
          priceMinorSnapshot: service.priceMinor,
          currencySnapshot: service.currency,
          durationMinutesSnapshot: service.durationMinutes,
        })
        .returning();
      return booking;
    } catch (err) {
      if (pgCode(err) === EXCLUSION_VIOLATION) throw conflict();
      throw err;
    }
  }

  // After a conditional UPDATE changed nothing: missing (404) or in the wrong state / too late (409)
  private async whyNot(businessId: string, bookingId: string) {
    const [row] = await this.db
      .select({ id: bookings.id })
      .from(bookings)
      .where(and(eq(bookings.id, bookingId), eq(bookings.businessId, businessId)))
      .limit(1);
    return row ? notChangeable() : notFound();
  }
}
