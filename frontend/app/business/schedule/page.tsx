"use client";
import { useEffect, useState } from "react";
import { api, type ScheduleException, type WeekSchedule } from "@/lib/api";
import { errorText } from "@/lib/apiErrors";
import { useMyBusiness } from "@/lib/useMyBusiness";
import { OwnerPage } from "@/components/business/OwnerPage";
import { WeekEditor } from "./WeekEditor";
import { ExceptionsEditor } from "./ExceptionsEditor";

export default function SchedulePage() {
  const { business, error: businessError } = useMyBusiness("/business/schedule");
  const [data, setData] = useState<{ week: WeekSchedule; exceptions: ScheduleException[] } | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!business) return;
    Promise.all([api.schedule(business.id), api.exceptions(business.id)]).then(
      ([week, { items }]) => setData({ week, exceptions: items }),
      (err) => setError(errorText(err, "Не вдалося завантажити розклад.")),
    );
  }, [business]);

  const errorMessage = businessError || error;
  return (
    <OwnerPage title="Розклад" loading={!errorMessage && !data} error={errorMessage}>
      {business && data && (
        <div className="space-y-10">
          <WeekEditor businessId={business.id} initial={data.week.days} />
          <ExceptionsEditor businessId={business.id} timezone={data.week.timezone} initial={data.exceptions} />
        </div>
      )}
    </OwnerPage>
  );
}
