import { ApiError } from "./api";

// Code → Ukrainian text; codes come from backend/src/common/api-error.ts (a test keeps the lists in step)
export const ERROR_TEXT: Record<string, string> = {
  // Auth
  EMAIL_TAKEN: "Акаунт з цією поштою вже існує. Увійдіть або відновіть пароль.",
  INVALID_CREDENTIALS: "Неправильна пошта або пароль",
  TOO_MANY_ATTEMPTS: "Забагато спроб. Спробуйте трохи пізніше.",
  SESSION_EXPIRED: "Сесія завершилась. Увійдіть знову.",
  INVALID_RESET_TOKEN: "Посилання недійсне або застаріло. Запросіть нове.",
  WRONG_PASSWORD: "Неправильний пароль",
  OWNER_HAS_BUSINESSES: "Акаунт власника бізнесу поки не можна видалити.",
  FORBIDDEN_ORIGIN: "Запит відхилено з міркувань безпеки. Оновіть сторінку.",
  // Bookings
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
