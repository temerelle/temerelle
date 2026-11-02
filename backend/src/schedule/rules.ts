// Working hours rules, pure so they are unit-tested. Times are 'HH:MM'; '24:00' ends a day
export const MAX_INTERVALS_PER_DAY = 6;

export interface Interval {
  start: string;
  end: string;
}

export const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$|^24:00$/;

export function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

// Postgres TIME comes back as 'HH:MM:SS'
export const fromDbTime = (time: string) => time.slice(0, 5);

// A problem in words (for logs and the API message), or null when the day is fine. Touching intervals are fine
// (09:00–13:00 and 13:00–18:00); overlapping ones are not
export function intervalsProblem(intervals: Interval[]): string | null {
  if (intervals.length > MAX_INTERVALS_PER_DAY) return `At most ${MAX_INTERVALS_PER_DAY} intervals a day`;
  const sorted = intervals
    .map(({ start, end }) => ({ start: toMinutes(start), end: toMinutes(end), label: `${start}–${end}` }))
    .sort((a, b) => a.start - b.start);
  for (const [i, interval] of sorted.entries()) {
    if (interval.start >= 24 * 60) return `${interval.label}: 24:00 can only end a day`;
    if (interval.end <= interval.start) return `${interval.label}: the end must be after the start`;
    const previous = sorted[i - 1];
    if (previous && interval.start < previous.end) return `${previous.label} and ${interval.label} overlap`;
  }
  return null;
}

// Sorted, so the API always answers the same order
export function sortIntervals(intervals: Interval[]): Interval[] {
  return [...intervals].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
}
