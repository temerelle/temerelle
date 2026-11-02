import type { BadgeTone } from "@/components/ui/Badge";
import type { BookingStatus } from "./api";

// One wording and color per status, for clients and owners alike
export const STATUS: Record<BookingStatus, { label: string; tone: BadgeTone }> = {
  pending: { label: "Очікує підтвердження", tone: "warn" },
  confirmed: { label: "Підтверджено", tone: "ok" },
  cancelled: { label: "Скасовано", tone: "danger" },
  completed: { label: "Завершено", tone: "none" },
};

// The time is still held for these
export const isActive = (status: BookingStatus) => status === "pending" || status === "confirmed";
