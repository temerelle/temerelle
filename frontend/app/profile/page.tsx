"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, statusOf, type User } from "@/lib/api";
import { errorText } from "@/lib/apiErrors";
import { PageLayout } from "@/components/ui/PageLayout";
import { Field } from "@/components/ui/Field";
import { DeleteAccountDialog } from "./DeleteAccountDialog";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loadError, setLoadError] = useState("");
  const [form, setForm] = useState({ name: "", phone: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [deleting, setDeleting] = useState(false);
  // null until known: the link reads "Мій бізнес" or "Створити бізнес"
  const [hasBusiness, setHasBusiness] = useState<boolean | null>(null);

  useEffect(() => {
    api.me().then(
      ({ user }) => {
        setUser(user);
        setForm({ name: user.name, phone: user.phone ?? "" });
      },
      (err) => {
        // The proxy saw a refresh cookie, but the session is over
        if (statusOf(err) === 401) router.replace("/login?next=/profile");
        else setLoadError(errorText(err, "Не вдалося завантажити профіль."));
      },
    );
  }, [router]);

  useEffect(() => {
    api.myBusinesses().then(
      ({ items }) => setHasBusiness(items.length > 0),
      () => setHasBusiness(null),
    );
  }, []);

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const { user } = await api.updateProfile({ name: form.name, phone: form.phone });
      setUser(user);
      setMessage({ ok: true, text: "Збережено" });
    } catch (err) {
      setMessage({ ok: false, text: errorText(err, "Не вдалося зберегти. Перевірте дані.") });
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    // Signed out on this device even if the request fails: the cookies are httpOnly, only the server clears them
    await api.logout().catch(() => {});
    router.replace("/");
    router.refresh();
  }

  if (loadError) {
    return (
      <PageLayout className="text-center">
        <p className="text-danger">{loadError}</p>
      </PageLayout>
    );
  }
  if (!user) return <PageLayout loading />;

  return (
    <PageLayout variant="top">
      <h1 className="text-2xl mb-1">Профіль</h1>
      <p className="text-subtle mb-6">{user.email}</p>

      <form onSubmit={save} className="space-y-4 mb-10">
        <Field
          label="Ім'я"
          autoComplete="name"
          required
          maxLength={100}
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <Field
          label="Телефон"
          type="tel"
          autoComplete="tel"
          placeholder="+380 67 123 45 67"
          pattern="\+?[0-9 ()\-]{7,20}"
          value={form.phone}
          onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
        />
        {message && (
          <p role="status" className={`text-sm ${message.ok ? "text-primary" : "text-danger"}`}>
            {message.text}
          </p>
        )}
        <button
          type="submit"
          disabled={saving}
          className="btn-primary w-full h-12 rounded-lg font-medium transition-colors disabled:opacity-60"
        >
          {saving ? "Зберігаємо…" : "Зберегти"}
        </button>
      </form>

      <Link
        href="/bookings"
        className="block bg-surface border border-line rounded-xl px-4 py-4 mb-3 hover:border-primary transition-colors"
      >
        <span className="block font-medium text-heading">Мої записи</span>
        <span className="block text-sm text-subtle">Майбутні й минулі, статус запитів</span>
      </Link>

      {hasBusiness !== null && (
        <Link
          href={hasBusiness ? "/business" : "/business/new"}
          className="block bg-surface border border-line rounded-xl px-4 py-4 mb-6 hover:border-primary transition-colors"
        >
          <span className="block font-medium text-heading">{hasBusiness ? "Мій бізнес" : "У мене є бізнес"}</span>
          <span className="block text-sm text-subtle">
            {hasBusiness
              ? "Послуги, розклад, посилання для клієнтів"
              : "Створіть сторінку, щоб клієнти записувалися онлайн"}
          </span>
        </Link>
      )}

      <div className="space-y-3 border-t border-line pt-6">
        <button
          type="button"
          onClick={logout}
          className="btn-secondary border w-full h-12 rounded-lg font-medium transition-colors"
        >
          Вийти
        </button>
        <button type="button" onClick={() => setDeleting(true)} className="w-full h-12 rounded-lg text-danger">
          Видалити акаунт
        </button>
      </div>

      {deleting && (
        <DeleteAccountDialog
          onClose={() => setDeleting(false)}
          onDeleted={() => {
            router.replace("/");
            router.refresh();
          }}
        />
      )}
    </PageLayout>
  );
}
