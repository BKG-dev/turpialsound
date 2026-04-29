# Core Booking System - Pending Roadmap Items

This document outlines the immediate and deferred pending items for the Turpial Sound Core Booking System, extracted from `AGENTS.md`.

## Functional Baseline After ORESHNIK Sprint

The project already has a real partial V1. The following pieces are implemented enough to keep and harden:
- `/reservas` public submit creates a real `pending_payment` booking.
- `/admin` exists as the current Booking Command Center route.
- Assigned room/resource and payment deadline are displayed.
- Payment method selector and payment reporting exist.
- Private payment proofs and signed operational links exist.
- Resend email notifications exist.
- Google Calendar sync exists in `lib/bookings/google-calendar.ts`.
- Submit-time availability and resource collision checks exist for managed physical-room services.

## Immediate Pending Items (Production Hardening)

The current focus is not adding a new dashboard, but hardening the existing core flow.

### 1C.1 - Booking Command Center (`/admin`) Hardening
-   Improve filters and operational views on the existing `/admin` route.
-   Add explicit incidence handling for payment or booking review.
-   Improve payment proof review ergonomics.
-   Add QA coverage for daily operations.
-   Keep the panel minimal; do not expand into a full admin suite yet.

### 1C.2 - Google Calendar Integration (Central Operational)
-   Keep using the shared master calendar through `lib/bookings/google-calendar.ts`.
-   Validate create/update/cancel behavior in QA.
-   Add retry or reconciliation strategy for failed syncs.
-   Confirm color/status mapping for `pending_payment`, `payment_reported`, `confirmed`, `cancelled`, and `expired`.

### 1C.3 - Real Availability (Minimum)
-   Server-side submit already blocks resource conflicts for managed room services.
-   Pending: client-visible available-slot selection before submit.
-   Pending: concurrency hardening for simultaneous submits.
-   Pending: scheduled expiration/release outside manual admin page load.
-   No personal calendar synchronization in this initial stage; focus remains on the central operational calendar.

### 1C.4 - Manual Assisted Payment Workflow
-   Payment UX and `payment_reported` flow exist.
-   Private proof upload exists for `image/jpeg`.
-   Verification emails exist.
-   Pending: receipt / service order document with code, client, service, modality, room, schedule, amount, method, and status.
-   Pending: operational incidence flow when payment cannot be verified.

### 1C.5 - Physical Resource Rules
-   Sala 1 (large): `grabacion` and/or `sala-ensayo`.
-   Sala 2: `podcast-locucion`.
-   Sala 3: `sala-ensayo` only.
-   Initial operational assignment rules:
    -   `grabacion` uses only Sala 1.
    -   `podcast-locucion` uses only Sala 2.
    -   `sala-ensayo` preferably uses Sala 3; if unavailable, can use Sala 1.
    -   Other services do not block physical resources yet.

### 1C.6 - Minimum Operational Statuses
-   `submitted`
-   `pending_payment`
-   `payment_reported`
-   `payment_verified`
-   `confirmed`
-   `cancelled`
-   `expired`
-   Note: `pending_payment` is the first visible operational state for public submissions. `submitted` can remain as a technical/transitory state.

## Deferred Future Phases

These items are explicitly postponed beyond the current V1 focus:
-   **1B.6d:** Extended refinement of derived estimate presentation in `SummaryStep`.
-   **1B.6e:** Multiple persistence of `BookingRequestItem` and `estimatedTotal`.
-   **Near Future:**
    -   Mercantil integration (live).
    -   Automatic payments / automatic reconciliation.
    -   Advanced replication to personal calendars (if needed).

This document serves as a living roadmap for the core booking system, updated as priorities shift and features are completed.
