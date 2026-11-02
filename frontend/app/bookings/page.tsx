"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, statusOf, type ClientBooking } from "@/lib/api";
import { errorText } from "@/lib/apiErrors";
import { STATUS } from "@/lib/bookingStatus";
import { dateIn, longDay, timeIn } from "@/lib/dates";
import { formatPrice } from "@/lib/money";
import { PageLayout } from "@/components/ui/PageLayout";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/bookings/ConfirmDialog";

type Lists = { upcoming: ClientBooking[]; past: ClientBooking[] };

// My appointments: upcoming soonest first, then the recent past
export default function MyBookingsPage() {
  const router = useRouter();
  const [lists, setLists] = useState<Lists | null>(null);
  const [error, setError] = useState("");
  const [cancelling, setCancelling] = useState<ClientBooking | null>(null);

  const load = useCallback(
    () =>
      api.myBookings().then(setLists, (err) => {
        if (statusOf(err) === 401) router.replace("/login?next=/bookings");
        else setError(errorText(err, "Не вдалося завантажити записи."));
      }),
    [router],
  );

  useEffect(() => {
    load();
  }, [load]);

  if (error) {
    return (
      <PageLayout className="text-center">
        <p role="alert" className="text-danger">
          {error}
        </p>
      </PageLayout>
    );
  }
  if (!lists) return <PageLayout loading />;

  return (
    <PageLayout
      variant="top"
      action={
        <Link href="/profile" className="text-sm text-primary">
          Профіль
        </Link>
      }
    >
      <h1 className="text-2xl mb-6">Мої записи</h1>

      {lists.upcoming.length === 0 && lists.past.length === 0 ? (
        <div className="text-center">
          <p className="text-subtle mb-6">Записів ще немає.</p>
          <Link
            href="/search"
            className="btn-primary flex items-center justify-center h-12 rounded-lg font-medium transition-colors"
          >
            Знайти бізнес
          </Link>
        </div>
      ) : (
        <>
          <section className="mb-8">
            <h2 className="text-lg mb-3">Майбутні</h2>
            {lists.upcoming.length === 0 ? (
              <p className="text-subtle">Немає.</p>
            ) : (
              <ul className="space-y-3">
                {lists.upcoming.map((b) => (
                  <BookingCard key={b.id} booking={b} onCancel={b.canCancel ? () => setCancelling(b) : undefined} />
                ))}
              </ul>
            )}
          </section>
          {lists.past.length > 0 && (
            <section>
              <h2 className="text-lg mb-3">Минулі</h2>
              <ul className="space-y-3">
                {lists.past.map((b) => (
                  <BookingCard key={b.id} booking={b} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}

      {cancelling && (
        <ConfirmDialog
          title="Скасувати запис?"
          text={`${cancelling.serviceName} у ${cancelling.business.name}, ${longDay(
            dateIn(cancelling.startsAt, cancelling.business.timezone),
          )} о ${timeIn(cancelling.startsAt, cancelling.business.timezone)}.`}
          action="Скасувати запис"
          reasonLabel="Причина (необов'язково)"
          onClose={() => setCancelling(null)}
          onConfirm={async (reason) => {
            await api.cancelBooking(cancelling.id, reason);
            setCancelling(null);
            await load();
          }}
        />
      )}
    </PageLayout>
  );
}

function BookingCard({ booking, onCancel }: { booking: ClientBooking; onCancel?: () => void }) {
  const zone = booking.business.timezone;
  const status = STATUS[booking.status];
  return (
    <li className="bg-surface border border-line rounded-xl p-4">
      <div className="flex items-start justify-between mb-1">
        <Link href={`/b/${booking.business.code}`} className="font-medium text-heading hover:underline min-w-0 pr-3">
          {booking.business.name}
        </Link>
        <Badge tone={status.tone} size="status" className="shrink-0">
          {status.label}
        </Badge>
      </div>
      <p className="text-body">{booking.serviceName}</p>
      <p className="text-sm text-subtle first-letter:uppercase">
        {longDay(dateIn(booking.startsAt, zone))}, {timeIn(booking.startsAt, zone)}–{timeIn(booking.endsAt, zone)} ·{" "}
        {formatPrice(booking.priceMinor)}
      </p>
      {booking.status === "cancelled" && (
        <p className="text-sm text-subtle mt-2">
          {booking.cancelledBy === "owner" ? "Скасував бізнес" : "Ви скасували"}
          {booking.cancellationReason ? `: ${booking.cancellationReason}` : ""}
        </p>
      )}
      {onCancel && (
        <button type="button" onClick={onCancel} className="text-sm text-subtle hover:text-danger py-2 mt-1">
          Скасувати запис
        </button>
      )}
    </li>
  );
}
