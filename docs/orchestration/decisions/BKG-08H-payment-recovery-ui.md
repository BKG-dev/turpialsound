# BKG-08H Payment Recovery UI

- The recovery UI is Preview-only and appears only for the exact custom bundle identity.
- The gateway keeps the recovery token out of the URL after capture and uses a secure session handoff.
- The session exposes the preview simulation mode for custom bundle flows and keeps the legacy fallback when needed.
- The client form stays isolated, does not connect the wizard, and keeps the recovery action disconnected from production.
- The UI contract covers the payment methods display, file validation, upload intent, raw protected upload, receipt action wiring, and simulation disclosure.
- Public behavior stays sanitized and the Preview path remains non-destructive.
