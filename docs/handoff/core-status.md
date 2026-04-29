# Core Status - Turpial Sound Project

This document provides a high-level overview of the current status, completed modules, and immediate pending tasks for the **Core Booking System** of the Turpial Sound project.

## Definition of 'Core Booking System'
The core booking system primarily encompasses all functionalities related to service reservation, availability management, payment verification (manual assisted), and internal operational views (Booking Command Center). It explicitly **excludes** any Marketplace functionalities.

## Current Status (as of 2026-04-29)

### Completed Milestones (Closed)
Based on `AGENTS.md` - Phase 1A and 1B:
-   **Database Setup:** Prisma 7 configured, Neon connected, initial migration applied, base seed functioning.
-   **Booking Domain:** Pure domain logic established in `lib/bookings`.
-   **Internal Auth/Roles:** Minimum base of internal authentication and roles.
-   **Public Booking Flow (`/reservas`):**
    -   Public booking wizard is operational.
    -   Wizard covers service selection, modality, date, extras, contact information, and summary.
    -   Minimum real persistence implemented.
    -   Post-submission confirmation is functional with `publicCode`.
-   **Pricing Integration:** Approved pricing catalog loaded, wizard displays visible pricing and preliminary breakdown.
-   **Manual Persistence Validation:** User-validated minimum current persistence.

### Functional After ORESHNIK Sprint
The core booking system now has a partial but real operational V1:
-   **Booking Command Center (`/admin`):** Minimum internal command center exists with real booking data, filters, payment deadline display, assigned resource display, manual status changes, and payment proof links.
-   **Google Calendar Integration:** Central operational calendar integration exists in `lib/bookings/google-calendar.ts` and is called on submit, payment report, admin transitions, and expiration handling.
-   **Real Availability:** Submit-time resource assignment and collision prevention exist for physical-room services (`grabacion`, `podcast-locucion`, `sala-ensayo`).
-   **Manual Assisted Payment:** The public flow shows payment instructions, amount, assigned room, deadline, method selector, and allows payment reporting.
-   **Payment Proofs and Notifications:** Payment proofs are stored privately, signed operational links are generated, and Resend notifications exist for key booking events.

### Current Core Gaps
-   Availability is protected server-side at submit, but the client does not yet list only available slots before submission.
-   Slot collision protection still needs concurrency hardening.
-   Expiration is currently processed from the admin flow, not from a scheduled job.
-   Admin operations need QA, incident handling, and hardening before production use.
-   Receipt / service order generation is not implemented yet.

### What's NOT Part of the Core (and why)
-   **Marketplace Functionality:** This is a separate module managed by Manuel and is outside the scope of the core booking system. References to Marketplace are kept to a minimum to avoid confusion in core documentation.
-   **Full Admin Panel:** Only a *minimum* Booking Command Center is in scope for the core.
-   **Automatic Payment Reconciliation:** Payments are currently manual assisted; automatic reconciliation is a future phase.
-   **Advanced Multi-resource Blocking/Auto-assignment:** Initial resource rules are in place, but advanced logic is deferred.

## Key Enums & Models (from `prisma/schema.prisma` - Core Booking Context)

### Enums and Operational Status
-   `BookingStatus`: schema-level enum with values such as `submitted`, `under_review`, `approved`, `rejected`, and `confirmed`.
-   Operational statuses (`pending_payment`, `payment_reported`, `payment_verified`, `confirmed`, `cancelled`, `expired`) are currently represented in booking domain logic and persisted through internal operational tags, not as new Prisma enum values.
-   `UserRole`: `admin`, `operations`, `casa_director`, `turpial_director` (for internal staff).
-   `PaymentProofDuplicateStatus`, `ApprovalDecision`, `PriorityLevel`.

### Core Models
-   `Service`, `ServiceVariant`, `Resource`: Catalogs for services, variants, and physical resources.
-   `User`: Internal staff users (not public users).
-   `BookingRequest`: Main booking entity, includes `publicCode`, `status`, requester details, event details, `estimatedTotal`.
-   `BookingRequestItem`: Details of items within a booking request (e.g., service variant, quantity, assigned resource).
-   `PaymentProof`: Stores details and files related to client payment proofs.
-   `Approval`: Records internal approval decisions for booking requests.
-   `AuditLog`: Immutable log of state transitions and internal actions.

This document will be updated as the core system evolves.
