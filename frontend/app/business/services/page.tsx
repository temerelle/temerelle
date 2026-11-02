"use client";
import { useEffect, useState } from "react";
import { api, type Service } from "@/lib/api";
import { errorText } from "@/lib/apiErrors";
import { formatPrice } from "@/lib/money";
import { formatDuration } from "@/lib/schedule";
import { useMyBusiness } from "@/lib/useMyBusiness";
import { OwnerPage } from "@/components/business/OwnerPage";
import { Badge } from "@/components/ui/Badge";
import { ServiceDialog } from "./ServiceDialog";

export default function ServicesPage() {
  const { business, error: businessError } = useMyBusiness("/business/services");
  const [services, setServices] = useState<Service[] | null>(null);
  const [error, setError] = useState("");
  // undefined: no dialog; null: a new service
  const [editing, setEditing] = useState<Service | null | undefined>(undefined);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    if (!business) return;
    api.services(business.id, true).then(
      ({ items }) => setServices(items),
      (err) => setError(errorText(err, "Не вдалося завантажити послуги.")),
    );
  }, [business]);

  // Switched off, not deleted: past bookings keep the service, and it can come back
  async function toggle(service: Service) {
    if (!business) return;
    setToggling(service.id);
    try {
      const updated = await api.updateService(business.id, service.id, { isActive: !service.isActive });
      setServices((list) => list?.map((s) => (s.id === updated.id ? updated : s)) ?? null);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setToggling(null);
    }
  }

  // An edited one in place, a new one at the end
  const saved = (service: Service) => {
    setServices((list) => {
      const current = list ?? [];
      return current.some((s) => s.id === service.id)
        ? current.map((s) => (s.id === service.id ? service : s))
        : [...current, service];
    });
    setEditing(undefined);
  };

  const errorMessage = businessError || error;
  return (
    <OwnerPage title="Послуги" loading={!errorMessage && services === null} error={errorMessage}>
      {services && business && (
        <>
          {services.length === 0 ? (
            <p className="text-subtle mb-6">
              Послуг ще немає. Додайте першу, щоб клієнти бачили, на що можна записатися.
            </p>
          ) : (
            <ul className="space-y-3 mb-6">
              {services.map((service) => (
                <li
                  key={service.id}
                  className={`bg-surface border border-line rounded-xl p-4${service.isActive ? "" : " opacity-70"}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 pr-3">
                      <p className="font-medium text-heading break-words">{service.name}</p>
                      <p className="text-sm text-subtle">
                        {formatDuration(service.durationMinutes)} · {formatPrice(service.priceMinor)}
                      </p>
                    </div>
                    {!service.isActive && <Badge>Вимкнено</Badge>}
                  </div>
                  <div className="flex space-x-4 mt-3 text-sm">
                    <button type="button" className="text-primary py-2" onClick={() => setEditing(service)}>
                      Редагувати
                    </button>
                    <button
                      type="button"
                      className="text-subtle py-2 disabled:opacity-60"
                      disabled={toggling === service.id}
                      onClick={() => toggle(service)}
                    >
                      {service.isActive ? "Вимкнути" : "Увімкнути"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button
            type="button"
            onClick={() => setEditing(null)}
            className="btn-primary w-full h-12 rounded-lg font-medium transition-colors"
          >
            Додати послугу
          </button>
          {editing !== undefined && (
            <ServiceDialog
              businessId={business.id}
              service={editing ?? undefined}
              onClose={() => setEditing(undefined)}
              onSaved={saved}
            />
          )}
        </>
      )}
    </OwnerPage>
  );
}
