# Orchestration Roadmap

Each milestone starts in `PLANNED` state and remains there until the Director and Executor advance it deliberately.

## 0. Orchestration Layer

- Purpose: create the shared control plane for Director, Codex, GitHub, Preview, and the user.
- Dependencies: none.
- Technical exit criteria: orchestration docs exist, are referenced from `AGENTS.md`, and describe the operating loop and safety rules.
- Main risks: stale instructions, contradictory state, and accidental scope drift.
- Prohibitions: no functional code changes, no database writes, no production promotion.
- Status: `DONE`

## 1. Close the `Arma tu paquete` Configurator Technically

- Purpose: finish the Preview-only bundle configurator with consistent pricing, quantity rules, summary, and safe simulation.
- Dependencies: orchestration layer, pricing normalization, Preview guard.
- Technical exit criteria: bundle selection works in Preview, validations pass, and no production behavior regresses.
- Main risks: hidden pricing duplication, inconsistent timing rules, and accidental persistence.
- Prohibitions: no mult-item persistence yet, no schema changes, no production writes.
- Status: `DONE`

## 2. Backend Mult-Item Contract

- Purpose: define the server contract for multiple booking items before any persistence is implemented.
- Dependencies: bundle configurator, pricing model, orchestration state.
- Technical exit criteria: explicit types, payload contract, and server-side validation rules exist.
- Main risks: premature coupling to persistence and ambiguous item semantics.
- Prohibitions: no database writes, no `schema.prisma` changes, no migrations.
- Status: `DONE`

## 3. Authoritative Server Repricing

- Purpose: make the server the source of truth for booking recalculation and validation.
- Dependencies: contract definition and normalized catalog pricing.
- Technical exit criteria: server recomputes totals, durations, surcharges, and incompatibilities deterministically.
- Main risks: divergence between client and server calculations.
- Prohibitions: no mutative tests against production data.
- Status: `DONE`

## 4. Persist `BookingRequest` with Multiple `BookingRequestItem`

- Purpose: store a booking request and its itemized children in an isolated data environment.
- Dependencies: backend contract, server repricing, isolated database gate.
- Technical exit criteria: request and item records persist correctly in a non-production environment.
- Main risks: partial writes, duplicate items, and recovery edge cases.
- Prohibitions: no production migrations, no production seeds, no production `db push`.
- Status: `TECHNICALLY_VALIDATED`
- Persistence gate: `READY_EPHEMERAL_CI` (`docs/orchestration/PERSISTENCE_GATE.json`)
- Schema proposal: `TECHNICALLY_VALIDATED`
- Persistence adapter: `TECHNICALLY_VALIDATED`
- Temporal snapshot semantics: `TECHNICALLY_VALIDATED`
- Single-connection transaction: `TECHNICALLY_VALIDATED`

## 5. Availability and Continuous Time Block

- Purpose: reserve a continuous block that matches the selected bundle duration.
- Dependencies: item contract, authoritative repricing, isolated persistence.
- Technical exit criteria: block calculation respects service order, durations, and excluded categories.
- Main risks: overlapping reservations and incorrect block composition.
- Prohibitions: no real holds in production from Preview.
- Status: `TECHNICALLY_VALIDATED`
- Continuous schedule engine: `TECHNICALLY_VALIDATED`
- Resource assignment: `NOT_STARTED`
- Collision detection: `NOT_STARTED`

## 6. Resources and Conflict Resolution

- Purpose: prevent impossible combinations by reconciling calendar resources and service conflicts.
- Dependencies: continuous block logic and item compatibility model.
- Technical exit criteria: conflicts are detected before any write and surfaced clearly to the user.
- Main risks: hidden resource collisions and incomplete exclusion rules.
- Prohibitions: no reverse-engineered server-action flows for QA.
- Status: `TECHNICALLY_VALIDATED`
- Resource engine: `TECHNICALLY_VALIDATED`
- Resource assignment: `TECHNICALLY_VALIDATED`
- Resource policy: `TECHNICALLY_VALIDATED`
- Resource catalog resolution: `TECHNICALLY_VALIDATED`
- Collision detection: `TECHNICALLY_VALIDATED`
- Policy coverage: `COMPLETE`
- Holds: `NOT_STARTED`

## 7. Holds, Expiration, and Idempotency

- Purpose: add deterministic hold creation, expiry handling, and retry-safe behavior.
- Dependencies: availability engine, conflict resolution, isolated persistence.
- Technical exit criteria: holds expire, retries do not duplicate work, and outcomes are predictable.
- Main risks: orphaned holds and duplicate submissions.
- Prohibitions: no real booking holds in Preview.
- Status: `IN_PROGRESS`
- Hold schema proposal: `TECHNICALLY_VALIDATED`
- Hold contract: `TECHNICALLY_VALIDATED`
- Hold acquisition: `TECHNICALLY_VALIDATED`
- Replay allocation parity: `TECHNICALLY_VALIDATED`
- Corrupt replay rejection: `TECHNICALLY_VALIDATED`
- Expiration processor: `TECHNICALLY_VALIDATED`
- Expiration eligibility: `TECHNICALLY_VALIDATED`
- Concurrent processing: `TECHNICALLY_VALIDATED`
- Scheduler wiring: `NOT_STARTED`
- Idempotent replay: `TECHNICALLY_VALIDATED`
- Wizard integration: `NOT_STARTED`

## 8. Consolidated Payment

- Purpose: charge one combined payment for the selected booking package.
- Dependencies: holds, request persistence, authoritative repricing.
- Technical exit criteria: payment intent creation and confirmation are consistent with the booking total.
- Main risks: mismatch between payment amount and final booking total.
- Prohibitions: no real payments from Preview.
- Status: `IN_PROGRESS`
- Payment schema proposal: `TECHNICALLY_VALIDATED`
- Payment contract: `TECHNICALLY_VALIDATED`
- Payment eligibility: `TECHNICALLY_VALIDATED`
- Payment replay semantics: `TECHNICALLY_VALIDATED`
- Transactional reporting: `TECHNICALLY_VALIDATED`
- Blob boundary: `TECHNICALLY_VALIDATED`
- Post-upload compensation: `TECHNICALLY_VALIDATED`
- Payment server entrypoint: `TECHNICALLY_VALIDATED`
- Payment action authorization: `TECHNICALLY_VALIDATED`
- Payment action wiring: `TECHNICALLY_VALIDATED`
- Payment server action: `NOT_STARTED`
- Payment transport: `NOT_STARTED`
- Payment recovery integration: `NOT_STARTED`
- Notifications: `NOT_STARTED`
- Wizard integration: `NOT_STARTED`

## 9. Payment Recovery and Reporting

- Purpose: handle payment failures, recovery links, and payment status reporting.
- Dependencies: consolidated payment and booking state.
- Technical exit criteria: failed payments can be reported and recovered safely.
- Main risks: stale links and incorrect payment state transitions.
- Prohibitions: no real payment recovery sends from Preview.
- Status: `PLANNED`

## 10. Email and WhatsApp

- Purpose: notify customers and operators through email and WhatsApp.
- Dependencies: booking lifecycle, payment status, notification templates.
- Technical exit criteria: notifications are triggered from the correct booking states.
- Main risks: duplicate sends, wrong recipients, and accidental real-world deliveries.
- Prohibitions: no real notifications from Preview.
- Status: `PLANNED`

## 11. Google Calendar

- Purpose: create and manage calendar events for confirmed bookings.
- Dependencies: finalized booking state and continuous block logic.
- Technical exit criteria: calendar events are created only when booking state is valid.
- Main risks: duplicate events, wrong durations, and stale cancellations.
- Prohibitions: no real Calendar events from Preview.
- Status: `PLANNED`

## 12. Administration and Operations

- Purpose: provide operational views for payments, bookings, conflicts, and recovery.
- Dependencies: persistence, payments, notifications, calendar.
- Technical exit criteria: admin workflows can inspect and resolve live states safely.
- Main risks: unauthorized actions and incomplete observability.
- Prohibitions: no production promotion without user authorization.
- Status: `PLANNED`

## 13. Granular Musical Production

- Purpose: refine the musical production offer into granular, accurate bundle logic.
- Dependencies: orchestration layer, pricing model, booking contract.
- Technical exit criteria: detailed production flows are represented without breaking existing services.
- Main risks: scope creep and price duplication.
- Prohibitions: no copying experimental branches without audit.
- Status: `PLANNED`

## 14. Technical Regression Sweep

- Purpose: verify that all booking and adjacent flows remain stable after feature completion.
- Dependencies: all prior milestones.
- Technical exit criteria: automated checks and diff review confirm no critical regression.
- Main risks: latent coupling and Preview-only assumptions leaking into production.
- Prohibitions: no destructive verification in production.
- Status: `PLANNED`

## 15. Release Candidate

- Purpose: freeze a candidate build that is ready for one final manual QA.
- Dependencies: all functional milestones, passing validations, and Preview success.
- Technical exit criteria: frozen SHA, frozen Preview URL, and final QA checklist exist.
- Main risks: hidden critical defects and incomplete scope closure.
- Prohibitions: no further development after RC until user QA completes.
- Status: `PLANNED`

## 16. Final Manual QA by the User

- Purpose: let the user perform the only manual QA pass before production.
- Dependencies: Release Candidate.
- Technical exit criteria: the user records `QA MANUAL APROBADA` or `QA_FAILED`.
- Main risks: unresolved defects discovered at the last gate.
- Prohibitions: no production authorization by any agent.
- Status: `PLANNED`

## 17. Controlled Production Integration

- Purpose: promote the validated Release Candidate to production only after explicit user authorization.
- Dependencies: manual QA approval and explicit production authorization.
- Technical exit criteria: production deployment is aligned with the approved RC and no blocked items remain.
- Main risks: accidental promotion, stale data, and incomplete rollback planning.
- Prohibitions: no production deployment without `AUTORIZO PASO A PRODUCCION`.
- Status: `PLANNED`
