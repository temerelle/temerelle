import { DateTime } from 'luxon';
import { freeSlots, hoursOfDate, momentOf } from './availability';

const KYIV = 'Europe/Kyiv';
const at = (iso: string) => DateTime.fromISO(iso, { zone: KYIV });
// A week before, so neither notice nor horizon gets in the way unless a test wants it
const longBefore = (date: string) => at(`${date}T08:00`).minus({ days: 7 });
const times = (slots: { time: string }[]) => slots.map((s) => s.time);

const week = [
  { dayOfWeek: 1, intervals: [{ start: '09:00', end: '13:00' }] },
  { dayOfWeek: 2, intervals: [] },
];

describe('hoursOfDate', () => {
  it('the week by weekday; an exception replaces it, a day off empties it', () => {
    // 2026-11-02 is a Monday
    expect(hoursOfDate('2026-11-02', KYIV, week, undefined)).toEqual([{ start: '09:00', end: '13:00' }]);
    expect(hoursOfDate('2026-11-03', KYIV, week, undefined)).toEqual([]);
    expect(hoursOfDate('2026-11-02', KYIV, week, { isDayOff: true, intervals: [] })).toEqual([]);
    const own = [{ start: '10:00', end: '12:00' }];
    expect(hoursOfDate('2026-11-03', KYIV, week, { isDayOff: false, intervals: own })).toEqual(own);
  });
});

describe('freeSlots', () => {
  const base = { date: '2026-11-10', timezone: KYIV, busy: [], now: longBefore('2026-11-10') };

  it('every 15 minutes while the whole service fits before the end; a break is never crossed', () => {
    const slots = freeSlots({
      ...base,
      intervals: [
        { start: '09:00', end: '10:00' },
        { start: '11:00', end: '11:50' },
      ],
      durationMinutes: 45,
    });
    expect(times(slots)).toEqual(['09:00', '09:15', '11:00']);
  });

  it('steps from an off-grid opening time', () => {
    const slots = freeSlots({ ...base, intervals: [{ start: '09:10', end: '10:00' }], durationMinutes: 20 });
    expect(times(slots)).toEqual(['09:10', '09:25', '09:40']);
  });

  it('busy times are taken out; touching a booking is fine', () => {
    const slots = freeSlots({
      ...base,
      intervals: [{ start: '09:00', end: '12:00' }],
      durationMinutes: 60,
      busy: [{ startsAt: at('2026-11-10T10:00'), endsAt: at('2026-11-10T10:30') }],
    });
    expect(times(slots)).toEqual(['09:00', '10:30', '10:45', '11:00']);
  });

  it('at least an hour from now, and not past the 30-day horizon', () => {
    const now = at('2026-11-10T09:20');
    const today = freeSlots({ ...base, now, intervals: [{ start: '09:00', end: '12:00' }], durationMinutes: 60 });
    expect(times(today)).toEqual(['10:30', '10:45', '11:00']);
    const later = { ...base, now, intervals: [{ start: '09:00', end: '10:00' }], durationMinutes: 60 };
    expect(freeSlots({ ...later, date: '2026-12-10' })).toHaveLength(1);
    expect(freeSlots({ ...later, date: '2026-12-11' })).toEqual([]);
  });

  it('24:00 ends the day', () => {
    const slots = freeSlots({ ...base, intervals: [{ start: '23:00', end: '24:00' }], durationMinutes: 60 });
    expect(times(slots)).toEqual(['23:00']);
    expect(slots[0].startsAt.toUTC().toISO()).toBe('2026-11-10T21:00:00.000Z');
  });

  it('spring forward (Kyiv, 2026-03-29, 03:00 → 04:00): skipped times are not offered, durations are real', () => {
    const date = '2026-03-29';
    const slots = freeSlots({
      ...base,
      date,
      now: longBefore(date),
      intervals: [{ start: '02:00', end: '05:00' }],
      durationMinutes: 60,
    });
    // 02:15 + 60 real minutes = 04:15 on the clock; 03:00–03:45 never happen
    expect(times(slots)).toEqual(['02:00', '02:15', '02:30', '02:45', '04:00']);
    expect(momentOf(date, '03:30', KYIV)).toBeNull();
  });

  it('fall back (Kyiv, 2026-10-25, 04:00 → 03:00): a 3-hour day interval holds one more real hour', () => {
    const date = '2026-10-25';
    const slots = freeSlots({
      ...base,
      date,
      now: longBefore(date),
      intervals: [{ start: '02:00', end: '05:00' }],
      durationMinutes: 240,
    });
    expect(times(slots)).toEqual(['02:00']);
  });
});
