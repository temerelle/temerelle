import type { NextFunction, Request, Response } from 'express';
import { apiError } from './api-error';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// CSRF guard for cookie-authenticated mutations: a browser always sends Origin (and Sec-Fetch-Site) with a
// POST/PUT/PATCH/DELETE, so a page on another site is refused. No Origin = not a browser (native app, curl),
// which never sends our cookies on its own
export function originCheck(allowedOrigin: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (SAFE_METHODS.has(req.method)) return next();
    const origin = req.headers.origin;
    const crossSite = req.headers['sec-fetch-site'] === 'cross-site';
    if ((origin && origin !== allowedOrigin) || crossSite) {
      res.status(403).json(apiError('FORBIDDEN_ORIGIN'));
      return;
    }
    next();
  };
}
