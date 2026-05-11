# Next Window Brief — after S03G (PASS)

> Date: 2026-05-11
> Branch: Manuel/s03g-marketplace-qa-purchase-payment-proof-2026-05-11

## S03G Status: VALIDATED PASS

All 3 modules (QA-04, QA-05, QA-06) pass against Preview BKG DB:
- QA-04: Purchase initiated (TX PENDING_PAYMENT)
- QA-05: Payment reported (TX PAYMENT_RECEIVED)
- QA-06: Proof attached (blob metadata, admin/seller/buyer visibility confirmed)

## Canonical commands
```
npx tsx scripts/qa/run-marketplace-qa.mjs "--modules=qa-04,qa-05,qa-06" "--app-url=https://turpialsound-qc6k39eh1-bkgs-projects-829c67c1.vercel.app"
```

## Next Sprint: S03H (Delivery + Receipt) or S03I (Admin Review + Payout)
- Server-side Layer B available for delivery/receipt (no browser needed).
- Admin review/payout needs SUPER role (mvera, already validated by QA-01).
- Playwright deferred (not needed for data-layer validation).
