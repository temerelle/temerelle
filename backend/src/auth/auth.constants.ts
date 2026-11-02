export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
export const REFRESH_TOKEN_TTL_DAYS = 30;
export const RESET_TOKEN_TTL_MINUTES = 60;

// Two tabs refreshing at once both send the old refresh token; the slower one shouldn't count as theft
export const ROTATION_GRACE_SECONDS = 30;

export const ACCESS_COOKIE = 'access_token';
export const REFRESH_COOKIE = 'refresh_token';

// [limit, window in seconds] per key
export const RATE_LIMITS = {
  loginPerEmail: [10, 15 * 60],
  loginPerIp: [50, 15 * 60],
  registerPerIp: [10, 60 * 60],
  forgotPerEmail: [3, 60 * 60],
  forgotPerIp: [10, 60 * 60],
  resetPerIp: [20, 60 * 60],
} as const satisfies Record<string, readonly [number, number]>;
