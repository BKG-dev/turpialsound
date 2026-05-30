import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { QUEUE_FILE, QUEUE_DIR } from "./config.mjs";
import logger from "./logger.mjs";

if (!existsSync(QUEUE_DIR)) mkdirSync(QUEUE_DIR, { recursive: true });

function load() {
  try {
    if (existsSync(QUEUE_FILE)) {
      return JSON.parse(readFileSync(QUEUE_FILE, "utf-8"));
    }
  } catch (e) {
    logger.error("Failed to load queue", e.message);
  }
  return [];
}

function save(queue) {
  if (!existsSync(QUEUE_DIR)) mkdirSync(QUEUE_DIR, { recursive: true });
  writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), "utf-8");
}

function findById(queue, id) {
  return queue.find((item) => item.id === id);
}

function updateItem(queue, id, updates) {
  const idx = queue.findIndex((item) => item.id === id);
  if (idx === -1) return null;
  queue[idx] = { ...queue[idx], ...updates, updatedAt: new Date().toISOString() };
  save(queue);
  return queue[idx];
}

function getStats(queue) {
  const stats = {
    total: queue.length,
    byChannel: {},
    byFormat: {},
    byStatus: {},
    needsReview: 0,
    approved: 0,
    rejected: 0,
    published: 0,
    needsAsset: 0,
    blockedBySafety: 0,
    readyForLive: 0,
  };
  for (const item of queue) {
    stats.byChannel[item.channel] = (stats.byChannel[item.channel] || 0) + 1;
    stats.byFormat[item.format] = (stats.byFormat[item.format] || 0) + 1;
    stats.byStatus[item.status] = (stats.byStatus[item.status] || 0) + 1;
    if (item.status === "needs_review") stats.needsReview++;
    if (item.status === "approved") stats.approved++;
    if (item.status === "rejected") stats.rejected++;
    if (item.status === "published") stats.published++;
    if (
      item.selectedAsset === "ASSET_REQUIRED" ||
      item.assetCandidates?.length === 0
    )
      stats.needsAsset++;
    if (item.safetyFlags?.length > 0) stats.blockedBySafety++;
    if (
      item.status === "approved" &&
      !item.requiresPublicUrlForLive &&
      item.safetyFlags?.length === 0
    )
      stats.readyForLive++;
  }
  return stats;
}

export default { load, save, findById, updateItem, getStats, QUEUE_FILE };
