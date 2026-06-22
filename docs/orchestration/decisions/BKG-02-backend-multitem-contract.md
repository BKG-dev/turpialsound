# BKG-02 Backend Mult-Item Contract

1. The client only sends selectable slugs, quantities, durations, schedule data, notes, and contact data.
2. The client does not send prices or totals.
3. The server will add `tecnico-sonido` and `backline-equipamiento` itself.
4. The twelve main bundle items already map to existing `ServiceVariant` rows.
5. The ten additional items still have no persistent `ServiceVariant`.
6. `BookingRequestItem` requires `serviceVariantId`.
7. Future persistence for additional items therefore needs an explicit catalog and schema decision before `BKG-04`.
8. The following are not accepted as a definitive solution: notes-only storage, a fake generic variant, or mapping all extras to `produccion-musical-por-tema`.
9. `BKG-03` can proceed with pure authoritative repricing without solving persistence yet.
10. `BKG-04` stays blocked until an isolated data environment exists and the persistent catalog strategy is approved with migration and rollback planning.
