"use client";
import { useState } from "react";
import { api, type OwnerBooking } from "@/lib/api";
import { errorText } from "@/lib/apiErrors";
import { isActive, STATUS } from "@/lib/bookingStatus";
import { longDay, dateIn, timeIn } from "@/lib/dates";
import { formatPrice } from "@/lib/money";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "./ConfirmDialog";

// One booking for the owner, with what can be done to it now. `withDate` for lists across days
export function OwnerBookingCard({
  businessId,
  timezone,
  booking,
  withDate = false,
  onChanged,
}: {
  businessId: string;
  timezone: string;
  booking: OwnerBooking;
  withDate?: boolean;
  onChanged: () => void;
}) {
  const [dialog, setDialog] = useState<"reject" | "cancel" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const status = STATUS[booking.status];
  const pending = booking.status === "pending";

  async function confirm() {
    setBusy(true);
    setError("");
    try {
      await api.confirmBooking(businessId, booking.id);
      onChanged();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <li className={`bg-surface border border-line rounded-xl p-4${isActive(booking.status) ? "" : " opacity-70"}`}>
      <div className="flex items-start justify-between mb-1">
        <p className="font-semibold text-heading first-letter:uppercase min-w-0 pr-3">
          {withDate && `${longDay(dateIn(booking.startsAt, timezone))}, `}
          {timeIn(booking.startsAt, timezone)}–{timeIn(booking.endsAt, timezone)}
        </p>
        <Badge tone={status.tone} size="status" className="shrink-0">
          {status.label}
        </Badge>
      </div>
      <p className="text-body">
        {booking.clientName}
        {booking.manual && <span className="text-subtle text-sm"> · додано вручну</span>}
      </p>
      {booking.clientPhone && (
        <a href={`tel:${booking.clientPhone.replace(/[^\d+]/g, "")}`} className="text-sm text-primary hover:underline">
          {booking.clientPhone}
        </a>
      )}
      <p className="text-sm text-subtle">
        {booking.serviceName} · {formatPrice(booking.priceMinor)}
      </p>
      {booking.status === "cancelled" && (
        <p className="text-sm text-subtle mt-1">
          {booking.cancelledBy === "client" ? "Скасував клієнт" : "Скасовано вами"}
          {booking.cancellationReason ? `: ${booking.cancellationReason}` : ""}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm text-danger mt-2">
          {error}
        </p>
      )}

      {booking.canConfirm && (
        <div className="flex space-x-2 mt-3">
          <button
            type="button"
            onClick={confirm}
            disabled={busy}
            className="btn-primary flex-1 h-11 rounded-lg font-medium transition-colors disabled:opacity-60"
          >
            {busy ? "Зачекайте…" : "Підтвердити"}
          </button>
          <button
            type="button"
            onClick={() => setDialog("reject")}
            disabled={busy}
            className="btn-secondary border flex-1 h-11 rounded-lg font-medium transition-colors"
          >
            Відхилити
          </button>
        </div>
      )}
      {booking.status === "confirmed" || (pending && !booking.canConfirm) ? (
        <button
          type="button"
          onClick={() => setDialog("cancel")}
          className="text-sm text-subtle hover:text-danger py-2 mt-1"
        >
          Скасувати запис
        </button>
      ) : null}

      {dialog && (
        <ConfirmDialog
          title={dialog === "reject" ? "Відхилити запит?" : "Скасувати запис?"}
          text={`${booking.clientName}, ${booking.serviceName}, ${timeIn(booking.startsAt, timezone)}. Клієнт побачить це у своїх записах.`}
          action={dialog === "reject" ? "Відхилити" : "Скасувати запис"}
          reasonLabel="Причина для клієнта (необов'язково)"
          onClose={() => setDialog(null)}
          onConfirm={async (reason) => {
            if (dialog === "reject") await api.rejectBooking(businessId, booking.id, reason);
            else await api.cancelBooking(booking.id, reason);
            setDialog(null);
            onChanged();
          }}
        />
      )}
    </li>
  );
}
