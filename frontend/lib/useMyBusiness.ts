"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, statusOf, type OwnBusiness } from "./api";
import { errorText } from "./apiErrors";

// The owner screens work with one business (MVP UI); the API allows more. No business yet: to the create form.
// Signed out: to sign-in, back here after
export function useMyBusiness(backTo: string) {
  const router = useRouter();
  const [business, setBusiness] = useState<OwnBusiness | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api.myBusinesses().then(
      ({ items }) => {
        if (items.length) setBusiness(items[0]);
        else router.replace("/business/new");
      },
      (err) => {
        if (statusOf(err) === 401) router.replace(`/login?next=${encodeURIComponent(backTo)}`);
        else setError(errorText(err, "Не вдалося завантажити бізнес."));
      },
    );
  }, [router, backTo]);

  return { business, setBusiness, error };
}
