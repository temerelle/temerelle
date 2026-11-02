"use client";
import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { PageLayout } from "@/components/ui/PageLayout";

type Status = "checking" | "ok" | "down";

// Phase 1 placeholder: brand and a live API check. Real screens come in Phase 5
export default function HomePage() {
  const [status, setStatus] = useState<Status>("checking");

  const check = useCallback(() => {
    api.health().then(
      () => setStatus("ok"),
      () => setStatus("down"),
    );
  }, []);

  useEffect(check, [check]);

  const retry = () => {
    setStatus("checking");
    check();
  };

  return (
    <PageLayout className="items-center text-center">
      <h1 className="text-2xl mb-2">Your time, beautifully organized.</h1>
      <p className="text-subtle mb-8">Онлайн-запис для малого бізнесу. Скоро тут.</p>

      <p role="status" className="text-sm text-subtle">
        {status === "checking" && "Перевіряємо сервер…"}
        {status === "ok" && <span className="text-primary">Сервер працює</span>}
        {status === "down" && <span className="text-danger">Сервер недоступний</span>}
      </p>
      {status === "down" && (
        <button
          type="button"
          onClick={retry}
          className="btn-secondary border mt-4 px-5 py-3 rounded-lg font-medium transition-colors"
        >
          Спробувати ще раз
        </button>
      )}
    </PageLayout>
  );
}
