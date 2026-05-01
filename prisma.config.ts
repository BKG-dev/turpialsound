// This file is used by the Prisma CLI (db push, migrate dev, etc.)
// Load .env.local first (personal dev overrides) then fall back to .env
import { config } from "dotenv";
config({ path: ".env.local", override: true });
config({ path: ".env" });

import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // DIRECT_URL: non-pooled connection required by the CLI for schema operations
    url: process.env["DIRECT_URL"],
  },
});
