"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { errorText } from "@/lib/apiErrors";
import { safeNext } from "@/lib/safeNext";
import { AuthCard } from "@/components/auth/AuthCard";
import { Field } from "@/components/ui/Field";

export function RegisterForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.register({ ...form, phone: form.phone || undefined });
      router.replace(next);
    } catch (err) {
      setError(errorText(err, "Не вдалося зареєструватися. Перевірте дані й спробуйте ще раз."));
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Реєстрація"
      onSubmit={submit}
      error={error}
      busy={busy}
      submitLabel="Створити акаунт"
      footer={
        <p>
          Вже є акаунт?{" "}
          <Link href="/login" className="text-primary hover:underline">
            Увійти
          </Link>
        </p>
      }
    >
      <Field label="Ім'я" autoComplete="name" required maxLength={100} value={form.name} onChange={set("name")} />
      <Field label="Пошта" type="email" autoComplete="email" required value={form.email} onChange={set("email")} />
      <Field
        label="Пароль"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={128}
        hint="Щонайменше 8 символів"
        value={form.password}
        onChange={set("password")}
      />
      <Field
        label="Телефон (необов'язково)"
        type="tel"
        autoComplete="tel"
        placeholder="+380 67 123 45 67"
        pattern="\+?[0-9 ()\-]{7,20}"
        value={form.phone}
        onChange={set("phone")}
      />
    </AuthCard>
  );
}
