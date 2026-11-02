import type { Interval } from "./api";

// Same rules as backend/src/schedule/rules.ts, in Ukrainian, so the form explains a problem before saving
export const STEP_MINUTES = 15;

export const WEEKDAYS = ["Понеділок", "Вівторок", "Середа", "Четвер", "П'ятниця", "Субота", "Неділя"];
export const WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

export const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
};

export const fromMinutes = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

// Every 15 minutes of a day; ends may also be 24:00
export const START_TIMES = Array.from({ length: (24 * 60) / STEP_MINUTES }, (_, i) => fromMinutes(i * STEP_MINUTES));
export const END_TIMES = [...START_TIMES.slice(1), "24:00"];

export function intervalsProblem(intervals: Interval[]): string | null {
  const sorted = [...intervals].sort((a, b) => toMinutes(a.start) - toMinutes(b.start));
  for (const [i, interval] of sorted.entries()) {
    if (toMinutes(interval.end) <= toMinutes(interval.start))
      return `${interval.start}–${interval.end}: кінець має бути пізніше за початок`;
    const previous = sorted[i - 1];
    if (previous && toMinutes(interval.start) < toMinutes(previous.end))
      return `${previous.start}–${previous.end} і ${interval.start}–${interval.end} перетинаються`;
  }
  return null;
}

// A new interval after the last one: an hour later, two hours long, within the day
export function nextInterval(intervals: Interval[]): Interval {
  const lastEnd = Math.max(0, ...intervals.map((i) => toMinutes(i.end)));
  if (intervals.length === 0) return { start: "09:00", end: "18:00" };
  const start = Math.min(lastEnd + 60, 23 * 60);
  return { start: fromMinutes(start), end: fromMinutes(Math.min(start + 120, 24 * 60)) };
}

export const formatIntervals = (intervals: Interval[]) =>
  intervals.length ? intervals.map((i) => `${i.start}–${i.end}`).join(", ") : "Вихідний";

// 60 → "1 год", 90 → "1 год 30 хв", 45 → "45 хв"
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return [h && `${h} год`, m && `${m} хв`].filter(Boolean).join(" ");
}
