import { describe, expect, it } from "vitest";
import { addDays, dateIn, dateTimeIn, ddmm, longDay, shortDay, timeIn, todayIn } from "@/lib/dates";

describe("todayIn", () => {
  it("the business's date, not the browser's, around midnight", () => {
    // 23:30 UTC = 01:30 Kyiv (winter): already the next day
    expect(todayIn("Europe/Kyiv", new Date("2026-12-20T23:30:00Z"))).toBe("2026-12-21");
    // 21:30 UTC = 00:30 Kyiv (summer)
    expect(todayIn("Europe/Kyiv", new Date("2026-07-10T21:30:00Z"))).toBe("2026-07-11");
    expect(todayIn("Europe/Kyiv", new Date("2026-07-10T20:30:00Z"))).toBe("2026-07-10");
  });

  it("the same whatever the browser's time zone", () => {
    const realTz = process.env.TZ;
    try {
      for (const tz of ["Pacific/Honolulu", "Pacific/Kiritimati", "Europe/Kyiv"]) {
        process.env.TZ = tz;
        expect(todayIn("Europe/Kyiv", new Date("2026-12-20T23:30:00Z"))).toBe("2026-12-21");
      }
    } finally {
      process.env.TZ = realTz;
    }
  });
});

describe("ddmm", () => {
  it("«27.10» from a date or an ISO time", () => {
    expect(ddmm("2026-10-27")).toBe("27.10");
    expect(ddmm("2026-01-05")).toBe("05.01");
    expect(ddmm("2026-10-27T21:30:00.000Z")).toBe("27.10");
  });
});

describe("longDay / shortDay", () => {
  it("weekday and month in words", () => {
    expect(longDay("2026-10-26")).toBe("понеділок, 26 жовтня");
    expect(shortDay("2026-10-27")).toBe("27 жовт.");
  });

  it("the same date whatever the browser's time zone", () => {
    const realTz = process.env.TZ;
    try {
      for (const tz of ["Pacific/Honolulu", "Pacific/Kiritimati", "Europe/Kyiv"]) {
        process.env.TZ = tz;
        expect(longDay("2026-10-26")).toBe("понеділок, 26 жовтня");
        expect(shortDay("2026-12-31")).toBe("31 груд.");
      }
    } finally {
      process.env.TZ = realTz;
    }
  });
});

describe("dateTimeIn", () => {
  it("a moment in Kyiv time, summer and winter", () => {
    expect(dateTimeIn("2026-10-20T12:02:00.000Z", "Europe/Kyiv")).toBe("20 жовт., 15:02");
    expect(dateTimeIn("2026-12-20T22:30:00.000Z", "Europe/Kyiv")).toBe("21 груд., 00:30");
  });

  it("another business zone", () => {
    expect(dateTimeIn("2026-10-20T12:02:00.000Z", "Europe/Warsaw")).toBe("20 жовт., 14:02");
  });
});

describe("addDays / dateIn / timeIn", () => {
  it("calendar days across months and the DST change", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-10-24", 1)).toBe("2026-10-25");
  });

  it("date and time of a moment on the business's clock", () => {
    // 22:30 UTC on Nov 10 is 00:30 on Nov 11 in Kyiv
    expect(dateIn("2026-11-10T22:30:00Z", "Europe/Kyiv")).toBe("2026-11-11");
    expect(timeIn("2026-11-10T22:30:00Z", "Europe/Kyiv")).toBe("00:30");
  });
});
