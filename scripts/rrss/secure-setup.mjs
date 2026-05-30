import { existsSync, writeFileSync, readFileSync, appendFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import readline from "readline";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..", "..");
const envLocal = resolve(root, ".env.rrss.local");
const gitignore = resolve(root, ".gitignore");

function loadEnv(filepath) {
  const vars = {};
  if (existsSync(filepath)) {
    const content = readFileSync(filepath, "utf-8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const eq = trimmed.indexOf("=");
      if (eq === -1) continue;
      vars[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    }
  }
  return vars;
}

function saveEnv(filepath, vars) {
  const lines = [];
  lines.push("# Turpial Sound — RRSS Bot Local Secrets");
  lines.push("# WARNING: NEVER commit this file. It is in .gitignore.");
  lines.push("# Generated: " + new Date().toISOString());
  lines.push("");

  for (const [key, value] of Object.entries(vars)) {
    lines.push(`${key}=${value}`);
  }
  lines.push("");

  writeFileSync(filepath, lines.join("\n"), "utf-8");
}

function ensureGitignore() {
  const required = [
    ".env",
    ".env.*",
    "!.env.example",
    "!.env.rrss.example",
    "data/rrss/secrets/",
    "data/rrss/private/",
    "data/rrss/*.local.json",
    "data/rrss/**/*.secret.*",
    ".env.rrss.local",
  ];

  let content = "";
  if (existsSync(gitignore)) {
    content = readFileSync(gitignore, "utf-8");
  }

  let modified = false;
  const lines = content.split("\n").map((l) => l.trim());

  for (const entry of required) {
    if (!lines.includes(entry)) {
      appendFileSync(gitignore, `\n${entry}`);
      modified = true;
    }
  }

  if (modified) {
    console.log("Updated .gitignore with secure entries.");
  }
}

function prompt(rl, question, hidden = false) {
  return new Promise((resolve) => {
    if (hidden) {
      rl.question(question, (answer) => {
        resolve(answer);
      });
    } else {
      rl.question(question, resolve);
    }
  });
}

async function main() {
  console.log("\n========================================");
  console.log("  RRSS BOT — SECURE SETUP WIZARD");
  console.log("========================================");
  console.log("");
  console.log("This wizard helps you set up credentials securely.");
  console.log("Secrets are stored in .env.rrss.local (gitignored).");
  console.log("They are NEVER printed, committed, or sent anywhere.");
  console.log("");
  console.log("WARNING: Check your terminal history — some shells log input.");
  console.log("========================================\n");

  ensureGitignore();

  const existing = loadEnv(envLocal);
  if (Object.keys(existing).length > 0) {
    console.log("Existing .env.rrss.local found.");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    const answer = await prompt(rl, "Update existing? (y/n): ");
    rl.close();
    if (answer.toLowerCase() !== "y") {
      console.log("Setup cancelled. Existing config preserved.");
      return;
    }
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  console.log("\n--- Non-secret settings ---\n");

  const mode = await prompt(rl, `RRSS_MODE [${existing.RRSS_MODE || "dry-run"}]: `);
  const pageId = await prompt(rl, `META_PAGE_ID [${existing.META_PAGE_ID || ""}]: `);
  const igUserId = await prompt(rl, `META_IG_USER_ID [${existing.META_IG_USER_ID || ""}]: `);
  const publicAssetUrl = await prompt(rl, `RRSS_PUBLIC_ASSET_BASE_URL [${existing.RRSS_PUBLIC_ASSET_BASE_URL || ""}]: `);

  console.log("\n--- Secrets (input hidden recommended) ---");
  console.log("Paste each value and press Enter. Characters WILL be visible in terminal.");
  console.log("");

  const appId = await prompt(rl, `META_APP_ID [${existing.META_APP_ID ? "***present***" : ""}]: `);
  const appSecret = await prompt(rl, `META_APP_SECRET [${existing.META_APP_SECRET ? "***present***" : ""}]: `);
  const accessToken = await prompt(rl, `META_ACCESS_TOKEN [${existing.META_ACCESS_TOKEN ? "***present***" : ""}]: `);

  rl.close();

  const vars = {};

  if (mode) vars.RRSS_MODE = mode;
  if (pageId) vars.META_PAGE_ID = pageId;
  if (igUserId) vars.META_IG_USER_ID = igUserId;
  if (publicAssetUrl) vars.RRSS_PUBLIC_ASSET_BASE_URL = publicAssetUrl;
  if (appId) vars.META_APP_ID = appId;
  if (appSecret) vars.META_APP_SECRET = appSecret;
  if (accessToken) vars.META_ACCESS_TOKEN = accessToken;

  const final = { ...existing, ...vars };
  saveEnv(envLocal, final);

  console.log("\n========================================");
  console.log("  Setup complete!");
  console.log("========================================");
  console.log(`  Config saved to: ${envLocal}`);
  console.log(`  Secrets present: ${Object.keys(vars).filter((k) => k.includes("SECRET") || k.includes("TOKEN")).length}`);
  console.log("");
  console.log("  Next steps:");
  console.log("    node scripts/rrss/rrss-cli.mjs credentials-doctor");
  console.log("    node scripts/rrss/rrss-cli.mjs desk");
  console.log("========================================\n");
}

main().catch((e) => {
  console.error("Setup error:", e.message);
  process.exit(1);
});
