# BKG-08G1 Receipt Compensation Hardening

- Receipt cleanup must preserve the original reporting failure in structured form.
- A failed `deleteCustomBundlePaymentProofFromPrivateStore` result must be detected explicitly.
- `headPrivate` failures must be sanitized inside the receipt entrypoint.
- Recovery authorization must occur before validating payment method, payment reference, or receipt payload details.
- The public receipt result must remain sanitized and must not expose internal failure metadata.
- UI wiring remains out of scope for this sprint.
