import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, gte } from 'drizzle-orm';
import { DateTime } from 'luxon';
import { DatabaseService } from '../database/database.service';
import { scheduleExceptions, workingHours } from '../database/schema';
import { ClockService } from '../clock/clock.service';
import { apiError } from '../common/api-error';
import { BusinessAccessService } from '../businesses/business-access.service';
import { fromDbTime, intervalsProblem, sortIntervals, type Interval } from './rules';
import type { CreateExceptionDto, PutScheduleDto } from './dto/schedule.dto';

// How far ahead an exception may be set; bookings only go 30 days ahead, so a year is plenty
const EXCEPTION_HORIZON_DAYS = 365;

const invalid = (problem: string) => new BadRequestException(apiError('SCHEDULE_INVALID', problem));

// The schedule belongs to the business's default resource (MVP). Saving it never touches existing bookings:
// a booking outside the new hours stays, and Phase 4 shows it to the owner
@Injectable()
export class ScheduleService {
  constructor(
    private readonly database: DatabaseService,
    private readonly access: BusinessAccessService,
    private readonly clock: ClockService,
  ) {}

  private get db() {
    return this.database.db;
  }

  // All seven days, Monday first; a day without intervals is a day off
  async get(businessId: string, userId: string | undefined) {
    const business = await this.access.visible(businessId, userId);
    const resourceId = await this.access.defaultResourceId(businessId);
    const rows = await this.db
      .select()
      .from(workingHours)
      .where(eq(workingHours.resourceId, resourceId))
      .orderBy(asc(workingHours.dayOfWeek), asc(workingHours.startTime));
    const days = [1, 2, 3, 4, 5, 6, 7].map((dayOfWeek) => ({
      dayOfWeek,
      intervals: rows
        .filter((row) => row.dayOfWeek === dayOfWeek)
        .map((row) => ({ start: fromDbTime(row.startTime), end: fromDbTime(row.endTime) })),
    }));
    return { timezone: business.timezone, days };
  }

  // Replaces the whole week in one transaction
  async put(userId: string, businessId: string, dto: PutScheduleDto) {
    await this.access.owned(userId, businessId);
    const seen = new Set<number>();
    for (const day of dto.days) {
      if (seen.has(day.dayOfWeek)) throw invalid(`Day ${day.dayOfWeek} is given twice`);
      seen.add(day.dayOfWeek);
      const problem = intervalsProblem(day.intervals);
      if (problem) throw invalid(problem);
    }

    const resourceId = await this.access.defaultResourceId(businessId);
    const rows = dto.days.flatMap((day) =>
      sortIntervals(day.intervals).map(({ start, end }) => ({
        businessId,
        resourceId,
        dayOfWeek: day.dayOfWeek,
        startTime: start,
        endTime: end,
      })),
    );
    await this.db.transaction(async (tx) => {
      await tx.delete(workingHours).where(eq(workingHours.resourceId, resourceId));
      if (rows.length) await tx.insert(workingHours).values(rows);
    });
    return this.get(businessId, userId);
  }

  // From today on (in the business's zone), grouped by date
  async listExceptions(userId: string, businessId: string) {
    const business = await this.access.owned(userId, businessId);
    const resourceId = await this.access.defaultResourceId(businessId);
    const rows = await this.db
      .select()
      .from(scheduleExceptions)
      .where(
        and(eq(scheduleExceptions.resourceId, resourceId), gte(scheduleExceptions.date, this.today(business.timezone))),
      )
      .orderBy(asc(scheduleExceptions.date), asc(scheduleExceptions.startTime));
    return { items: groupByDate(rows) };
  }

  // Sets the override of one date, replacing whatever that date had
  async setException(userId: string, businessId: string, dto: CreateExceptionDto) {
    const business = await this.access.owned(userId, businessId);
    const date = DateTime.fromISO(dto.date, { zone: business.timezone });
    const today = DateTime.fromISO(this.today(business.timezone), { zone: business.timezone });
    if (!date.isValid) throw new BadRequestException(apiError('DATE_OUT_OF_RANGE', 'Not a real date'));
    if (date < today || date > today.plus({ days: EXCEPTION_HORIZON_DAYS }))
      throw new BadRequestException(apiError('DATE_OUT_OF_RANGE'));

    const intervals = dto.isDayOff ? [] : (dto.intervals ?? []);
    if (!dto.isDayOff) {
      if (intervals.length === 0) throw invalid('Give the working hours of that day, or mark it a day off');
      const problem = intervalsProblem(intervals);
      if (problem) throw invalid(problem);
    }

    const resourceId = await this.access.defaultResourceId(businessId);
    const sameDate = and(eq(scheduleExceptions.resourceId, resourceId), eq(scheduleExceptions.date, dto.date));
    const rows = await this.db.transaction(async (tx) => {
      await tx.delete(scheduleExceptions).where(sameDate);
      const values = dto.isDayOff
        ? [{ businessId, resourceId, date: dto.date, isDayOff: true }]
        : sortIntervals(intervals).map(({ start, end }) => ({
            businessId,
            resourceId,
            date: dto.date,
            isDayOff: false,
            startTime: start,
            endTime: end,
          }));
      return tx.insert(scheduleExceptions).values(values).returning();
    });
    return groupByDate(rows)[0];
  }

  // The id of any row of a date removes the whole override of that date: back to the weekly schedule
  async deleteException(userId: string, businessId: string, exceptionId: string) {
    await this.access.owned(userId, businessId);
    const [row] = await this.db
      .select()
      .from(scheduleExceptions)
      .where(and(eq(scheduleExceptions.id, exceptionId), eq(scheduleExceptions.businessId, businessId)))
      .limit(1);
    if (!row) throw new NotFoundException(apiError('EXCEPTION_NOT_FOUND'));
    await this.db
      .delete(scheduleExceptions)
      .where(and(eq(scheduleExceptions.resourceId, row.resourceId), eq(scheduleExceptions.date, row.date)));
    return { ok: true };
  }

  private today(timezone: string): string {
    return this.clock.now().setZone(timezone).toISODate()!;
  }
}

type ExceptionRow = typeof scheduleExceptions.$inferSelect;

// One item per date; its id is the first row's (DELETE takes any of them)
function groupByDate(rows: ExceptionRow[]) {
  const byDate = new Map<string, { id: string; date: string; isDayOff: boolean; intervals: Interval[] }>();
  for (const row of rows) {
    const item = byDate.get(row.date) ?? { id: row.id, date: row.date, isDayOff: row.isDayOff, intervals: [] };
    if (!row.isDayOff && row.startTime && row.endTime)
      item.intervals.push({ start: fromDbTime(row.startTime), end: fromDbTime(row.endTime) });
    byDate.set(row.date, item);
  }
  return [...byDate.values()];
}
