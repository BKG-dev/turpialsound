# Current Sprint

- Sprint: `BKG-04A`
- Name: Propuesta aditiva de esquema snapshot-backed
- Objective: validate an additive snapshot-backed schema proposal in isolated PostgreSQL before touching the Prisma schema used by the app.
- State: `TECHNICALLY_VALIDATED`
- Base: `2d64bbff87f4f844378bc93c3e0395fc6b73ba92`

## Scope

- draft and validate the additive SQL proposal;
- confirm compatibility with historical rows;
- confirm the new `service`, `addon`, and `included` line shapes;
- keep the application schema untouched for now;
- wait for remote workflow validation.

## Out of Scope

- `schema.prisma` changes;
- generated Prisma client changes;
- booking wizard wiring;
- production changes;
- migrations;
- seeds;
- `prisma db push`;
- QA manual.

## Expected Result

`READY_FOR_BKG_04B`

## Next Action

ChatGPT reviews BKG-04A and defines the isolated mult-item persistence adapter.
