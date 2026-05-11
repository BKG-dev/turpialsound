# Next Window Brief — after S03F (HARDENED)

> Date: 2026-05-11
> Branch: Manuel/s03f-qa-login-publish-discovery-2026-05-10

## S03F Status: VALIDATED PASS

All 4 modules (QA-00 through QA-03) pass against Preview BKG DB:
- QA-00: env, appUrl, DB tables (11/11), QA buyer/seller confirmed
- QA-01: buyerIA, sellerIA, mvera all AUTH_DATA_PASS
- QA-02: listing qa-e2e-s03f-selleria-discovery ACTIVE
- QA-03: UI_PASS — listing visible in server-rendered HTML

## If env vars are missing on a new worktree

```powershell
powershell -ExecutionPolicy Bypass -File scripts/qa/ensure-marketplace-qa-env.ps1
```

Or check first:
```bash
npx tsx scripts/qa/doctor-marketplace-qa-env.mjs
```

## Canonical harness command
```bash
npx tsx scripts/qa/run-marketplace-qa.mjs "--modules=qa-00,qa-01,qa-02,qa-03" "--app-url=https://turpialsound-qc6k39eh1-bkgs-projects-829c67c1.vercel.app"
```

## Next Sprint: S03G (Purchase + Payment Proof)
- Requires Playwright authorization for QA-06 (file upload)
- Assets dir: D:\Users\mvera\Downloads
