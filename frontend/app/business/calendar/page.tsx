"use client";
import { useCallback, useEffect, useState } from "react";
import { api, type OwnerBooking } from "@/lib/api";
import { errorText } from "@/lib/apiErrors";
import { addDays, longDay, todayIn } from "@/lib/dates";
import { useMyBusiness } from "@/lib/useMyBusiness";
import { OwnerPage } from "@/components/business/OwnerPage";
import { OwnerBookingCard } from "@/components/bookings/OwnerBookingCard";
import { ManualBookingDialog } from "./ManualBookingDialog";

// One day at a time, cancelled ones too (dimmed), so the owner sees what happened
export default function CalendarPage() {
  const { business, error: businessError } = useMyBusiness("/business/calendar");
  const today = business ? todayIn(business.timezone) : "";
  const [picked, setPicked] = useState<string | null>(null);
  const date = picked ?? today;
  const [loaded, setLoaded] = useState<{ date: string; items: OwnerBooking[] } | null>(null);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    if (!business || !date) return;
    api.ownerBookings(business.id, { from: date, to: date }).then(
      ({ items }) => setLoaded({ date, items }),
      (err) => setError(errorText(err, "Не вдалося завантажити записи.")),
    );
  }, [business, date]);

  useEffect(() => {
    load();
  }, [load]);

  const items = loaded?.date === date ? loaded.items : null;
  const errorMessage = businessError || error;

  return (
    <OwnerPage title="Календар" loading={!errorMessage && !business} error={errorMessage}>
      {business && (
        <>
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              aria-label="Попередній день"
              onClick={() => setPicked(addDays(date, -1))}
              className="h-11 w-11 rounded-lg border border-line bg-surface hover:border-primary"
            >
              ←
            </button>
            <div className="text-center">
              <p className="font-medium text-heading first-letter:uppercase">{longDay(date)}</p>
              {date !== today && (
                <button type="button" onClick={() => setPicked(null)} className="text-sm text-primary">
                  Сьогодні
                </button>
              )}
            </div>
            <button
              type="button"
              aria-label="Наступний день"
              onClick={() => setPicked(addDays(date, 1))}
              className="h-11 w-11 rounded-lg border border-line bg-surface hover:border-primary"
            >
              →
            </button>
          </div>

          <button
            type="button"
            onClick={() => setAdding(true)}
            className="btn-secondary border w-full h-12 rounded-lg font-medium transition-colors mb-6"
          >
            + Додати запис
          </button>

          {!items ? (
            <p className="text-subtle">Завантажуємо…</p>
          ) : items.length === 0 ? (
            <p className="text-subtle">На цей день записів немає.</p>
          ) : (
            <ul className="space-y-3">
              {items.map((booking) => (
                <OwnerBookingCard
                  key={booking.id}
                  businessId={business.id}
                  timezone={business.timezone}
                  booking={booking}
                  onChanged={load}
                />
              ))}
            </ul>
          )}

          {adding && (
            <ManualBookingDialog
              businessId={business.id}
              date={date < today ? today : date}
              today={today}
              onClose={() => setAdding(false)}
              onSaved={(savedDate) => {
                setAdding(false);
                if (savedDate === date) load();
                else setPicked(savedDate);
              }}
            />
          )}
        </>
      )}
    </OwnerPage>
  );
}
