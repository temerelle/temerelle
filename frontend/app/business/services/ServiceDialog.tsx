"use client";
import { useState, type FormEvent } from "react";
import { api, type Service } from "@/lib/api";
import { errorText } from "@/lib/apiErrors";
import { parsePrice, priceInputValue } from "@/lib/money";
import { formatDuration } from "@/lib/schedule";
import { Modal } from "@/components/ui/Modal";
import { Field } from "@/components/ui/Field";

// 15 minutes to 8 hours; the API allows up to 12
const DURATIONS = Array.from({ length: 32 }, (_, i) => (i + 1) * 15);

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
  const [duration, setDuration] = useState(service?.durationMinutes ?? 60);
  const [price, setPrice] = useState(service ? priceInputValue(service.priceMinor) : "");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const priceMinor = parsePrice(price);
    if (priceMinor === null) return setError("Вкажіть ціну числом, наприклад 500 або 499,50");
    setBusy(true);
    setError("");
    const input = { name, durationMinutes: duration, priceMinor };
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
        <div>
          <label htmlFor="service-duration" className="block text-sm font-medium text-body mb-1.5">
            Тривалість
          </label>
          <select
            id="service-duration"
            className="input-field border w-full h-12 px-4 rounded-lg"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
          >
            {DURATIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {formatDuration(minutes)}
              </option>
            ))}
          </select>
        </div>
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
