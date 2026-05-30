import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { resolve } from "path";
import { DATA_DIR } from "./config.mjs";
import logger from "./logger.mjs";

function loadJSON(filepath) {
  try {
    if (existsSync(filepath)) return JSON.parse(readFileSync(filepath, "utf-8"));
  } catch (e) {
    logger.error(`Failed to load ${filepath}`, e.message);
  }
  return [];
}

function saveJSON(filepath, data) {
  const dir = resolve(filepath, "..");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  writeFileSync(filepath, JSON.stringify(data, null, 2), "utf-8");
}

function maskSecret(value) {
  if (!value) return "MISSING";
  if (value.length <= 8) return `present(length=${value.length})`;
  return `present(length=${value.length}, ending=${value.slice(-4)})`;
}

export function loadSecrets() {
  const secrets = {};

  const localFile = resolve(DATA_DIR, "..", "..", ".env.rrss.local");
  if (existsSync(localFile)) {
    const content = readFileSync(localFile, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim();
      secrets[key] = val;
      if (!process.env[key]) process.env[key] = val;
    }
  }

  return secrets;
}

export function doctorReport() {
  const mode = process.env.RRSS_MODE || "dry-run";
  const isLive = mode === "live";

  const report = {
    mode,
    timestamp: new Date().toISOString(),
    facebook: {
      pageId: process.env.META_PAGE_ID ? "OK" : "MISSING",
      appId: process.env.META_APP_ID ? "OK" : "MISSING",
      appSecret: process.env.META_APP_SECRET ? "OK" : "MISSING",
      accessToken: process.env.META_ACCESS_TOKEN ? "OK" : "MISSING",
      publishAllowed: false,
      reason: "",
    },
    instagram: {
      igUserId: process.env.META_IG_USER_ID ? "OK" : "MISSING",
      publicAssetUrl: process.env.RRSS_PUBLIC_ASSET_BASE_URL ? "OK" : "MISSING",
      publishAllowed: false,
      reason: "",
    },
    messaging: {
      status: "BLOCKED_BY_DESIGN",
      reason: "DM automation disabled in this sprint. Requires webhook config and authorization.",
      verifyToken: process.env.WEBHOOK_VERIFY_TOKEN ? "OK" : "MISSING",
      callbackUrl: process.env.WEBHOOK_CALLBACK_URL ? "OK" : "MISSING",
    },
    summary: {},
  };

  if (!isLive) {
    report.facebook.reason = "RRSS_MODE=dry-run";
    report.instagram.reason = "RRSS_MODE=dry-run";
  } else {
    const fbMissing = [];
    if (report.facebook.pageId === "MISSING") fbMissing.push("META_PAGE_ID");
    if (report.facebook.accessToken === "MISSING") fbMissing.push("META_ACCESS_TOKEN");

    if (fbMissing.length === 0) {
      report.facebook.publishAllowed = true;
      report.facebook.reason = "OK";
    } else {
      report.facebook.reason = `Missing: ${fbMissing.join(", ")}`;
    }

    const igMissing = [];
    if (report.instagram.igUserId === "MISSING") igMissing.push("META_IG_USER_ID");
    if (report.instagram.publicAssetUrl === "MISSING") igMissing.push("RRSS_PUBLIC_ASSET_BASE_URL");

    if (igMissing.length === 0) {
      report.instagram.publishAllowed = true;
      report.instagram.reason = "OK";
    } else {
      report.instagram.reason = `Missing: ${igMissing.join(", ")}`;
    }
  }

  report.summary = {
    dryRunOK: !isLive,
    liveBlocked: !isLive || !report.facebook.publishAllowed || !report.instagram.publishAllowed,
    facebookReady: report.facebook.publishAllowed,
    instagramReady: report.instagram.publishAllowed,
    messagingReady: false,
  };

  return report;
}

export function printDoctorReport() {
  const report = doctorReport();

  console.log("\n========================================");
  console.log("  RRSS BOT — CREDENTIALS DOCTOR");
  console.log("========================================");
  console.log(`  Mode: ${report.mode}`);
  console.log(`  Time: ${report.timestamp}`);
  console.log("");

  console.log("--- Facebook ---");
  console.log(`  Page ID:       ${report.facebook.pageId}`);
  console.log(`  App ID:        ${report.facebook.appId}`);
  console.log(`  App Secret:    ${report.facebook.appSecret}`);
  console.log(`  Access Token:  ${report.facebook.accessToken}`);
  console.log(`  Publish OK:    ${report.facebook.publishAllowed ? "YES" : "BLOCKED"}`);
  console.log(`  Reason:        ${report.facebook.reason}`);

  console.log("");
  console.log("--- Instagram ---");
  console.log(`  IG User ID:      ${report.instagram.igUserId}`);
  console.log(`  Public Asset URL: ${report.instagram.publicAssetUrl}`);
  console.log(`  Publish OK:      ${report.instagram.publishAllowed ? "YES" : "BLOCKED"}`);
  console.log(`  Reason:          ${report.instagram.reason}`);

  console.log("");
  console.log("--- Messaging ---");
  console.log(`  Status:  ${report.messaging.status}`);
  console.log(`  Reason:  ${report.messaging.reason}`);

  console.log("");
  console.log("--- Summary ---");
  console.log(`  Dry Run OK:     ${report.summary.dryRunOK ? "YES" : "NO"}`);
  console.log(`  Live Blocked:   ${report.summary.liveBlocked ? "YES" : "NO"}`);
  console.log(`  Facebook:       ${report.summary.facebookReady ? "READY" : "BLOCKED"}`);
  console.log(`  Instagram:      ${report.summary.instagramReady ? "READY" : "BLOCKED"}`);
  console.log(`  Messaging:      ${report.summary.messagingReady ? "READY" : "BLOCKED"}`);
  console.log("========================================\n");

  return report;
}
