# SYNC_PACKET

Use this template for every cross-agent update that affects integration decisions.

```text
SYNC_PACKET

FROM:
SPRINT:
BRANCH:
COMMIT:
STATUS:
FILES_TOUCHED:
WHAT_CHANGED:
VALIDATIONS:
P0_CHECK:
BLOCKERS:
NEEDS_FROM_OTHER:
NEXT_ACTION:
```

## Allowed STATUS values

- `PASS`
- `FAIL`
- `BLOCKED`
- `NEED_DECISION`
- `PREVIEW_READY`
- `QA_PENDING`
- `MERGED`
- `SUPERSEDED`

## Usage notes

- Keep it short, objective, and verifiable.
- Include branch + commit + preview URL when applicable.
- Never include secrets, passwords, raw env values, tokens, or sensitive personal/banking data.
- For QA E2E, a SYNC_PACKET is mandatory before integration gate decisions.