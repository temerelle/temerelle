import type { HealthResponse, User } from "./apiTypes";

// Callers import the types from here, together with `api`
export type * from "./apiTypes";

// Same origin: next.config.ts rewrites /api/* to the backend, so session cookies stay first-party
const BASE = "/api/v1";

type Ok = { ok: boolean };

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

// A 401 here is an answer, not an expired access token: no refresh and retry
const NO_REFRESH = new Set([
  "/auth/login",
  "/auth/register",
  "/auth/refresh",
  "/auth/logout",
  "/auth/forgot-password",
  "/auth/reset-password",
]);

// One refresh for all the requests that got a 401 at the same time
let refreshing: Promise<boolean> | null = null;
function refreshSession(): Promise<boolean> {
  refreshing ??= fetch(`${BASE}/auth/refresh`, { method: "POST", credentials: "include" })
    .then(
      (res) => res.ok,
      () => false,
    )
    .finally(() => {
      refreshing = null;
    });
  return refreshing;
}

async function request<T>(path: string, method = "GET", body?: unknown, retried = false): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    credentials: "include",
    ...(body !== undefined && { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  });
  // The access token lives 15 minutes; the refresh cookie gets a new one and the request runs once more
  if (res.status === 401 && !retried && !NO_REFRESH.has(path) && (await refreshSession())) {
    return request<T>(path, method, body, true);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(body.message ?? res.statusText, res.status, body);
  }
  // NestJS sends an empty body for null. No runtime schema: both sides live in this repo and change together.
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

const get = <T>(path: string) => request<T>(path);
const post = <T = Ok>(path: string, body?: unknown) => request<T>(path, "POST", body);
const patch = <T = Ok>(path: string, body?: unknown) => request<T>(path, "PATCH", body);
const del = <T = Ok>(path: string, body?: unknown) => request<T>(path, "DELETE", body);

export const api = {
  health: () => get<HealthResponse>("/health"),

  register: (input: { email: string; password: string; name: string; phone?: string }) =>
    post<{ user: User }>("/auth/register", input),
  login: (email: string, password: string) => post<{ user: User }>("/auth/login", { email, password }),
  logout: () => post("/auth/logout"),
  me: () => get<{ user: User }>("/auth/me"),
  updateProfile: (input: { name?: string; phone?: string }) => patch<{ user: User }>("/auth/me", input),
  forgotPassword: (email: string) => post("/auth/forgot-password", { email }),
  resetPassword: (token: string, password: string) => post("/auth/reset-password", { token, password }),
  deleteAccount: (password: string) => del("/auth/account", { password }),
};
