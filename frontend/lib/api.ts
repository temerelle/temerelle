import type { HealthResponse } from "./apiTypes";

// Callers import the types from here, together with `api`
export type * from "./apiTypes";

// Same origin: next.config.ts rewrites /api/* to the backend, so session cookies stay first-party
const BASE = "/api/v1";

// A non-2xx answer; show it to people through errorText, never the raw message
export class ApiError extends Error {
  status: number;
  body: Record<string, unknown>;

  constructor(message: string, status: number, body: Record<string, unknown>) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

// undefined when there was no HTTP answer (network failure)
export function statusOf(err: unknown): number | undefined {
  return err instanceof ApiError ? err.status : undefined;
}

async function request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: "include",
    ...(body !== undefined && { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.message ?? res.statusText, res.status, body);
  }
  // NestJS sends an empty body for null. No runtime schema: both sides live in this repo and change together.
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

const get = <T>(path: string) => request<T>(path);

export const api = {
  health: () => get<HealthResponse>("/health"),
};
