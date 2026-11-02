// User-facing errors by stable code; the frontend maps the code to its own text (frontend/lib/apiErrors.ts).
// Messages may be reworded, codes never change. Body: { code, message }. Codes are added with the features
export const API_ERRORS = {
  BOOKING_CONFLICT: 'Time is already taken',
} as const;

export type ApiErrorCode = keyof typeof API_ERRORS;

// `message` can word the error for one place
export const apiError = (code: ApiErrorCode, message: string = API_ERRORS[code]) => ({ code, message });
