# TODO

Deferred work and known limitations. Each item says why it waits.

## Before launch

- [ ] **Real email delivery for password reset.** Now the reset link is only written to the server log (`[DEV ONLY]`), so a user can't reset a password on their own, and anyone with access to the Vercel logs could use the link. Plan: Resend via Vercel Marketplace (free tier), a sending domain, a Ukrainian email template. Code: `backend/src/auth/password-reset.mailer.ts`.
- [ ] **Own domain** for the frontend and email (sender address, Resend domain verification).
- [ ] **Vercel plan.** Hobby is for non-commercial use; move to Pro before taking paying businesses.
- [ ] **Run CI on every push again** (`.github/workflows/ci.yml`: add `push:` and `pull_request:`), once it is green.
- [ ] **`npm audit`** in `backend/`: 46 findings (1 critical) from Phase 1 dependencies; review and update.

## Native app (App Store)

- [ ] **Bearer mode for the native client.** The API already accepts `Authorization: Bearer <access token>`. Still needed: login/register/refresh returning tokens in the body for a native client (web keeps cookies only), refresh token from the request body.
- [ ] **Push channel for APNs/FCM** next to Web Push.

## Later

- [ ] **NestJS 12** (ESM-only) and **TypeScript 7**: upgrade as a separate step.
- [ ] **Neon region.** The database is in `us-east-1` (Washington); Ukrainian users get ~100 ms extra per request. Moving means a new database and a data copy.
- [ ] **Preview deployments** can't sign in: the API only accepts mutations from `FRONTEND_URL` (CSRF origin check).
