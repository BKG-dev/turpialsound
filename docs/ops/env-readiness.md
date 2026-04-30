# Env Readiness Check

`scripts/checks/env-readiness-check.mjs` is a read-only operational checklist for Turpial Sound environments. It checks whether required environment variables are present without printing values or touching external services.

## Command

```bash
node scripts/checks/env-readiness-check.mjs
```

Optional modes:

```bash
node scripts/checks/env-readiness-check.mjs --help
node scripts/checks/env-readiness-check.mjs --strict
node scripts/checks/env-readiness-check.mjs --json
```

## Safety Model

- Reads only `process.env`.
- Does not print secret values.
- Does not connect to the database.
- Does not send email.
- Does not call Google, Resend, Vercel Blob, BCV providers, or WhatsApp APIs.
- Exits with failure when production mode is detected and critical variables are missing.

Production mode is detected when `NODE_ENV=production` or `VERCEL_ENV=production`.

## Groups Checked

- `database`: `DATABASE_URL`, `DIRECT_URL`.
- `booking core`: no dedicated env vars detected in the inspected scope.
- `pagos manuales`: visible manual payment details for Pago Movil, transferencia, and Binance.
- `email Resend`: `RESEND_API_KEY`, booking sender, reply-to, and admin recipient.
- `Google Calendar`: OAuth client, refresh token, calendar ID, and timezone.
- `Blob/proofs`: private payment proof upload token.
- `BCV/rates`: rate source overrides, guardrails, emergency fallback, and optional provider auth token.
- `WhatsApp`: no env vars detected in the inspected scope; automated WhatsApp is still out of scope.
- `cron expiracion`: `BOOKINGS_EXPIRE_CRON_SECRET` for `POST /api/bookings/expire`.

## Exit Behavior

- Local/preview with missing critical variables returns `0` and prints `warning`.
- Production with missing critical variables returns `1` and prints `blocked`.
- `--strict` returns `1` when critical variables are missing in any environment.

## What This Does Not Prove

- It does not prove credentials are valid.
- It does not prove the DB accepts connections.
- It does not prove emails can be delivered.
- It does not prove Calendar writes succeed.
- It does not prove Blob uploads work.
- It does not verify Vercel Cron configuration.
- It does not replace manual QA for `/reservas`, `/admin`, payment proof upload, expiration, or atomicity.
