import { describe, expect, it } from "vitest";
import {
  END_TIMES,
  formatDuration,
  formatIntervals,
  intervalsProblem,
  nextInterval,
  START_TIMES,
} from "@/lib/schedule";

describe("schedule helpers", () => {
  it("time options every 15 minutes; only ends reach 24:00", () => {
    expect(START_TIMES).toHaveLength(96);
    expect(START_TIMES[0]).toBe("00:00");
    expect(START_TIMES.at(-1)).toBe("23:45");
    expect(END_TIMES[0]).toBe("00:15");
    expect(END_TIMES.at(-1)).toBe("24:00");
  });

  it("explains a problem in Ukrainian, or null when fine", () => {
    expect(
      intervalsProblem([
        { start: "09:00", end: "13:00" },
        { start: "13:00", end: "18:00" },
      ]),
    ).toBeNull();
    expect(intervalsProblem([{ start: "18:00", end: "09:00" }])).toBe(
      "18:00–09:00: кінець має бути пізніше за початок",
    );
    expect(
      intervalsProblem([
        { start: "12:00", end: "18:00" },
        { start: "09:00", end: "13:00" },
      ]),
    ).toBe("09:00–13:00 і 12:00–18:00 перетинаються");
  });

  it("a new interval: 09:00–18:00 first, then after the last one, never past midnight", () => {
    expect(nextInterval([])).toEqual({ start: "09:00", end: "18:00" });
    expect(nextInterval([{ start: "09:00", end: "13:00" }])).toEqual({ start: "14:00", end: "16:00" });
    expect(nextInterval([{ start: "09:00", end: "23:30" }])).toEqual({ start: "23:00", end: "24:00" });
  });

  it("formats intervals and durations", () => {
    expect(formatIntervals([])).toBe("Вихідний");
    expect(
      formatIntervals([
        { start: "09:00", end: "13:00" },
        { start: "14:00", end: "18:00" },
      ]),
    ).toBe("09:00–13:00, 14:00–18:00");
    expect(formatDuration(60)).toBe("1 год");
    expect(formatDuration(90)).toBe("1 год 30 хв");
    expect(formatDuration(45)).toBe("45 хв");
  });
});
