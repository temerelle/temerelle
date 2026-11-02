import type { Metadata } from "next";
import { Suspense } from "react";
import { ResetPasswordForm } from "./ResetPasswordForm";

export const metadata: Metadata = { title: "Новий пароль · Temerelle", referrer: "no-referrer" };

// Suspense: the form reads ?token= from the URL. no-referrer: the token never leaks to another site
export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
