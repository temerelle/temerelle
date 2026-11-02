"use client";
import type { Interval } from "@/lib/api";
import { nextInterval } from "@/lib/schedule";

// The working intervals of one day; gaps between them are breaks. Used by the week and by a date's own hours
export function IntervalsEditor({
  intervals,
  onChange,
  label,
}: {
  intervals: Interval[];
  onChange: (intervals: Interval[]) => void;
  label: string;
}) {
  const update = (index: number, patch: Partial<Interval>) =>
    onChange(intervals.map((interval, i) => (i === index ? { ...interval, ...patch } : interval)));

  return (
    <div className="space-y-2">
      {intervals.map((interval, index) => (
        <div key={index} className="flex items-center space-x-2">
          <TimeInput
            label={`${label}: початок ${index + 1}`}
            value={interval.start}
            onChange={(start) => update(index, { start })}
          />
          <span className="text-subtle">–</span>
          {/* A clock has no 24:00: midnight as an end shows and is picked as 00:00 */}
          <TimeInput
            label={`${label}: кінець ${index + 1}`}
            value={interval.end === "24:00" ? "00:00" : interval.end}
            onChange={(end) => update(index, { end: end === "00:00" ? "24:00" : end })}
          />
          <button
            type="button"
            aria-label={`Прибрати ${interval.start}–${interval.end}`}
            className="h-11 w-11 shrink-0 rounded-lg text-subtle hover:text-danger"
            onClick={() => onChange(intervals.filter((_, i) => i !== index))}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        type="button"
        className="text-sm text-primary py-2"
        onClick={() => onChange([...intervals, nextInterval(intervals)])}
      >
        {intervals.length ? "+ Ще інтервал (після перерви)" : "+ Додати години"}
      </button>
    </div>
  );
}

function TimeInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <input
      type="time"
      required
      aria-label={label}
      className="input-field border h-11 px-3 rounded-lg flex-1 min-w-0"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
