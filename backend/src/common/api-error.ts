// User-facing errors by stable code; the frontend maps the code to its own text (frontend/lib/apiErrors.ts).
// Messages may be reworded, codes never change. Body: { code, message }. Codes are added with the features
export const API_ERRORS = {
  // Auth
  EMAIL_TAKEN: 'Email is already registered',
  INVALID_CREDENTIALS: 'Wrong email or password',
  TOO_MANY_ATTEMPTS: 'Too many attempts, try again later',
  SESSION_EXPIRED: 'Session expired, sign in again',
  INVALID_RESET_TOKEN: 'Reset link is invalid or expired',
  WRONG_PASSWORD: 'Wrong password',
  OWNER_HAS_BUSINESSES: 'Account owns businesses',
  FORBIDDEN_ORIGIN: 'Request origin is not allowed',
  // Bookings
  BOOKING_CONFLICT: 'Time is already taken',
} as const;

export type ApiErrorCode = keyof typeof API_ERRORS;

// `message` can word the error for one place
export const apiError = (code: ApiErrorCode, message: string = API_ERRORS[code]) => ({ code, message });
