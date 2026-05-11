# Next Window Brief — S03 Complete

> Date: 2026-05-11
> Branch: Manuel/s03j-qa-final-regression-2026-05-11

## Current state: S03 CLOSED — 12/12 PASS

Sprint 3 QA Harness Marketplace fully validated. No pending work.

## What to read first

1. [[00_CENTRAL_TURPIAL]] — Mapa central del proyecto (actualizado)
2. [[S03_QA_HARNESS_INDEX]] — Dashboard maestro Obsidian del Sprint 3
3. [[S03_FINAL_QA_HARNESS_CLOSURE_2026-05-11]] — Cierre consolidado
4. `docs/07_handoffs/QA_E2E_ROADMAP_2026-05-10.md` — Roadmap detallado
5. `docs/07_handoffs/qa-dispatcher.json` — Dispatcher v4 con task_ids

## Key facts

- 12/12 modules PASS. Zero browser. Zero CDP. Zero Playwright.
- Runner: `npx tsx`. Not bare `node`.
- Bootstrap: `scripts/qa/ensure-marketplace-qa-env.ps1`
- Doctor: `scripts/qa/doctor-marketplace-qa-env.mjs`
- Credentials: buyerIA, sellerIA, mvera (same QA password, never in Git).
- Listing: `qa-e2e-s03f-selleria-discovery` (ACTIVE on preview BKG).

## Canonical command

```bash
npx tsx scripts/qa/run-marketplace-qa.mjs "--modules=qa-12" "--app-url=https://turpialsound-qc6k39eh1-bkgs-projects-829c67c1.vercel.app"
```

## Next real step

**S04: Browser/UI E2E with Playwright.**
Base branch: `Manuel/s03j-qa-final-regression-2026-05-11`.
Playwright authorized. Target: validate real UX: login UI, forms, file picker, dashboards, notifications.

## Jean's action

Review + merge docs-only branch into mother:
`Manuel/docs-sync-s03-complete-obsidian-to-mother-2026-05-11`

## Do NOT repeat

- Do not re-implement S03 modules.
- Do not use CDP.
- Do not touch booking/reservas.
- Do not touch production/main.
- Do not commit .env.local, var/qa-results, or secrets.
