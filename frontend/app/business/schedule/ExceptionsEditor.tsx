"use client";
import { useState, type FormEvent } from "react";
import { api, type Interval, type ScheduleException } from "@/lib/api";
import { errorText } from "@/lib/apiErrors";
import { longDay, todayIn } from "@/lib/dates";
import { formatIntervals, intervalsProblem } from "@/lib/schedule";
import { IntervalsEditor } from "./IntervalsEditor";

// Dates that differ from the week: a day off, or other hours. A date's override replaces the week for that date
export function ExceptionsEditor({
  businessId,
  timezone,
  initial,
}: {
  businessId: string;
  timezone: string;
  initial: ScheduleException[];
}) {
  const today = todayIn(timezone);
  const [items, setItems] = useState(initial);
  const [date, setDate] = useState("");
  const [isDayOff, setIsDayOff] = useState(true);
  const [intervals, setIntervals] = useState<Interval[]>([{ start: "10:00", end: "16:00" }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function add(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!isDayOff) {
      if (intervals.length === 0) return setError("Додайте години або позначте день вихідним");
      const problem = intervalsProblem(intervals);
      if (problem) return setError(problem);
    }
    setBusy(true);
    setError("");
    try {
      const saved = await api.setException(businessId, { date, isDayOff, intervals: isDayOff ? undefined : intervals });
      setItems((list) =>
        [...list.filter((i) => i.date !== saved.date), saved].sort((a, b) => a.date.localeCompare(b.date)),
      );
      setDate("");
    } catch (err) {
      setError(errorText(err, "Не вдалося зберегти виняток."));
    } finally {
      setBusy(false);
    }
  }

  async function remove(item: ScheduleException) {
    try {
      await api.deleteException(businessId, item.id);
      setItems((list) => list.filter((i) => i.id !== item.id));
    } catch (err) {
      setError(errorText(err, "Не вдалося видалити виняток."));
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg">Особливі дні</h2>
      <p className="text-sm text-subtle">
        Свято, відпустка чи скорочений день. На цю дату діє тільки те, що вказано тут.
      </p>

      {items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between bg-surface border border-line rounded-xl px-4 py-3"
            >
              <span className="min-w-0 pr-3">
                <span className="block font-medium text-heading first-letter:uppercase">{longDay(item.date)}</span>
                <span className="block text-sm text-subtle">{formatIntervals(item.intervals)}</span>
              </span>
              <button type="button" className="text-sm text-subtle hover:text-danger py-2" onClick={() => remove(item)}>
                Видалити
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="bg-surface border border-line rounded-xl p-4 space-y-3">
        <div>
          <label htmlFor="exception-date" className="block text-sm font-medium text-body mb-1.5">
            Дата
          </label>
          <input
            id="exception-date"
            type="date"
            required
            min={today}
            className="input-field border w-full h-12 px-4 rounded-lg"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        <fieldset className="space-y-2">
          <legend className="sr-only">Цього дня</legend>
          <label className="flex items-center space-x-3 py-1">
            <input
              type="radio"
              className="h-5 w-5 accent-primary"
              checked={isDayOff}
              onChange={() => setIsDayOff(true)}
            />
            <span>Вихідний</span>
          </label>
          <label className="flex items-center space-x-3 py-1">
            <input
              type="radio"
              className="h-5 w-5 accent-primary"
              checked={!isDayOff}
              onChange={() => setIsDayOff(false)}
            />
            <span>Інші години</span>
          </label>
        </fieldset>
        {!isDayOff && <IntervalsEditor label="Цього дня" intervals={intervals} onChange={setIntervals} />}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="btn-secondary border w-full h-12 rounded-lg font-medium transition-colors disabled:opacity-60"
        >
          {busy ? "Зберігаємо…" : "Додати особливий день"}
        </button>
      </form>
    </section>
  );
}
