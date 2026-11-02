import type { CookieOptions, Response } from 'express';
import { ACCESS_COOKIE, ACCESS_TOKEN_TTL_SECONDS, REFRESH_COOKIE, REFRESH_TOKEN_TTL_DAYS } from './auth.constants';

// The browser gets them through the frontend's /api rewrite, so they belong to the frontend's host (first-party).
// Path '/': the frontend proxy checks the refresh cookie to tell signed-in visitors on page requests
function options(): CookieOptions {
  return { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' };
}

export function setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }) {
  res.cookie(ACCESS_COOKIE, tokens.accessToken, { ...options(), maxAge: ACCESS_TOKEN_TTL_SECONDS * 1000 });
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
    ...options(),
    maxAge: REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthCookies(res: Response) {
  res.clearCookie(ACCESS_COOKIE, options());
  res.clearCookie(REFRESH_COOKIE, options());
}
