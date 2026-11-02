import type { ReactNode } from "react";
import { Wordmark } from "./Wordmark";

export function Header({ action }: { action?: ReactNode }) {
  return (
    <header className="flex items-center justify-between py-4 mb-4">
      <Wordmark className="text-xl" />
      {action}
    </header>
  );
}
