// Where to go after sign-in: only a path on this site, never "//evil.example" or "https://…" (open redirect)
export function safeNext(next: string | null | undefined, fallback = "/"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
