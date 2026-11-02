"use client";
import type { Interval } from "@/lib/api";
import { END_TIMES, nextInterval, START_TIMES } from "@/lib/schedule";

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
          <TimeSelect
            label={`${label}: початок ${index + 1}`}
            value={interval.start}
            options={START_TIMES}
            onChange={(start) => update(index, { start })}
          />
          <span className="text-subtle">–</span>
          <TimeSelect
            label={`${label}: кінець ${index + 1}`}
            value={interval.end}
            options={END_TIMES}
            onChange={(end) => update(index, { end })}
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

function TimeSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <select
      aria-label={label}
      className="input-field border h-11 px-3 rounded-lg flex-1 min-w-0"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((time) => (
        <option key={time} value={time}>
          {time}
        </option>
      ))}
    </select>
  );
}
