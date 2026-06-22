# BKG-04A Schema Proposal

- The migration is a proposal only.
- It is not inside `prisma/migrations`.
- It must not auto-deploy.
- `schema.prisma` remains intact.
- `generated/prisma` remains intact.
- Only isolated PostgreSQL may apply it.
- `BKG-04B` depends on workflow success.
- Production is not authorized.
