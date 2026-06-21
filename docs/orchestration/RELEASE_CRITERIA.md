# Release Criteria

A Release Candidate may only be declared when all of the following are true:

- all required functional milestones are integrated;
- `pnpm lint` passes;
- TypeScript passes;
- `pnpm build` passes;
- pure tests pass;
- isolated integration tests pass;
- Vercel Preview is in `success`;
- no critical known errors remain;
- no writes against production exist;
- no production migrations are pending without a plan;
- the full diff has been reviewed;
- a frozen Preview URL exists;
- a frozen Release Candidate SHA exists;
- the final manual QA checklist has been generated.

## Guardrails

- Only the Director may declare `RELEASE_CANDIDATE`.
- The Release Candidate freezes development until the user performs the single manual QA pass.
- Manual QA approval is separate from technical validation.
