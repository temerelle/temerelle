"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { errorText } from "@/lib/apiErrors";
import { AuthCard } from "@/components/auth/AuthCard";
import { Field } from "@/components/ui/Field";
import { PageLayout } from "@/components/ui/PageLayout";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.forgotPassword(email);
      setSent(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  // Honest about the missing email delivery (TODO.md): no "check your inbox"
  if (sent) {
    return (
      <PageLayout className="text-center">
        <h1 className="text-2xl mb-3">Запит прийнято</h1>
        <p className="text-subtle mb-6 max-w-sm mx-auto">
          Якщо акаунт з цією поштою існує, посилання для відновлення створено. Листи поки не надсилаються, тож
          зверніться до адміністратора Temerelle.
        </p>
        <Link href="/login" className="text-primary hover:underline">
          Повернутися до входу
        </Link>
      </PageLayout>
    );
  }

  return (
    <AuthCard
      title="Відновлення пароля"
      onSubmit={submit}
      error={error}
      busy={busy}
      submitLabel="Відновити пароль"
      footer={
        <Link href="/login" className="text-primary hover:underline">
          Повернутися до входу
        </Link>
      }
    >
      <Field
        label="Пошта акаунта"
        type="email"
        autoComplete="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
    </AuthCard>
  );
}
