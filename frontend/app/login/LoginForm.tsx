"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import { errorText } from "@/lib/apiErrors";
import { safeNext } from "@/lib/safeNext";
import { AuthCard } from "@/components/auth/AuthCard";
import { Field } from "@/components/ui/Field";

export function LoginForm() {
  const router = useRouter();
  const next = safeNext(useSearchParams().get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.login(email, password);
      router.replace(next);
    } catch (err) {
      setError(errorText(err, "Не вдалося увійти. Спробуйте ще раз."));
      setBusy(false);
    }
  }

  return (
    <AuthCard
      title="Вхід"
      onSubmit={submit}
      error={error}
      busy={busy}
      submitLabel="Увійти"
      footer={
        <>
          <p>
            <Link href="/forgot-password" className="text-primary hover:underline">
              Забули пароль?
            </Link>
          </p>
          <p>
            Немає акаунта?{" "}
            <Link
              href={`/register${next !== "/" ? `?next=${encodeURIComponent(next)}` : ""}`}
              className="text-primary hover:underline"
            >
              Зареєструватися
            </Link>
          </p>
        </>
      }
    >
      <Field
        label="Пошта"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <Field
        label="Пароль"
        type="password"
        autoComplete="current-password"
        required
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
    </AuthCard>
  );
}
