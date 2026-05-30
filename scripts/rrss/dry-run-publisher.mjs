import { readFileSync, existsSync } from "fs";
import { QUEUE_FILE } from "../../lib/rrss/config.mjs";
import { canPublishLive, publishQueueItemLive } from "../../lib/rrss/metaPublisherAdapter.mjs";
import { printDoctorReport } from "../../lib/rrss/secretLoader.mjs";
import logger from "../../lib/rrss/logger.mjs";

console.log("\n========================================");
console.log("  RRSS BOT — DRY RUN PUBLISHER");
console.log("========================================\n");

printDoctorReport();

if (!existsSync(QUEUE_FILE)) {
  logger.error("No queue file found. Run build-queue first.");
  process.exit(1);
}

const queue = JSON.parse(readFileSync(QUEUE_FILE, "utf-8"));
console.log(`Items in queue: ${queue.length}\n`);

const approved = queue.filter((i) => i.status === "approved");
const needsReview = queue.filter((i) => i.status === "needs_review");
const rejected = queue.filter((i) => i.status === "rejected");

console.log(`Approved: ${approved.length}`);
console.log(`Needs Review: ${needsReview.length}`);
console.log(`Rejected: ${rejected.length}\n`);

if (approved.length === 0) {
  console.log("No approved items to publish. Approve items first via the dashboard.");
  console.log(`Dashboard: http://localhost:${process.env.RRSS_REVIEW_PORT || 4877}\n`);
  process.exit(0);
}

console.log("Simulating publish for approved items:\n");

let successCount = 0;
let blockedCount = 0;

for (const item of approved) {
  const canPub = canPublishLive(item);
  if (!canPub.allowed) {
    console.log(`[BLOCKED] ${item.id} (${item.channel}/${item.format}): ${canPub.reasons[0]}`);
    blockedCount++;
    continue;
  }

  const result = await publishQueueItemLive(item);
  if (result.success) {
    console.log(`[DRY-RUN OK] ${item.id} (${item.channel}/${item.format}): ${result.message}`);
    successCount++;
  } else {
    console.log(`[FAILED] ${item.id}: ${result.error}`);
    blockedCount++;
  }
}

console.log(`\nDry Run Complete:`);
console.log(`  Would publish: ${successCount}`);
console.log(`  Blocked: ${blockedCount}`);
console.log(`  Total processed: ${successCount + blockedCount}`);
console.log(`\nNOTE: This was a DRY RUN. No real posts were made.`);
console.log(`To publish live, set RRSS_MODE=live in .env.rrss.local and configure Meta credentials.\n`);
