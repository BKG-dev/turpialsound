import { existsSync, readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rrssDir = __dirname;

const commands = {
  "material-request": {
    desc: "Show required materials for Manuel",
    script: null,
    action() {
      const f = resolve(rrssDir, "..", "..", "data", "rrss", "MATERIAL_REQUEST_NOW.md");
      if (existsSync(f)) {
        console.log(readFileSync(f, "utf-8"));
      } else {
        console.log("MATERIAL_REQUEST_NOW.md not found.");
      }
    },
  },
  "index-assets": {
    desc: "Index assets from /public and data/rrss/inbox/",
    script: "./index-assets.mjs",
  },
  "build-queue": {
    desc: "Build the publication queue JSON",
    script: "./build-publication-queue.mjs",
  },
  validate: {
    desc: "Validate the publication queue",
    script: "./validate-publication-queue.mjs",
  },
  "generate-drafts": {
    desc: "Generate markdown drafts from the queue",
    script: "./generate-drafts.mjs",
  },
  "dry-run": {
    desc: "Simulate publishing (no real posts)",
    script: "./dry-run-publisher.mjs",
  },
  desk: {
    desc: "Start the local review dashboard",
    script: "./rrss-desk.mjs",
  },
  "secure-setup": {
    desc: "Interactive secure credential setup",
    script: "./secure-setup.mjs",
  },
  "credentials-doctor": {
    desc: "Check credential readiness",
    script: "./credentials-doctor.mjs",
  },
  "publish-live": {
    desc: "Publish live (requires RRSS_MODE=live and credentials)",
    script: null,
    action() {
      console.log("\n=== PUBLISH LIVE ===\n");
      console.log("Prerequisites:");
      console.log("  1. RRSS_MODE=live in .env.rrss.local");
      console.log("  2. Meta credentials configured (run credentials-doctor)");
      console.log("  3. Items approved in dashboard");
      console.log("  4. Assets have public URLs for Instagram");
      console.log("\nAfter verifying, run:");
      console.log("  node scripts/rrss/dry-run-publisher.mjs");
      console.log("  (it will do real posts if RRSS_MODE=live)\n");
    },
  },
};

const cmd = process.argv[2];

if (!cmd || cmd === "help" || !commands[cmd]) {
  console.log("\nTurpial Sound — RRSS Bot CLI\n");
  console.log("Usage: node scripts/rrss/rrss-cli.mjs <command>\n");
  console.log("Commands:");
  for (const [name, info] of Object.entries(commands)) {
    console.log(`  ${name.padEnd(22)} ${info.desc}`);
  }
  console.log("");
  process.exit(0);
}

const command = commands[cmd];

if (command.action) {
  command.action();
} else if (command.script) {
  const scriptPath = resolve(rrssDir, command.script);
  if (!existsSync(scriptPath)) {
    console.error(`Script not found: ${scriptPath}`);
    process.exit(1);
  }
  import("file://" + scriptPath.replace(/\\/g, "/")).catch((e) => {
    console.error(`Error running ${cmd}:`, e.message);
    process.exit(1);
  });
}
