"use client";
import { useState, type FormEvent } from "react";
import { api, type OwnBusiness } from "@/lib/api";
import { errorText } from "@/lib/apiErrors";
import { useMyBusiness } from "@/lib/useMyBusiness";
import { OwnerPage } from "@/components/business/OwnerPage";
import { Field } from "@/components/ui/Field";
import { TextArea } from "@/components/ui/TextArea";

export default function BusinessSettingsPage() {
  const { business, setBusiness, error } = useMyBusiness("/business/settings");

  return (
    <OwnerPage title="Налаштування" loading={!business && !error} error={error}>
      {/* key: the form starts from the loaded business */}
      {business && <SettingsForm key={business.id} business={business} onSaved={setBusiness} />}
    </OwnerPage>
  );
}

function SettingsForm({ business, onSaved }: { business: OwnBusiness; onSaved: (b: OwnBusiness) => void }) {
  const [form, setForm] = useState({
    name: business.name,
    description: business.description,
    code: business.code,
    isActive: business.isActive,
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      onSaved(await api.updateBusiness(business.id, { ...form, code: form.code.trim().toLowerCase() }));
      setMessage({ ok: true, text: "Збережено" });
    } catch (err) {
      setMessage({ ok: false, text: errorText(err, "Не вдалося зберегти. Перевірте дані.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field
        label="Назва"
        required
        maxLength={100}
        value={form.name}
        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
      />
      <TextArea
        label="Опис"
        maxLength={1000}
        value={form.description}
        onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
      />
      <Field
        label="Код для пошуку"
        required
        maxLength={32}
        pattern="[a-zA-Z0-9][a-zA-Z0-9\-]{1,30}[a-zA-Z0-9]"
        hint="Змінюється й посилання для клієнтів: старе перестане працювати."
        value={form.code}
        onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
      />
      <label className="flex items-start space-x-3 bg-surface border border-line rounded-xl p-4 cursor-pointer">
        <input
          type="checkbox"
          className="mt-1 h-5 w-5 accent-primary"
          checked={form.isActive}
          onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
        />
        <span>
          <span className="block font-medium text-heading">Приймати записи</span>
          <span className="block text-sm text-subtle">
            Якщо вимкнути, бізнес зникне з пошуку, а сторінка для клієнтів стане недоступною.
          </span>
        </span>
      </label>
      {message && (
        <p role="status" className={`text-sm ${message.ok ? "text-primary" : "text-danger"}`}>
          {message.text}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="btn-primary w-full h-12 rounded-lg font-medium transition-colors disabled:opacity-60"
      >
        {busy ? "Зберігаємо…" : "Зберегти"}
      </button>
    </form>
  );
}
