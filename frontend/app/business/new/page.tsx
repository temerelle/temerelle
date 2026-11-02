"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { errorText } from "@/lib/apiErrors";
import { OwnerPage } from "@/components/business/OwnerPage";
import { Field } from "@/components/ui/Field";
import { TextArea } from "@/components/ui/TextArea";

export default function NewBusinessPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", description: "", code: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createBusiness({
        name: form.name,
        description: form.description || undefined,
        code: form.code.trim().toLowerCase() || undefined,
      });
      router.replace("/business");
    } catch (err) {
      setError(errorText(err, "Не вдалося створити бізнес. Перевірте дані."));
      setBusy(false);
    }
  }

  return (
    <OwnerPage title="Створити бізнес" back={{ href: "/profile", label: "Профіль" }}>
      <form onSubmit={submit} className="space-y-4">
        <Field
          label="Назва"
          required
          maxLength={100}
          placeholder="Наприклад, AquaWash"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <TextArea
          label="Опис (необов'язково)"
          maxLength={1000}
          placeholder="Що ви робите, де вас знайти"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        <Field
          label="Код для пошуку (необов'язково)"
          maxLength={32}
          pattern="[a-zA-Z0-9][a-zA-Z0-9\-]{1,30}[a-zA-Z0-9]"
          hint="Латиниця, цифри й дефіс. Якщо залишити порожнім, створимо з назви."
          value={form.code}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
        />
        {error && (
          <p role="alert" className="text-sm text-danger">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="btn-primary w-full h-12 rounded-lg font-medium transition-colors disabled:opacity-60"
        >
          {busy ? "Створюємо…" : "Створити"}
        </button>
      </form>
    </OwnerPage>
  );
}
