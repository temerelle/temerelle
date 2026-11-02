import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { Business, Service, WeekSchedule } from "@/lib/api";
import { formatPrice } from "@/lib/money";
import { formatDuration, formatIntervals, WEEKDAYS_SHORT } from "@/lib/schedule";
import { PageLayout } from "@/components/ui/PageLayout";

// The link a business shares (Instagram, Viber, a QR code). Rendered on the server: the link preview gets the
// business name, and the page shows without waiting for JS. Public data only
const BACKEND = process.env.BACKEND_URL ?? "http://localhost:3001";

async function fetchJson<T>(path: string): Promise<T | null> {
  const res = await fetch(`${BACKEND}/api/v1${path}`, { cache: "no-store" });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GET ${path}: ${res.status}`);
  return (await res.json()) as T;
}

// One request per page view, shared by the metadata and the page
const load = cache(async (code: string) => {
  const business = await fetchJson<Business>(`/businesses/${encodeURIComponent(code)}`);
  if (!business) return null;
  const [services, schedule] = await Promise.all([
    fetchJson<{ items: Service[] }>(`/businesses/${business.id}/services`),
    fetchJson<WeekSchedule>(`/businesses/${business.id}/schedule`),
  ]);
  return { business, services: services?.items ?? [], schedule };
});

type Props = { params: Promise<{ code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await load((await params).code);
  if (!data) return { title: "Не знайдено · Temerelle" };
  return {
    title: `${data.business.name} · Temerelle`,
    description: data.business.description || `Послуги та запис: ${data.business.name}`,
  };
}

export default async function BusinessPage({ params }: Props) {
  const data = await load((await params).code);
  if (!data) notFound();
  const { business, services, schedule } = data;

  return (
    <PageLayout variant="top">
      <h1 className="text-2xl mb-2 break-words">{business.name}</h1>
      {business.description && <p className="text-body whitespace-pre-line mb-6">{business.description}</p>}

      <section className="mb-8">
        <h2 className="text-lg mb-3">Послуги</h2>
        {services.length === 0 ? (
          <p className="text-subtle">Послуг поки немає.</p>
        ) : (
          <ul className="space-y-3">
            {services.map((service) => (
              <li
                key={service.id}
                className="flex items-start justify-between bg-surface border border-line rounded-xl px-4 py-3"
              >
                <span className="min-w-0 pr-3">
                  <span className="block font-medium text-heading break-words">{service.name}</span>
                  <span className="block text-sm text-subtle">{formatDuration(service.durationMinutes)}</span>
                </span>
                <span className="font-medium text-heading whitespace-nowrap">{formatPrice(service.priceMinor)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {schedule && (
        <section className="mb-8">
          <h2 className="text-lg mb-3">Години роботи</h2>
          <dl className="bg-surface border border-line rounded-xl px-4 py-3 space-y-1">
            {schedule.days.map((day) => (
              <div key={day.dayOfWeek} className="flex justify-between text-sm">
                <dt className="text-subtle">{WEEKDAYS_SHORT[day.dayOfWeek - 1]}</dt>
                <dd className="text-right">{formatIntervals(day.intervals)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      {/* Booking comes in Phase 4; until then say so instead of a button that does nothing */}
      <p className="text-subtle text-center mb-4">Онлайн-запис з&apos;явиться найближчим часом.</p>
      <Link href="/search" className="block text-center text-sm text-primary hover:underline">
        Шукати інший бізнес
      </Link>
    </PageLayout>
  );
}
