import { readFileSync, existsSync } from "fs";
import { QUEUE_FILE } from "../../lib/rrss/config.mjs";
import { generateDrafts } from "../../lib/rrss/draftRenderer.mjs";
import logger from "../../lib/rrss/logger.mjs";

if (!existsSync(QUEUE_FILE)) {
  logger.error("No queue file found. Run build-queue first.");
  process.exit(1);
}

const queue = JSON.parse(readFileSync(QUEUE_FILE, "utf-8"));
const count = generateDrafts(queue);
console.log(`\nDrafts generated: ${count}`);
console.log(`Output: data/rrss/drafts/\n`);
