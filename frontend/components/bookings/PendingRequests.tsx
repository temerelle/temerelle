"use client";
import { useCallback, useEffect, useState } from "react";
import { api, type OwnerBooking } from "@/lib/api";
import { errorText } from "@/lib/apiErrors";
import { OwnerBookingCard } from "./OwnerBookingCard";

// New requests waiting for the owner's answer, soonest first
export function PendingRequests({ businessId, timezone }: { businessId: string; timezone: string }) {
  const [items, setItems] = useState<OwnerBooking[] | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(
    () =>
      api.ownerBookings(businessId, { status: "pending" }).then(
        ({ items }) => setItems(items),
        (err) => setError(errorText(err, "Не вдалося завантажити запити.")),
      ),
    [businessId],
  );

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section>
      <h2 className="text-lg mb-3">Нові запити{items && items.length > 0 ? ` (${items.length})` : ""}</h2>
      {error ? (
        <p role="alert" className="text-danger">
          {error}
        </p>
      ) : !items ? (
        <p className="text-subtle">Завантажуємо…</p>
      ) : items.length === 0 ? (
        <p className="text-subtle">Нових запитів немає.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((booking) => (
            <OwnerBookingCard
              key={booking.id}
              businessId={businessId}
              timezone={timezone}
              booking={booking}
              withDate
              onChanged={load}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
