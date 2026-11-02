"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { api, type User } from "@/lib/api";
import { noopSubscribe, readAuthFlag } from "@/lib/authFlag";
import { PageLayout } from "@/components/ui/PageLayout";

// undefined = still checking; null = signed out
type Me = User | null | undefined;

// Placeholder start page until the customer and owner screens (Phase 5)
export default function HomePage() {
  // null on the server and during hydration
  const flag = useSyncExternalStore<boolean | null>(noopSubscribe, readAuthFlag, () => null);
  const [fetched, setFetched] = useState<Me>(undefined);

  // No flag: signed out for sure, so no API call (and no 401 in the console)
  useEffect(() => {
    if (!flag) return;
    api.me().then(
      ({ user }) => setFetched(user),
      () => setFetched(null),
    );
  }, [flag]);

  const me: Me = flag === false ? null : fetched;
  if (flag === null || me === undefined) return <PageLayout loading />;

  return (
    <PageLayout className="items-center text-center">
      <h1 className="text-2xl mb-2">Your time, beautifully organized.</h1>
      <p className="text-subtle mb-8">Онлайн-запис для малого бізнесу.</p>

      {me ? (
        <div className="space-y-4">
          <p>Вітаємо, {me.name}!</p>
          <Link
            href="/profile"
            className="btn-secondary border inline-flex items-center justify-center h-12 px-6 rounded-lg font-medium transition-colors"
          >
            Профіль
          </Link>
        </div>
      ) : (
        <div className="w-full max-w-xs mx-auto flex flex-col space-y-3">
          <Link
            href="/login"
            className="btn-primary flex items-center justify-center h-12 rounded-lg font-medium transition-colors"
          >
            Увійти
          </Link>
          <Link
            href="/register"
            className="btn-secondary border flex items-center justify-center h-12 rounded-lg font-medium transition-colors"
          >
            Створити акаунт
          </Link>
        </div>
      )}
    </PageLayout>
  );
}
