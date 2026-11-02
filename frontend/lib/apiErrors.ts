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
  // Businesses, services, schedule
  BUSINESS_NOT_FOUND: "Бізнес не знайдено",
  CODE_TAKEN: "Цей код уже зайнятий. Спробуйте інший.",
  INVALID_TIMEZONE: "Невідомий часовий пояс",
  SERVICE_NOT_FOUND: "Послугу не знайдено. Оновіть сторінку.",
  SCHEDULE_INVALID: "Перевірте години: кінець має бути після початку, інтервали не мають перетинатися.",
  EXCEPTION_NOT_FOUND: "Цей виняток уже видалено. Оновіть сторінку.",
  DATE_OUT_OF_RANGE: "Оберіть дату від сьогодні й не далі ніж на рік уперед.",
  // Bookings
  BOOKING_CONFLICT: "Цей час уже зайняли. Оберіть інший.",
  BOOKING_NOT_FOUND: "Запис не знайдено. Оновіть сторінку.",
  BOOKING_NOT_CHANGEABLE: "Цей запис уже не можна змінити. Оновіть сторінку.",
  OWN_BUSINESS: "Це ваш бізнес. Додайте запис у Календарі.",
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
