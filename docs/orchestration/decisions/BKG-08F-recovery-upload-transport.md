# BKG-08F Recovery Upload Transport

- The recovery session is handoff-only and stays cookie-backed on the server.
- The recovery token is validated before reading the upload body, SQL or Blob.
- The upload transport keeps Preview isolated and does not expose public URLs.
- The transport reuses the existing protected upload boundary and cleanup rules.
- No client idempotency key is accepted.
- No wizard wiring or UI exposure is added in this sprint.
- Production remains blocked.
