# BKG-04B1 Director Review

- SHA reviewed: `18d0b609c5c02256d66cfcfc690ff813d1ed5ea2`
- Decision: `FIX_REQUIRED`

## Approved Result

- authoritative repricing;
- isolated `BookingRequest`;
- multiple `BookingRequestItem`;
- rollback;
- publicCode conflict;
- cleanup;
- workflow success.

## Defects

- `sessionDurationMinutes` received `durationMinutes`.
- tests collapsed `null` into `0` or a calculated duration.
- one invariant could throw outside the discriminated result.
- the SQL contract did not require a single fixed connection.

## Action

- execute `BKG-04B1` before availability.

## Production

- not authorized.
