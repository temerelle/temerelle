import type { Metadata } from "next";
import { Suspense } from "react";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Реєстрація · Temerelle" };

// Suspense: the form reads ?next= from the URL
export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
