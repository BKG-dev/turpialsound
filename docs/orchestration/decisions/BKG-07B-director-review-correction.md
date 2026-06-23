# BKG-07B Director Review Correction

- SHA reviewed: `c37fb1cc3b33142c5e656217bb8b4d17499f8c22`
- Decision: `FIX_REQUIRED`

## Approved Result

- the hold acquisition workflow succeeded;
- isolated acquisition, concurrency, rollback, and cleanup were validated;
- production remains not authorized.

## Defect

- `acquired` counts allocations from the authoritative plan;
- `replayed` infers them from persisted `service` rows and `resourceId`;
- that misclassifies service rows with `resourceId NULL`;
- the same logical attempt can return different allocation counts.

## Action

- execute `BKG-07B1` before the expiration writer.

## Production

- not authorized.
