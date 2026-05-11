# Next Window Brief — after S03F

> Date: 2026-05-10
> Branch: Manuel/s03f-qa-login-publish-discovery-2026-05-10

## Current State
S03F modules (QA-00 through QA-03) are IMPLEMENTED but cannot execute because QA credentials (QA_BUYER_*, QA_SELLER_*) are missing from .env.local and .env.

## Critical Action Required
1. Run `vercel env pull .env.local --environment=preview --scope bkgs-projects-829c67c1` (requires Vercel login)
2. Or manually add the following env vars to .env.local:
   - QA_BUYER_EMAIL, QA_BUYER_IDENTIFIER, QA_BUYER_PASSWORD
   - QA_SELLER_EMAIL, QA_SELLER_IDENTIFIER, QA_SELLER_PASSWORD
   - APP_URL=https://turpialsound-qc6k39eh1-bkgs-projects-829c67c1.vercel.app
3. Optionally add QA_ADMIN_IDENTIFIER, QA_ADMIN_PASSWORD for admin login validation

## Once env vars are present
Run: `node scripts/qa/run-marketplace-qa.mjs --modules=qa-00,qa-01,qa-02,qa-03 --app-url=https://turpialsound-qc6k39eh1-bkgs-projects-829c67c1.vercel.app`

## Expected Results
- QA-00: PASS (envs, DB, tables, accounts)
- QA-01: PASS (buyer/seller bcrypt validation), SKIP admin if no admin envs
- QA-02: PASS (listing created/updated, ACTIVE in DB)
- QA-03: DATA_DISCOVERY_PASS (DB read) + possibly UI_PASS (HTTP fetch) or BROWSER_REQUIRED

## Next Sprint: S03G
- Implement QA-04 (Q&A), QA-05 (purchase), QA-06 (payment proof upload)
- Requires Playwright authorization before QA-06 implementation
- Assets dir: D:\Users\mvera\Downloads
