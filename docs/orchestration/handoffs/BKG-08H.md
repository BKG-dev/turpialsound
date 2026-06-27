# BKG-08H Handoff

- Preview-only payment recovery UI is wired to the recovery gateway at `/reservas/pago`.
- The gateway strips the token from the URL, keeps the token in memory, and requests the secure recovery session before showing the form.
- The form is isolated, uses the custom bundle payment recovery UI contract, and keeps the legacy fallback disconnected from the wizard.
- The payment methods contract, upload intent, raw upload, and protected action remain separated behind server boundaries.
- Workflow validation is pending.
- Production remains blocked.
