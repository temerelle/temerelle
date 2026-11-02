"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { api, type Business } from "@/lib/api";
import { errorText } from "@/lib/apiErrors";
import { PageLayout } from "@/components/ui/PageLayout";

const MIN_QUERY = 2;
const DEBOUNCE_MS = 300;

// Public: no account needed to look around
export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ query: string; items: Business[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const q = query.trim();
    if (q.length < MIN_QUERY) return;
    // Waits for a pause in typing; an older answer can't overwrite a newer one
    let current = true;
    const timer = setTimeout(() => {
      api.searchBusinesses(q).then(
        ({ items }) => current && (setResults({ query: q, items }), setError("")),
        (err) => current && setError(errorText(err, "Не вдалося виконати пошук.")),
      );
    }, DEBOUNCE_MS);
    return () => {
      current = false;
      clearTimeout(timer);
    };
  }, [query]);

  const q = query.trim();
  const shown = q.length >= MIN_QUERY && results?.query === q ? results.items : null;

  return (
    <PageLayout variant="top">
      <h1 className="text-2xl mb-4">Пошук</h1>
      <label htmlFor="search" className="sr-only">
        Назва або код бізнесу
      </label>
      <input
        id="search"
        type="search"
        autoFocus
        placeholder="Назва або код бізнесу"
        className="input-field border w-full h-12 px-4 rounded-lg mb-6"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />

      {error && (
        <p role="alert" className="text-danger">
          {error}
        </p>
      )}
      {q.length < MIN_QUERY && <p className="text-subtle">Введіть щонайменше {MIN_QUERY} символи.</p>}
      {shown?.length === 0 && <p className="text-subtle">Нічого не знайдено. Спробуйте іншу назву або код.</p>}
      {shown && shown.length > 0 && (
        <ul className="space-y-3">
          {shown.map((business) => (
            <li key={business.id}>
              <Link
                href={`/b/${business.code}`}
                className="block bg-surface border border-line rounded-xl px-4 py-4 hover:border-primary transition-colors"
              >
                <span className="block font-medium text-heading">{business.name}</span>
                {business.description && (
                  <span className="block text-sm text-subtle line-clamp-2">{business.description}</span>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </PageLayout>
  );
}
