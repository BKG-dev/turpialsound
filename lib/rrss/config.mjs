import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..", "..");

function loadEnvFile(filepath) {
  if (!existsSync(filepath)) return;
  const content = readFileSync(filepath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) {
      process.env[key] = val;
    }
  }
}

loadEnvFile(resolve(root, ".env.rrss.local"));
loadEnvFile(resolve(root, ".env.local"));

function env(key, fallback = "") {
  return process.env[key] || fallback;
}

function boolEnv(key, fallback = false) {
  const v = env(key, fallback ? "true" : "false").toLowerCase();
  return v === "true" || v === "1";
}

export const RRSS_MODE = env("RRSS_MODE", "dry-run");
export const RRSS_REQUIRE_APPROVAL = boolEnv("RRSS_REQUIRE_APPROVAL", true);
export const RRSS_REVIEW_PORT = parseInt(env("RRSS_REVIEW_PORT", "4877"), 10);
export const RRSS_ALLOWED_CHANNELS = env("RRSS_ALLOWED_CHANNELS", "facebook,instagram")
  .split(",")
  .map((c) => c.trim())
  .filter(Boolean);
export const RRSS_TIMEZONE = env("RRSS_TIMEZONE", "America/Caracas");
export const RRSS_BRAND_NAME = env("RRSS_BRAND_NAME", "Turpial Sound");

export const META_APP_ID = env("META_APP_ID");
export const META_APP_SECRET = env("META_APP_SECRET");
export const META_ACCESS_TOKEN = env("META_ACCESS_TOKEN");
export const META_PAGE_ID = env("META_PAGE_ID");
export const META_IG_USER_ID = env("META_IG_USER_ID");

export const RRSS_PUBLIC_ASSET_BASE_URL = env("RRSS_PUBLIC_ASSET_BASE_URL");
export const RRSS_DRY_RUN_OUTPUT_DIR = env("RRSS_DRY_RUN_OUTPUT_DIR", "data/rrss/drafts");
export const RRSS_LOG_DIR = env("RRSS_LOG_DIR", "data/rrss/logs");

export const DATA_DIR = resolve(root, "data", "rrss");
export const INBOX_DIR = resolve(DATA_DIR, "inbox");
export const QUEUE_DIR = resolve(DATA_DIR, "queue");
export const DRAFTS_DIR = resolve(DATA_DIR, "drafts");
export const REPORTS_DIR = resolve(DATA_DIR, "reports");
export const LOGS_DIR = resolve(DATA_DIR, "logs");
export const PUBLIC_DIR = resolve(root, "public");
export const QUEUE_FILE = resolve(QUEUE_DIR, "publication-queue.json");
export const RESPONSE_RULES_FILE = resolve(QUEUE_DIR, "response-rules.json");
export const ASSET_INDEX_FILE = resolve(REPORTS_DIR, "asset-index.json");
export const ASSET_INDEX_MD = resolve(REPORTS_DIR, "asset-index.md");

export const ROOT = root;
