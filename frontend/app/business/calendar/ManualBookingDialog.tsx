"use client";
import { useEffect, useState, type FormEvent } from "react";
import { api, type Service } from "@/lib/api";
import { errorText } from "@/lib/apiErrors";
import { formatDuration } from "@/lib/schedule";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";

// Someone called or came in: the owner books them, confirmed at once. Date and time on the business's clock
export function ManualBookingDialog({
  businessId,
  date: initialDate,
  today,
  onClose,
  onSaved,
}: {
  businessId: string;
  date: string;
  today: string;
  onClose: () => void;
  onSaved: (date: string) => void;
}) {
  const [services, setServices] = useState<Service[] | null>(null);
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState(initialDate);
  const [time, setTime] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.services(businessId).then(
      ({ items }) => {
        setServices(items);
        if (items[0]) setServiceId(items[0].id);
      },
      (err) => setError(errorText(err, "Не вдалося завантажити послуги.")),
    );
  }, [businessId]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createManualBooking(businessId, { serviceId, date, time, clientName, clientPhone });
      onSaved(date);
    } catch (err) {
      setError(
        errorText(err, "Не вдалося додати запис. Перевірте дані.", {
          BOOKING_NOT_CHANGEABLE: "Цей час уже минув. Оберіть пізніший.",
        }),
      );
      setBusy(false);
    }
  }

  return (
    <Modal onDismiss={onClose} canDismiss={!busy} labelledBy="manual-booking-title">
      <form onSubmit={submit} className="space-y-4 max-h-[80vh] overflow-y-auto">
        <h2 id="manual-booking-title" className="text-xl">
          Додати запис
        </h2>
        {services?.length === 0 ? (
          <p className="text-subtle">Спершу додайте хоча б одну послугу.</p>
        ) : (
          <>
            <div>
              <label htmlFor="manual-service" className="block text-sm font-medium text-body mb-1.5">
                Послуга
              </label>
              <select
                id="manual-service"
                required
                className="input-field border w-full h-12 px-4 rounded-lg"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                {services?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}, {formatDuration(s.durationMinutes)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex space-x-3">
              <Field
                label="Дата"
                type="date"
                required
                min={today}
                className="flex-1"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <Field
                label="Час"
                type="time"
                required
                className="flex-1"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
            <Field
              label="Ім'я клієнта"
              required
              maxLength={100}
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
            />
            <Field
              label="Телефон (необов'язково)"
              type="tel"
              placeholder="+380 67 123 45 67"
              pattern="\+?[0-9 ()\-]{7,20}"
              value={clientPhone}
              onChange={(e) => setClientPhone(e.target.value)}
            />
          </>
        )}
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-col space-y-2">
          {services && services.length > 0 && (
            <button
              type="submit"
              disabled={busy}
              className="btn-primary h-12 rounded-lg font-medium transition-colors disabled:opacity-60"
            >
              {busy ? "Зберігаємо…" : "Додати"}
            </button>
          )}
          <button type="button" onClick={onClose} disabled={busy} className="h-12 rounded-lg text-subtle">
            Скасувати
          </button>
        </div>
      </form>
    </Modal>
  );
}
