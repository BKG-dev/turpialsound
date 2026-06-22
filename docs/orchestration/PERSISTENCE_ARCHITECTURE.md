# Persistence Architecture

## Approved Architecture

Snapshot-backed `BookingRequestItem`

## Principle

`BookingRequestItem` will be an immutable snapshot of each priced component in a bundle.

It will not depend exclusively on `ServiceVariant` to represent add-ons.

## Strategy

1. Keep `ServiceVariant` for lines that represent real existing services.
2. Make `serviceVariantId` optional in a future additive migration.
3. Add a canonical `itemSlug` for every new line.
4. Represent the line type with `itemKind`:
   - `service`
   - `addon`
   - `included`
5. Store economic and operational snapshots calculated by the server.

## Future Migration Fields

### `BookingRequest`

- `bookingMode`
- `pricingSource`

### `BookingRequestItem`

- `itemSlug`
- `itemName`
- `itemKind`
- `serviceVariantId` optional
- `quantity`
- `sessionDurationMinutes`
- `durationMinutes`
- `unitPriceUsdSnapshot`
- `lineTotalUsdSnapshot`
- `clientPriceDisplay`
- `notes`
- `resourceId` optional

## Future Indexes

- index by `bookingRequestId`
- index by `itemSlug`
- logical uniqueness to prevent duplicate `itemSlug` inside the same request

## Item Classes

### Main Service Lines

The twelve `SERVICE_VARIANT` lines keep their relation to `ServiceVariant`.

### Add-ons

The ten `CATALOG_GAP` items will be persisted directly with:

- `itemSlug`
- `itemName`
- `itemKind = addon`
- economic snapshots
- `serviceVariantId = null`

This sprint does not create:

- a fake generic `ServiceVariant`
- a synthetic service to hide the gap
- add-on mappings to `produccion-musical-por-tema`
- durable storage in notes only

### Included Items

`tecnico-sonido` and `backline-equipamiento` will be persisted as:

- `itemKind = included`
- price `0`
- duration `0`
- `serviceVariantId = null`
- server-derived only

## Snapshot Source

The saved prices must come from `server_catalog_v1`.

The server must run `repriceCustomBundleSubmission` before any write is built.

The client never determines:

- unit price
- subtotal
- surcharge
- total
- total duration
- `persistenceReady`

## Historical Inmutability

A booking must preserve the price and description that were valid when it was created, even if the catalog changes later.

## Two-Phase Migration

### Phase A - Additive and Compatible

In an isolated environment:

- make `serviceVariantId` optional
- add the new fields as optional first
- keep compatibility with old rows
- do not break the existing single-service flow

### Phase B - Backfill and Harden

Later:

- backfill `itemSlug` and `itemName` in historical rows using `ServiceVariant`
- validate the data
- decide which fields can become required
- add indexes and constraints
- prepare rollback

This sprint does not implement either phase.

## Proposed Migration Sequence

1. Back up the isolated database.
2. Apply the additive migration.
3. Regenerate Prisma Client.
4. Validate the existing single-service flow.
5. Persist mult-item requests in a transaction.
6. Verify the snapshots.
7. Test rollback.
8. Only then propose a production migration.

## Rollback Concept

- revert code first
- restore compatibility for the single-service flow
- do not delete columns with data in the same deployment
- destructive migration is forbidden
- restore the backup only in the isolated environment during development

## Gate Note

This architecture is approved as a design target, but `BKG-04` cannot start until an isolated database exists.
