# Handoff BKG-07B

- Sprint: `BKG-07B`
- Objective: isolated transactional hold acquisition
- Base SHA: `ef76f340513cff0aa3802b5c5add3a80ea20001a`
- Final SHA: `SELF — el commit que contiene este handoff`
- Status: `DIRECTOR_REVIEW`
- Result: `TRANSACTIONAL_HOLD_ACQUISITION_PENDING_CI`

## Files

- `lib/bookings/custom-bundle-hold-acquisition.ts`
- `scripts/qa/bookings/custom-bundle-hold-acquisition-contract.ts`
- `scripts/qa/bookings/isolated-custom-bundle-hold-acquisition.ts`
- `.github/workflows/booking-isolated-custom-bundle-hold-acquisition.yml`
- `docs/orchestration/decisions/BKG-07A-director-review.md`
- `docs/orchestration/decisions/BKG-07B-transactional-hold-acquisition.md`

## Notes

- The hold acquisition adapter is transactional and server-neutral.
- Replay, expiration, conflict, and concurrent acquisition are part of the validation surface.
- The expiration writer is intentionally out of scope.
- The wizard remains disconnected.
- Production remains blocked.
