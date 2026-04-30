# Production Readiness Checklist

Use this checklist before promoting Turpial Sound Core to Preview or Production. Do not paste secret values into docs, issues, PRs, or chat.

## Environment Gate

- [ ] Run `node scripts/checks/env-readiness-check.mjs` in the target environment.
- [ ] Run `node scripts/checks/env-readiness-check.mjs --strict` before production release.
- [ ] Confirm the script prints no secret values.
- [ ] Confirm `NODE_ENV` and `VERCEL_ENV` match the intended target.
- [ ] Confirm no production check is running against a local/test database by mistake.

## Database

- [ ] `DATABASE_URL` exists for runtime.
- [ ] `DIRECT_URL` exists for Prisma CLI operations.
- [ ] The DB target is explicitly identified as local, preview, staging, or production.
- [ ] Schema/migration state is verified by the user before production traffic.
- [ ] No QA smoke is run against production data.

## Booking Core

- [ ] `/reservas` loads in the target environment.
- [ ] `/admin` loads for authorized internal operation.
- [ ] Public booking submit creates one request with a `publicCode`.
- [ ] Resource assignment and availability are manually checked after atomicity's pending concurrent smoke/QA is run in a safe DB environment.
- [ ] Expiration behavior is manually checked after scheduler configuration.

## Manual Payments

- [ ] Pago Movil details are configured or intentionally left as fallback.
- [ ] Transfer details are configured or intentionally left as fallback.
- [ ] Binance details are configured or intentionally left as fallback.
- [ ] Customer payment window remains operationally correct.
- [ ] `payment_reported` is reviewed manually and is not auto-expired.

## Email Resend

- [ ] `RESEND_API_KEY` is present in the target environment.
- [ ] `BOOKINGS_EMAIL_FROM` is a verified sender.
- [ ] `BOOKINGS_ADMIN_NOTIFICATIONS_EMAIL` points to the operational inbox.
- [ ] Customer and admin email flows are manually checked in Preview.

## Google Calendar

- [ ] `GOOGLE_CLIENT_ID` is present.
- [ ] `GOOGLE_CLIENT_SECRET` is present.
- [ ] `GOOGLE_REFRESH_TOKEN` is present and belongs to the operational account.
- [ ] `GOOGLE_CALENDAR_ID` points to the central shared calendar.
- [ ] `GOOGLE_CALENDAR_TIMEZONE` is `America/Caracas`.
- [ ] Calendar create/update/expired transitions are manually checked in Preview.

## Blob And Payment Proofs

- [ ] `BLOB_READ_WRITE_TOKEN` is present.
- [ ] Payment proof uploads accept only `image/jpeg`.
- [ ] Private proof files are not publicly exposed.
- [ ] Admin proof review links are tested without leaking token values.

## BCV And Rates

- [ ] Default rate providers are acceptable for the target environment.
- [ ] Optional provider overrides are documented outside the repo if used.
- [ ] Emergency fallback rate is operationally acceptable.
- [ ] `/api/bcv-rate` is checked in Preview without exposing internal tokens.

## Cron Expiration

- [ ] `BOOKINGS_EXPIRE_CRON_SECRET` is present in Preview/Production.
- [ ] Vercel Cron or external scheduler calls `POST /api/bookings/expire`.
- [ ] The scheduler uses `Authorization: Bearer <secret>`.
- [ ] Missing or invalid bearer returns unauthorized and does not expire bookings.
- [ ] Expiration excludes `payment_reported` and active payment proofs.

## WhatsApp

- [ ] No automated WhatsApp delivery is assumed for this release.

## Operational Control

- [ ] **Production control is solely managed by Jean.** This checklist supports Jean's validation process.

## Release Boundaries

- [ ] **Do not paste secret values into prompts, issues, or PRs.**
- [ ] **Do not use production databases for QA or testing.**
- [ ] Marketplace and `Mp*` models are outside Core release validation.
- [ ] No `.env` file is committed.
- [ ] No secrets are printed in logs or docs.
- [ ] No migration, DB merge, or `main` merge is delegated to agents.
- [ ] **Env/Ops is approved.**
- [ ] **Expiration is approved.**
- [ ] **Atomicidad is technically approved; concurrent smoke/QA remains pending until DB local/test or explicit Neon test exists.**
- [ ] Atomicity's pending concurrent validation is not run against production.
