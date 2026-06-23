# Handoff BKG-08A1

- Sprint ID: `BKG-08A1`
- Objective: `Corregir semantica operacional del replay de pago consolidado`
- Branch: `codex/preview-arma-tu-paquete-2026-06-19`
- Base SHA: `7c9c1ce82b7bc3f5e829acd531db347d179e8c15`
- Functional SHA: `13f8b81328573eac80867b657e53b93e0a44373a`
- Final SHA: `SELF -- el commit que contiene este handoff`

## State

- payment replay semantics were corrected to classify persisted `payment_reported` snapshots;
- the payment gate is now technically validated again;
- production is not authorized.

## Evidence

- workflow `BKG-08A` / `Booking Isolated Custom Bundle Payment Contract` completed successfully;
- run `28064386787`;
- job `gate` / `83085422983`;
- `booking_custom_bundle_payment_contract OK`;
- `booking_isolated_custom_bundle_payment_schema OK`;
- `legacy compatibility: verified`;
- `payment report columns: verified`;
- `payment report constraints: verified`;
- `payment report indexes: verified`;
- `cleanup: verified`.

## Out of Scope

- BKG-08B;
- blob boundary;
- notifications;
- wizard integration;
- manual QA;
- production.

## Vercel

- pending validation on the final documentation SHA.

## Director Next Action

- ChatGPT reviews BKG-08A1 and defines isolated transactional payment reporting.
