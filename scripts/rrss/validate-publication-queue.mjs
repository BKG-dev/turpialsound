import { readFileSync, existsSync } from "fs";
import { QUEUE_FILE } from "../../lib/rrss/config.mjs";
import { validateItem } from "../../lib/rrss/safetyRules.mjs";
import logger from "../../lib/rrss/logger.mjs";

if (!existsSync(QUEUE_FILE)) {
  logger.error("No queue file found. Run build-queue first.");
  process.exit(1);
}

const queue = JSON.parse(readFileSync(QUEUE_FILE, "utf-8"));
logger.info(`Validating ${queue.length} items...`);

let errors = 0;
let warnings = 0;
const results = [];

for (const item of queue) {
  const issues = [];

  if (!item.id) issues.push("Missing id");
  if (!item.channel) issues.push("Missing channel");
  if (!item.format) issues.push("Missing format");
  if (!item.caption && item.format !== "story") issues.push("Missing caption");
  if (!item.status) issues.push("Missing status");

  if (!["facebook", "instagram"].includes(item.channel)) {
    issues.push(`Invalid channel: ${item.channel}`);
  }

  if (!["feed", "reel", "story", "carousel", "comment_reply", "dm_reply"].includes(item.format)) {
    issues.push(`Invalid format: ${item.format}`);
  }

  const safety = validateItem(item);
  if (safety.flags.length > 0) {
    issues.push(`Safety flags: ${safety.flags.map((f) => f.phrase).join(", ")}`);
  }

  if (item.riskLevel === "high" && item.status === "approved") {
    issues.push("High risk item cannot be auto-approved");
  }

  if (item.channel === "instagram" && item.format !== "story" && !item.selectedAsset) {
    warnings++;
    issues.push("Instagram post without asset — needs public URL for live");
  }

  if (issues.length === 0) {
    results.push({ id: item.id, status: "OK" });
  } else {
    errors++;
    results.push({ id: item.id, status: "ISSUES", issues });
    logger.warn(`${item.id}: ${issues.join("; ")}`);
  }
}

console.log(`\nValidation Results:`);
console.log(`  Total items: ${queue.length}`);
console.log(`  OK: ${queue.length - errors}`);
console.log(`  Issues: ${errors}`);
console.log(`  Warnings: ${warnings}`);

if (errors > 0) {
  console.log(`\nItems with issues:`);
  for (const r of results) {
    if (r.status === "ISSUES") {
      console.log(`  - ${r.id}: ${r.issues.join(", ")}`);
    }
  }
}

process.exit(errors > 0 ? 1 : 0);
