"use client";
import { useState, type FormEvent } from "react";
import { api, type Service } from "@/lib/api";
import { errorText } from "@/lib/apiErrors";
import { parsePrice, priceInputValue } from "@/lib/money";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";

// Duration as a clock value: 90 minutes <-> "01:30"
const toClock = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
const fromClock = (value: string) => {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
};

// Add a service (no `service`) or edit one
export function ServiceDialog({
  businessId,
  service,
  onClose,
  onSaved,
}: {
  businessId: string;
  service?: Service;
  onClose: () => void;
  onSaved: (service: Service) => void;
}) {
  const [name, setName] = useState(service?.name ?? "");
  const [duration, setDuration] = useState(toClock(service?.durationMinutes ?? 60));
  const [price, setPrice] = useState(service ? priceInputValue(service.priceMinor) : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const priceMinor = parsePrice(price);
    if (priceMinor === null) return setError("Вкажіть ціну числом, наприклад 500 або 499,50");
    const durationMinutes = fromClock(duration);
    // iOS wheels ignore step and min/max, so check here too
    if (!(durationMinutes >= 15 && durationMinutes <= 720 && durationMinutes % 15 === 0)) {
      return setError("Тривалість від 00:15 до 12:00, кратна 15 хвилинам");
    }
    setBusy(true);
    setError("");
    const input = { name, durationMinutes, priceMinor };
    try {
      onSaved(
        service ? await api.updateService(businessId, service.id, input) : await api.createService(businessId, input),
      );
    } catch (err) {
      setError(errorText(err, "Не вдалося зберегти послугу. Перевірте дані."));
      setBusy(false);
    }
  }

  return (
    <Modal onDismiss={onClose} canDismiss={!busy} labelledBy="service-dialog-title">
      <form onSubmit={submit} className="space-y-4">
        <h2 id="service-dialog-title" className="text-xl">
          {service ? "Редагувати послугу" : "Нова послуга"}
        </h2>
        <Field label="Назва" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} />
        <Field
          label="Тривалість, год:хв"
          type="time"
          required
          min="00:15"
          max="12:00"
          step={900}
          value={duration}
          onChange={(e) => setDuration(e.target.value)}
        />
        <Field
          label="Ціна, ₴"
          inputMode="decimal"
          required
          placeholder="500"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-col space-y-2">
          <button
            type="submit"
            disabled={busy}
            className="btn-primary h-12 rounded-lg font-medium transition-colors disabled:opacity-60"
          >
            {busy ? "Зберігаємо…" : "Зберегти"}
          </button>
          <button type="button" onClick={onClose} disabled={busy} className="h-12 rounded-lg text-subtle">
            Скасувати
          </button>
        </div>
      </form>
    </Modal>
  );
}
