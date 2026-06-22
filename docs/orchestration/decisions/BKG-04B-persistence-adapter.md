# BKG-04B Persistence Adapter Decision

## Decision

The persistence adapter for `Arma tu paquete` is allowed to persist only after authoritative repricing completes successfully and only inside the isolated PostgreSQL gate.

## Rules

- Reprice first through `repriceCustomBundleSubmission`.
- Catalog gaps are persisted as snapshot-backed addon lines.
- ServiceVariant lookup remains for service lines only.
- `serviceVariantId` is `NULL` for `addon` and `included`.
- The write path is serializable and rollback is mandatory.
- `publicCode` is provided by server context.
- No connection with Preview is allowed yet.
- No production migration is authorized.
- No idempotency layer exists yet.
- No resource assignment exists yet.
- No holds, payments, or notifications are part of this sprint.

## Outcome

This architecture is sufficient to begin the isolated persistence implementation sprint, but it still depends on the GitHub Actions validation gate and does not authorize production.
