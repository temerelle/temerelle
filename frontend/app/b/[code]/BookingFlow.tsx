"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, statusOf, type Business, type ClientBooking, type Service, type Slot } from "@/lib/api";
import { errorText } from "@/lib/apiErrors";
import { noopSubscribe, readAuthFlag } from "@/lib/authFlag";
import { addDays, longDay, todayIn, weekdayShort } from "@/lib/dates";
import { formatPrice } from "@/lib/money";
import { formatDuration } from "@/lib/schedule";

// Same horizon as the backend (BOOKING_RULES.horizonDays): today and 30 days on
const DAYS = 31;

// Service → day → time → review → request. Prices and durations are shown from the service, but the server
// takes them from its own data; the client only sends which service and which start
export function BookingFlow({ business, services }: { business: Business; services: Service[] }) {
  const router = useRouter();
  const signedIn = useSyncExternalStore<boolean | null>(noopSubscribe, readAuthFlag, () => null);
  const today = todayIn(business.timezone);
  const days = Array.from({ length: DAYS }, (_, i) => addDays(today, i));

  const [service, setService] = useState<Service | null>(null);
  const [date, setDate] = useState(today);
  const [slot, setSlot] = useState<Slot | null>(null);
  // Slots belong to one service and date; a stale answer is ignored by its key
  const [loaded, setLoaded] = useState<{ key: string; slots: Slot[] | null; error: string } | null>(null);
  const [reload, setReload] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<ClientBooking | null>(null);
  // The owner looking at their own page: a preview, no request button
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    api.myBusinesses().then(
      ({ items }) => setIsOwner(items.some((b) => b.id === business.id)),
      () => {},
    );
  }, [signedIn, business.id]);

  const key = service ? `${service.id}|${date}|${reload}` : "";
  const current = loaded?.key === key ? loaded : null;

  useEffect(() => {
    if (!service) return;
    let live = true;
    api.availability(business.id, service.id, date).then(
      ({ slots }) => live && setLoaded({ key, slots, error: "" }),
      (err) => live && setLoaded({ key, slots: null, error: errorText(err, "Не вдалося завантажити вільний час.") }),
    );
    return () => {
      live = false;
    };
  }, [business.id, service, date, key]);

  function chooseService(next: Service) {
    setService(next);
    setSlot(null);
    setError("");
  }

  function chooseDate(next: string) {
    setDate(next);
    setSlot(null);
    setError("");
  }

  async function submit() {
    if (!service || !slot) return;
    setBusy(true);
    setError("");
    try {
      setDone(await api.requestBooking({ businessId: business.id, serviceId: service.id, startsAt: slot.startsAt }));
    } catch (err) {
      if (statusOf(err) === 401) return router.push(`/login?next=${encodeURIComponent(`/b/${business.code}`)}`);
      setError(errorText(err, "Не вдалося надіслати запит. Спробуйте ще раз."));
      // Someone took the time, or it passed: show what is free now
      setSlot(null);
      setReload((n) => n + 1);
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <section className="bg-surface border border-line rounded-xl p-5 mb-8 text-center" role="status">
        <h2 className="text-lg mb-2">Запит надіслано</h2>
        <p className="text-body mb-1">
          {done.serviceName}, <span className="first-letter:uppercase">{longDay(date)}</span>, {slot?.time}
        </p>
        <p className="text-subtle text-sm mb-5">{business.name} підтвердить запис. Статус видно в «Моїх записах».</p>
        <Link
          href="/bookings"
          className="btn-primary flex items-center justify-center h-12 rounded-lg font-medium transition-colors"
        >
          Мої записи
        </Link>
      </section>
    );
  }

  return (
    <>
      <section className="mb-8">
        <h2 className="text-lg mb-3">Послуги</h2>
        {services.length === 0 ? (
          <p className="text-subtle">Послуг поки немає.</p>
        ) : (
          <ul className="space-y-3">
            {services.map((s) => {
              const selected = s.id === service?.id;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    onClick={() => chooseService(s)}
                    className={`w-full flex items-start justify-between text-left bg-surface border rounded-xl px-4 py-3 transition-colors ${
                      selected ? "border-primary ring-1 ring-primary" : "border-line hover:border-primary"
                    }`}
                  >
                    <span className="min-w-0 pr-3">
                      <span className="block font-medium text-heading break-words">{s.name}</span>
                      <span className="block text-sm text-subtle">{formatDuration(s.durationMinutes)}</span>
                    </span>
                    <span className="font-medium text-heading whitespace-nowrap">{formatPrice(s.priceMinor)}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
        {services.length > 0 && !service && (
          <p className="text-sm text-subtle mt-3">Оберіть послугу, щоб побачити вільний час.</p>
        )}
      </section>

      {service && (
        <section className="mb-8">
          <h2 className="text-lg mb-3">Коли</h2>
          <div className="flex overflow-x-auto -mx-4 px-4 pb-2 mb-4 space-x-2">
            {days.map((day) => {
              const selected = day === date;
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={selected}
                  aria-label={longDay(day)}
                  onClick={() => chooseDate(day)}
                  className={`shrink-0 w-14 h-16 flex flex-col items-center justify-center rounded-xl border transition-colors ${
                    selected ? "btn-primary border-primary" : "bg-surface border-line hover:border-primary"
                  }`}
                >
                  <span className={`text-xs ${selected ? "" : "text-subtle"}`}>{weekdayShort(day)}</span>
                  <span className="font-semibold">{Number(day.slice(8))}</span>
                </button>
              );
            })}
          </div>

          <p className="text-sm text-subtle mb-3 first-letter:uppercase">{longDay(date)}</p>
          {!current ? (
            <p className="text-subtle">Шукаємо вільний час…</p>
          ) : current.error ? (
            <p role="alert" className="text-danger">
              {current.error}
            </p>
          ) : current.slots?.length === 0 ? (
            <p className="text-subtle">На цей день вільного часу немає. Оберіть інший день.</p>
          ) : (
            <div className="flex flex-wrap -m-1">
              {current.slots?.map((s) => {
                const selected = s.startsAt === slot?.startsAt;
                return (
                  <button
                    key={s.startsAt}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => {
                      setSlot(s);
                      setError("");
                    }}
                    className={`m-1 w-[calc(25%-0.5rem)] h-11 rounded-lg border font-medium transition-colors ${
                      selected ? "btn-primary border-primary" : "bg-surface border-line hover:border-primary"
                    }`}
                  >
                    {s.time}
                  </button>
                );
              })}
            </div>
          )}
        </section>
      )}

      {error && (
        <p role="alert" className="text-danger mb-4">
          {error}
        </p>
      )}

      {service && slot && (
        <section className="bg-surface border border-line rounded-xl p-5 mb-8">
          <h2 className="text-lg mb-3">Ваш запис</h2>
          <dl className="space-y-1 text-sm mb-4">
            <Row label="Послуга" value={service.name} />
            <Row label="Дата" value={longDay(date)} />
            <Row label="Час" value={`${slot.time}, ${formatDuration(service.durationMinutes)}`} />
            <Row label="Ціна" value={formatPrice(service.priceMinor)} />
          </dl>
          <p className="text-sm text-subtle mb-4">Після запиту {business.name} підтвердить запис. Оплата на місці.</p>
          {isOwner ? (
            <div className="text-sm text-body bg-background border border-line rounded-lg p-3">
              Це ваш бізнес: так клієнти бачать запис. Щоб записати когось самостійно, відкрийте{" "}
              <Link href="/business/calendar" className="text-primary hover:underline">
                Календар
              </Link>
              .
            </div>
          ) : signedIn === false ? (
            <Link
              href={`/login?next=${encodeURIComponent(`/b/${business.code}`)}`}
              className="btn-primary flex items-center justify-center h-12 rounded-lg font-medium transition-colors"
            >
              Увійти, щоб записатися
            </Link>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={busy}
              className="btn-primary w-full h-12 rounded-lg font-medium transition-colors disabled:opacity-60"
            >
              {busy ? "Надсилаємо…" : "Надіслати запит"}
            </button>
          )}
        </section>
      )}
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-subtle">{label}</dt>
      <dd className="text-right font-medium text-heading first-letter:uppercase">{value}</dd>
    </div>
  );
}
