"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { errorText } from "@/lib/apiErrors";
import { AuthCard } from "@/components/auth/AuthCard";
import { Field } from "@/components/ui/Field";
import { PageLayout } from "@/components/ui/PageLayout";

export function ResetPasswordForm() {
  const token = useSearchParams().get("token") ?? "";
  const [password, setPassword] = useState("");
  const [repeat, setRepeat] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (password !== repeat) return setError("Паролі не збігаються");
    setBusy(true);
    setError("");
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(errorText(err, "Не вдалося змінити пароль. Спробуйте ще раз."));
    } finally {
      setBusy(false);
    }
  }

  if (!token || done) {
    return (
      <PageLayout className="text-center">
        <h1 className="text-2xl mb-3">{done ? "Пароль змінено" : "Посилання неповне"}</h1>
        <p className="text-subtle mb-6">
          {done ? "Увійдіть з новим паролем. На інших пристроях сесії завершено." : "Запросіть нове посилання."}
        </p>
        <Link href={done ? "/login" : "/forgot-password"} className="text-primary hover:underline">
          {done ? "Увійти" : "Відновити пароль"}
        </Link>
      </PageLayout>
    );
  }

  return (
    <AuthCard title="Новий пароль" onSubmit={submit} error={error} busy={busy} submitLabel="Зберегти пароль">
      <Field
        label="Новий пароль"
        type="password"
        autoComplete="new-password"
        required
        minLength={8}
        maxLength={128}
        hint="Щонайменше 8 символів"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Field
        label="Повторіть пароль"
        type="password"
        autoComplete="new-password"
        required
        value={repeat}
        onChange={(e) => setRepeat(e.target.value)}
      />
    </AuthCard>
  );
}
