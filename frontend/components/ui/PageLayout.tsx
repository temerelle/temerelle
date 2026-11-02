import type { ReactNode } from "react";
import { Wordmark } from "./Wordmark";
import { Header } from "./Header";
import { Loader } from "./Loader";

interface PageLayoutProps {
  children?: ReactNode;
  variant?: "centered" | "top";
  className?: string;
  action?: ReactNode;
  loading?: boolean;
}

export function PageLayout({ children, variant = "centered", className, action, loading }: PageLayoutProps) {
  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader />
      </div>
    );
  }

  // Bottom room incl. the iPhone home indicator; not on centered pages, where it would push content off center
  if (variant === "top") {
    return (
      <div className="flex flex-col flex-1 pb-[calc(3rem+env(safe-area-inset-bottom))]">
        <Header action={action} />
        {children}
      </div>
    );
  }

  return (
    <div className={`flex-1 flex flex-col justify-center${className ? ` ${className}` : ""}`}>
      <div className="-mt-10">
        <Wordmark className="block text-center text-3xl mb-8" />
        {children}
      </div>
    </div>
  );
}
