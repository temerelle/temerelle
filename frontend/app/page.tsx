"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type User } from "@/lib/api";
import { PageLayout } from "@/components/ui/PageLayout";

// undefined = still checking; null = signed out
type Me = User | null | undefined;

// Placeholder start page until the customer and owner screens (Phase 5)
export default function HomePage() {
  const [me, setMe] = useState<Me>(undefined);

  useEffect(() => {
    api.me().then(
      ({ user }) => setMe(user),
      () => setMe(null),
    );
  }, []);

  if (me === undefined) return <PageLayout loading />;

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
