"use client";
import { useState } from "react";
import { api, type DaySchedule } from "@/lib/api";
import { errorText } from "@/lib/apiErrors";
import { intervalsProblem, WEEKDAYS } from "@/lib/schedule";
import { IntervalsEditor } from "./IntervalsEditor";

// The whole week, saved at once. Existing bookings are kept whatever the new hours
export function WeekEditor({ businessId, initial }: { businessId: string; initial: DaySchedule[] }) {
  const [days, setDays] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const setIntervals = (dayOfWeek: number, intervals: DaySchedule["intervals"]) => {
    setDays((week) => week.map((day) => (day.dayOfWeek === dayOfWeek ? { ...day, intervals } : day)));
    setMessage(null);
  };

  async function save() {
    for (const day of days) {
      const problem = intervalsProblem(day.intervals);
      if (problem) return setMessage({ ok: false, text: `${WEEKDAYS[day.dayOfWeek - 1]}: ${problem}` });
    }
    setBusy(true);
    try {
      setDays((await api.saveSchedule(businessId, days)).days);
      setMessage({ ok: true, text: "Розклад збережено" });
    } catch (err) {
      setMessage({ ok: false, text: errorText(err, "Не вдалося зберегти розклад.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg">Щотижневий розклад</h2>
      {days.map((day) => {
        const name = WEEKDAYS[day.dayOfWeek - 1];
        return (
          <div key={day.dayOfWeek} className="bg-surface border border-line rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-heading">{name}</span>
              {day.intervals.length === 0 && <span className="text-sm text-subtle">Вихідний</span>}
            </div>
            <IntervalsEditor
              label={name}
              intervals={day.intervals}
              onChange={(intervals) => setIntervals(day.dayOfWeek, intervals)}
            />
          </div>
        );
      })}
      {message && (
        <p role="status" className={`text-sm ${message.ok ? "text-primary" : "text-danger"}`}>
          {message.text}
        </p>
      )}
      <button
        type="button"
        onClick={save}
        disabled={busy}
        className="btn-primary w-full h-12 rounded-lg font-medium transition-colors disabled:opacity-60"
      >
        {busy ? "Зберігаємо…" : "Зберегти розклад"}
      </button>
      <p className="text-sm text-subtle">Записи, які вже є, залишаться, навіть якщо вони поза новими годинами.</p>
    </section>
  );
}
