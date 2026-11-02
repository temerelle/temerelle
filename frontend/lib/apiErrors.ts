import { ApiError } from "./api";

// Code → Ukrainian text; codes come from backend/src/common/api-error.ts (a test keeps the lists in step)
export const ERROR_TEXT: Record<string, string> = {
  BOOKING_CONFLICT: "Цей час уже зайняли. Оберіть інший.",
};

export const DEFAULT_ERROR = "Помилка. Спробуйте ще раз.";

// Never shows the backend's English: no code, an unknown one or a network failure gives `fallback`.
// `own` overrides the wording for one place.
export function errorText(err: unknown, fallback = DEFAULT_ERROR, own: Record<string, string> = {}): string {
  const code = err instanceof ApiError ? err.body.code : undefined;
  if (typeof code !== "string") return fallback;
  if (has(own, code)) return own[code];
  return has(ERROR_TEXT, code) ? ERROR_TEXT[code] : fallback;
}

// Own keys only (not "constructor"); Object.hasOwn is missing on iOS before 15.4
const has = (table: Record<string, string>, key: string) => Object.prototype.hasOwnProperty.call(table, key);
