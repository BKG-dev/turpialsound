import { indexAssets } from "../../lib/rrss/assetIndex.mjs";
import logger from "../../lib/rrss/logger.mjs";

logger.info("Starting asset indexing...");
const assets = indexAssets();
logger.info(`Indexing complete. ${assets.length} assets indexed.`);

const bySource = { public: 0, inbox: 0 };
const byType = { image: 0, video: 0, unknown: 0 };
for (const a of assets) {
  bySource[a.source] = (bySource[a.source] || 0) + 1;
  byType[a.type] = (byType[a.type] || 0) + 1;
}

console.log(`\nPublic assets: ${bySource.public || 0}`);
console.log(`Inbox assets: ${bySource.inbox || 0}`);
console.log(`Images: ${byType.image || 0}`);
console.log(`Videos: ${byType.video || 0}`);
console.log(`Reports: data/rrss/reports/asset-index.json`);
console.log(`         data/rrss/reports/asset-index.md\n`);
