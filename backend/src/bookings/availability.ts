// Free start times of one day, pure so the time zone and DST cases are unit-tested.
// All moments are luxon DateTimes; wall-clock times ('HH:MM') are read in the business's zone
import { DateTime } from 'luxon';
import { toMinutes, type Interval } from '../schedule/rules';

// Configurable in code, not in the UI (CLAUDE.md)
export const BOOKING_RULES = {
  slotStepMinutes: 15,
  minNoticeMinutes: 60,
  horizonDays: 30,
};

export interface Busy {
  startsAt: DateTime;
  endsAt: DateTime;
}

export interface Slot {
  time: string;
  startsAt: DateTime;
}

// A date's override replaces the week for that date: a day off has no intervals, own hours replace the week's
export function hoursOfDate(
  date: string,
  timezone: string,
  week: { dayOfWeek: number; intervals: Interval[] }[],
  exception: { isDayOff: boolean; intervals: Interval[] } | undefined,
): Interval[] {
  if (exception) return exception.isDayOff ? [] : exception.intervals;
  const dayOfWeek = DateTime.fromISO(date, { zone: timezone }).weekday;
  return week.find((day) => day.dayOfWeek === dayOfWeek)?.intervals ?? [];
}

// The moment of a wall-clock time on a date; null when the clock skips it (spring forward). '24:00' = next midnight
export function momentOf(date: string, time: string, timezone: string): DateTime | null {
  const day = DateTime.fromISO(date, { zone: timezone });
  if (time === '24:00') return day.plus({ days: 1 }).startOf('day');
  const [hour, minute] = time.split(':').map(Number);
  const moment = day.set({ hour, minute });
  return moment.hour === hour && moment.minute === minute ? moment : null;
}

// Every slotStepMinutes from each interval's start, while the whole service fits before the interval ends
// (a break is the gap between intervals, so a service never runs into it). Busy times, the minimum notice and
// the horizon are taken out. Durations add real minutes, so a service across a DST change ends at the true time
export function freeSlots(input: {
  date: string;
  timezone: string;
  intervals: Interval[];
  durationMinutes: number;
  busy: Busy[];
  now: DateTime;
  rules?: typeof BOOKING_RULES;
}): Slot[] {
  const { date, timezone, intervals, durationMinutes, busy, now, rules = BOOKING_RULES } = input;
  const earliest = now.plus({ minutes: rules.minNoticeMinutes });
  const lastDate = now.setZone(timezone).startOf('day').plus({ days: rules.horizonDays });
  if (DateTime.fromISO(date, { zone: timezone }) > lastDate) return [];

  const slots: Slot[] = [];
  for (const interval of intervals) {
    const end = momentOf(date, interval.end, timezone);
    if (!end) continue;
    for (let m = toMinutes(interval.start); m < toMinutes(interval.end); m += rules.slotStepMinutes) {
      const time = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      const startsAt = momentOf(date, time, timezone);
      if (!startsAt) continue;
      const endsAt = startsAt.plus({ minutes: durationMinutes });
      if (endsAt > end) break;
      if (startsAt < earliest) continue;
      if (busy.some((b) => startsAt < b.endsAt && endsAt > b.startsAt)) continue;
      slots.push({ time, startsAt });
    }
  }
  return slots;
}
