import type { FormEvent, ReactNode } from "react";
import { PageLayout } from "@/components/ui/PageLayout";

interface AuthCardProps {
  title: string;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  error?: string;
  submitLabel: string;
  busy?: boolean;
  children: ReactNode;
  footer?: ReactNode;
}

// Shared frame of the sign-in, sign-up and password pages
export function AuthCard({ title, onSubmit, error, submitLabel, busy, children, footer }: AuthCardProps) {
  return (
    <PageLayout>
      <div className="w-full max-w-sm mx-auto">
        <h1 className="text-2xl text-center mb-6">{title}</h1>
        <form onSubmit={onSubmit} className="space-y-4" noValidate={false}>
          {children}
          {error && (
            <p role="alert" className="text-sm text-danger">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="btn-primary w-full h-12 rounded-lg font-medium transition-colors disabled:opacity-60"
          >
            {busy ? "Зачекайте…" : submitLabel}
          </button>
        </form>
        {footer && <div className="mt-6 text-center text-sm text-subtle space-y-2">{footer}</div>}
      </div>
    </PageLayout>
  );
}
