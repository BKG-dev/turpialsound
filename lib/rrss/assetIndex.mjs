import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve } from "path";
import { DATA_DIR, REPORTS_DIR, ASSET_INDEX_FILE, ASSET_INDEX_MD, INBOX_DIR, PUBLIC_DIR } from "./config.mjs";
import logger from "./logger.mjs";

if (!existsSync(REPORTS_DIR)) mkdirSync(REPORTS_DIR, { recursive: true });

const ALLOWED_EXTENSIONS = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg", ".mp4", ".webm", ".mov"];

const SENSITIVE_KEYWORDS = ["proof", "payment", "private", "secret", "credential", "token"];

function inferUse(filename, path) {
  const lower = filename.toLowerCase();
  const full = path.toLowerCase();

  if (lower.includes("logo")) return "avatar";
  if (lower.includes("favicon")) return "brand";
  if (lower.includes("og")) return "brand";

  if (full.includes("salas-ensayo")) return "feed";
  if (full.includes("estudio-grabacion")) return "feed";
  if (full.includes("produccion")) return "feed";
  if (full.includes("instalaciones")) return "feed";
  if (full.includes("consola")) return "feed";
  if (full.includes("artista")) return "feed";
  if (full.includes("hero")) return "facebook-cover";
  if (full.includes("wave")) return "brand";
  if (full.includes("video")) return "reel";
  if (full.includes("dropsocial")) return "marketplace";
  if (full.includes("listing")) return "marketplace";
  if (full.includes("marketplace")) return "marketplace";
  if (full.includes("upload")) return "marketplace";

  if (lower.endsWith(".mp4") || lower.endsWith(".webm") || lower.endsWith(".mov")) return "reel";
  if (lower.endsWith(".svg")) return "brand";

  return "feed";
}

function inferChannel(filename, path) {
  const full = path.toLowerCase();
  if (full.includes("facebook") || full.includes("fb")) return "facebook";
  if (full.includes("instagram") || full.includes("ig")) return "instagram";
  return "both";
}

function inferType(ext) {
  const imageExts = [".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"];
  const videoExts = [".mp4", ".webm", ".mov"];
  if (imageExts.includes(ext)) return "image";
  if (videoExts.includes(ext)) return "video";
  return "unknown";
}

function walk(dir, base = "") {
  const results = [];
  if (!existsSync(dir)) return results;
  const entries = readFileSync(dir, { encoding: "utf-8" });
  // This is a simplification - we use fs.readdirSync for actual traversal
  return results;
}

import { readdirSync, statSync } from "fs";

function walkDir(dir, base = "") {
  const results = [];
  if (!existsSync(dir)) return results;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = resolve(dir, entry.name);
    const relPath = base ? `${base}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, relPath));
    } else if (entry.isFile()) {
      results.push({ fullPath, relPath, name: entry.name });
    }
  }
  return results;
}

function isSensitive(path) {
  const lower = path.toLowerCase();
  return SENSITIVE_KEYWORDS.some((kw) => lower.includes(kw));
}

export function indexAssets() {
  logger.info("Indexing assets...");
  const assets = [];
  const skipped = [];

  const dirs = [PUBLIC_DIR, INBOX_DIR];
  for (const dir of dirs) {
    if (!existsSync(dir)) continue;
    const files = walkDir(dir);
    for (const file of files) {
      const ext = file.name.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] || "";
      if (!ALLOWED_EXTENSIONS.includes(ext)) continue;

      if (isSensitive(file.relPath)) {
        skipped.push({ path: file.relPath, reason: "sensitive_keyword" });
        continue;
      }

      const type = inferType(ext);
      const inferredUse = inferUse(file.name, file.relPath);
      const channelFit = inferChannel(file.name, file.relPath);
      const sourceDir = file.fullPath.startsWith(INBOX_DIR) ? "inbox" : "public";

      assets.push({
        id: `asset_${assets.length + 1}`,
        path: file.relPath,
        fullPath: file.fullPath,
        filename: file.name,
        ext,
        type,
        inferredUse,
        channelFit,
        source: sourceDir,
        publicUrl: null,
        notes: sourceDir === "inbox" ? "User-provided asset" : "Existing repo asset",
      });
    }
  }

  if (skipped.length > 0) {
    logger.warn(`Skipped ${skipped.length} sensitive files`, skipped.slice(0, 10));
  }

  writeFileSync(ASSET_INDEX_FILE, JSON.stringify(assets, null, 2), "utf-8");
  logger.info(`Indexed ${assets.length} assets to ${ASSET_INDEX_FILE}`);

  generateAssetReport(assets, skipped);

  return assets;
}

function generateAssetReport(assets, skipped) {
  const byType = {};
  const byUse = {};
  const bySource = {};
  for (const a of assets) {
    byType[a.type] = (byType[a.type] || 0) + 1;
    byUse[a.inferredUse] = (byUse[a.inferredUse] || 0) + 1;
    bySource[a.source] = (bySource[a.source] || 0) + 1;
  }

  const lines = [
    "# Turpial Sound — Asset Index Report",
    "",
    `**Generated:** ${new Date().toISOString()}`,
    `**Total assets:** ${assets.length}`,
    "",
    "## By Type",
    ...Object.entries(byType).map(([k, v]) => `- ${k}: ${v}`),
    "",
    "## By Use",
    ...Object.entries(byUse).map(([k, v]) => `- ${k}: ${v}`),
    "",
    "## By Source",
    ...Object.entries(bySource).map(([k, v]) => `- ${k}: ${v}`),
    "",
    "## Skipped (Sensitive)",
    ...skipped.slice(0, 20).map((s) => `- \`${s.path}\`: ${s.reason}`),
    "",
    "## All Assets",
    "",
    "| ID | Filename | Type | Use | Channel | Source | Public URL |",
    "|----|----------|------|-----|---------|--------|------------|",
    ...assets.map(
      (a) =>
        `| ${a.id} | ${a.filename} | ${a.type} | ${a.inferredUse} | ${a.channelFit} | ${a.source} | ${a.publicUrl || "-"} |`
    ),
  ];

  writeFileSync(ASSET_INDEX_MD, lines.join("\n"), "utf-8");
  logger.info(`Asset report written to ${ASSET_INDEX_MD}`);
}

export function loadAssetIndex() {
  if (!existsSync(ASSET_INDEX_FILE)) return [];
  return JSON.parse(readFileSync(ASSET_INDEX_FILE, "utf-8"));
}
