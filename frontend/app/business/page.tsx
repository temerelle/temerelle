"use client";
import Link from "next/link";
import { useMyBusiness } from "@/lib/useMyBusiness";
import { OwnerPage } from "@/components/business/OwnerPage";
import { ShareLink } from "@/components/business/ShareLink";
import { Badge } from "@/components/ui/Badge";

const SECTIONS = [
  { href: "/business/services", title: "Послуги", text: "Що ви пропонуєте, скільки триває і коштує" },
  { href: "/business/schedule", title: "Розклад", text: "Робочі години, перерви, вихідні" },
  { href: "/business/settings", title: "Налаштування", text: "Назва, опис, код, прийом записів" },
];

// The owner's home until the dashboard with bookings (Phase 4)
export default function BusinessHomePage() {
  const { business, error } = useMyBusiness("/business");

  return (
    <OwnerPage
      title={business?.name ?? ""}
      back={{ href: "/profile", label: "Профіль" }}
      loading={!business && !error}
      error={error}
    >
      {business && (
        <div className="space-y-6">
          <Badge tone={business.isActive ? "ok" : "none"} size="status">
            {business.isActive ? "Приймає записи" : "Записи вимкнено"}
          </Badge>
          <ShareLink code={business.code} name={business.name} />
          <nav className="space-y-3">
            {SECTIONS.map((section) => (
              <Link
                key={section.href}
                href={section.href}
                className="block bg-surface border border-line rounded-xl px-4 py-4 hover:border-primary transition-colors"
              >
                <span className="block font-medium text-heading">{section.title}</span>
                <span className="block text-sm text-subtle">{section.text}</span>
              </Link>
            ))}
            <Link href={`/b/${business.code}`} className="block text-center text-sm text-primary hover:underline pt-2">
              Як бачать клієнти
            </Link>
          </nav>
        </div>
      )}
    </OwnerPage>
  );
}
