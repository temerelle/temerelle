"use client";
import { useState, useSyncExternalStore } from "react";
import { noopSubscribe } from "@/lib/authFlag";

// The public page link for Instagram, Viber, a QR code. The phone's share sheet where there is one, else copy
export function ShareLink({ code, name }: { code: string; name: string }) {
  // The origin only exists in the browser
  const origin = useSyncExternalStore(
    noopSubscribe,
    () => window.location.origin,
    () => "",
  );
  const url = `${origin}/b/${code}`;
  const [copied, setCopied] = useState(false);

  async function share() {
    if (navigator.share) {
      // Dismissing the sheet rejects: nothing to report
      await navigator.share({ title: name, url }).catch(() => {});
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="bg-surface border border-line rounded-xl p-4">
      <p className="text-sm text-subtle mb-1">Посилання для клієнтів</p>
      <p className="font-medium break-all mb-3">{url}</p>
      <button
        type="button"
        onClick={share}
        className="btn-primary w-full h-12 rounded-lg font-medium transition-colors"
      >
        {copied ? "Скопійовано" : "Поділитися посиланням"}
      </button>
    </div>
  );
}
