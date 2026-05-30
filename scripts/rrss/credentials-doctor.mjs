import { printDoctorReport } from "../../lib/rrss/secretLoader.mjs";
import logger from "../../lib/rrss/logger.mjs";

logger.info("Running credentials doctor...");
const report = printDoctorReport();

if (report.summary.liveBlocked) {
  console.log("\nNext steps to enable live publishing:");
  console.log("  1. Set RRSS_MODE=live in .env.rrss.local");
  if (report.facebook.pageId === "MISSING") console.log("  2. Set META_PAGE_ID");
  if (report.facebook.accessToken === "MISSING") console.log("  3. Set META_ACCESS_TOKEN");
  if (report.instagram.igUserId === "MISSING") console.log("  4. Set META_IG_USER_ID");
  if (report.instagram.publicAssetUrl === "MISSING") console.log("  5. Set RRSS_PUBLIC_ASSET_BASE_URL");
  console.log("\n  Run: node scripts/rrss/rrss-cli.mjs secure-setup");
  console.log("");
}
