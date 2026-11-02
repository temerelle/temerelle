import type { ReactNode } from "react";
import Link from "next/link";
import { PageLayout } from "@/components/ui/PageLayout";

// Frame of the owner screens: back link to the business home, title, loading and error states
export function OwnerPage({
  title,
  back = { href: "/business", label: "Мій бізнес" },
  loading,
  error,
  children,
}: {
  title: string;
  back?: { href: string; label: string };
  loading?: boolean;
  error?: string;
  children?: ReactNode;
}) {
  if (error) {
    return (
      <PageLayout className="text-center">
        <p role="alert" className="text-danger">
          {error}
        </p>
      </PageLayout>
    );
  }
  if (loading) return <PageLayout loading />;
  return (
    <PageLayout variant="top">
      <Link href={back.href} className="text-sm text-primary hover:underline">
        ← {back.label}
      </Link>
      <h1 className="text-2xl mt-2 mb-6">{title}</h1>
      {children}
    </PageLayout>
  );
}
