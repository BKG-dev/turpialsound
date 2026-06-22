# BKG-04A Schema Proposal

## Goal

Define the additive schema target for snapshot-backed `BookingRequestItem` records without touching `schema.prisma` yet.

## Conceptual Model

### `BookingRequest`

- `bookingMode` with default `single`
- `pricingSource` optional

### `BookingRequestItem`

- `serviceVariantId` optional
- `serviceVariant` optional
- `itemSlug` optional in the additive phase
- `itemName` optional
- `itemKind` optional
- `sessionDurationMinutes` optional
- `durationMinutes` optional
- `unitPriceUsdSnapshot` optional
- `lineTotalUsdSnapshot` optional
- `clientPriceDisplay` optional
- unique composite on `bookingRequestId + itemSlug`
- index on `itemSlug`

## Future Prisma Fragment

```prisma
enum booking_mode {
  single
  custom_bundle
}

enum booking_item_kind {
  service
  addon
  included
}

model BookingRequest {
  bookingMode   booking_mode @default(single)
  pricingSource  String?
}

model BookingRequestItem {
  serviceVariantId        String?
  serviceVariant          ServiceVariant? @relation(fields: [serviceVariantId], references: [id])
  itemSlug                String?
  itemName                String?
  itemKind                booking_item_kind?
  sessionDurationMinutes  Int?
  durationMinutes         Int?
  unitPriceUsdSnapshot    Decimal? @db.Decimal(10, 2)
  lineTotalUsdSnapshot    Decimal? @db.Decimal(10, 2)
  clientPriceDisplay      String?

  @@index([itemSlug], map: "booking_request_items_item_slug_idx")
  @@unique([bookingRequestId, itemSlug], map: "booking_request_items_booking_request_id_item_slug_key")
}
```

## Compatibility Notes

- The fields remain optional during the compatible additive phase.
- Historical bookings continue to depend on `ServiceVariant`.
- Add-ons and included lines can use `serviceVariantId = null`.
- A later backfill will decide which fields may become required.
- This proposal is not authorized for production.

## Reference

- SQL proposal: `prisma/proposed/20260622_bkg04_snapshot_booking_items.sql`
- Workflow gate: `.github/workflows/booking-isolated-snapshot-schema.yml`
