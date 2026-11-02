// A booking day is a date, not a moment: format noon UTC in UTC so every browser time zone shows the same day
const noon = (localDate: string) => new Date(`${localDate}T12:00:00Z`);

// 'YYYY-MM-DD' in the business's IANA zone whatever the browser's; compare days with it as strings
export const todayIn = (timeZone: string, now = new Date()) => now.toLocaleDateString("sv-SE", { timeZone });

// "27.10" from 'YYYY-MM-DD' or an ISO time
export const ddmm = (date: string) => `${date.slice(8, 10)}.${date.slice(5, 7)}`;

// "понеділок, 27 жовтня"
export function longDay(localDate: string) {
  return new Intl.DateTimeFormat("uk-UA", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(
    noon(localDate),
  );
}

// "27 жовт."
export function shortDay(localDate: string) {
  return new Intl.DateTimeFormat("uk-UA", { day: "numeric", month: "short", timeZone: "UTC" }).format(noon(localDate));
}

// "10:30" in the business's zone
export function timeIn(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("uk-UA", { hour: "2-digit", minute: "2-digit", timeZone }).format(new Date(iso));
}

// 'YYYY-MM-DD' of a moment in the business's zone
export const dateIn = (iso: string, timeZone: string) => todayIn(timeZone, new Date(iso));

// 'YYYY-MM-DD' plus whole days, calendar arithmetic only
export function addDays(localDate: string, days: number) {
  const d = noon(localDate);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

// "Пн"
export function weekdayShort(localDate: string) {
  return new Intl.DateTimeFormat("uk-UA", { weekday: "short", timeZone: "UTC" }).format(noon(localDate));
}

// "20 жовт., 15:02" in the business's zone, for a moment from the API
export function dateTimeIn(iso: string, timeZone: string) {
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(new Date(iso));
}
