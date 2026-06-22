# BKG-05 Continuous Schedule

## Decision

- SHA reviewed: `b3e4b184555d465ce8561fd51589033f6b133949`
- Decision: `CONTINUE`

## Rules

- the client does not control the temporal order;
- the catalog controls `scheduleOrder`;
- temporal components run sequentially;
- no automatic gaps are inserted;
- no overlaps are allowed;
- non-temporal elements stay outside the block;
- Técnico y Backline quedan fuera del bloque;
- the calculation uses `America/Caracas` with UTC-04:00;
- resource assignment and conflict detection are deferred to `BKG-06`;
- holds are deferred to `BKG-07`;
- no database writes occur in this sprint.

## Production

- not authorized.
