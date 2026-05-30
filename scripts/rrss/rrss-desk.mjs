import http from "http";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";
import { RRSS_REVIEW_PORT, RRSS_BRAND_NAME, QUEUE_FILE } from "../../lib/rrss/config.mjs";
import publicationQueue from "../../lib/rrss/publicationQueue.mjs";
const { updateItem, getStats } = publicationQueue;
import { printDoctorReport } from "../../lib/rrss/secretLoader.mjs";
import logger from "../../lib/rrss/logger.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = RRSS_REVIEW_PORT;

function loadQueue() {
  try {
    if (existsSync(QUEUE_FILE)) return JSON.parse(readFileSync(QUEUE_FILE, "utf-8"));
  } catch (e) {
    logger.error("Failed to load queue", e.message);
  }
  return [];
}

function saveQueue(queue) {
  writeFileSync(QUEUE_FILE, JSON.stringify(queue, null, 2), "utf-8");
}

function serveHTML() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${RRSS_BRAND_NAME} — RRSS Bot Dashboard</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0a0a0a; color: #e0e0e0; padding: 20px; }
  .header { background: #1a1a2e; padding: 20px; border-radius: 8px; margin-bottom: 20px; border: 1px solid #2a2a4e; }
  .header h1 { color: #f59e0b; font-size: 24px; margin-bottom: 4px; }
  .header p { color: #888; font-size: 14px; }
  .filters { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; }
  .filters select, .filters button { padding: 8px 12px; border-radius: 6px; border: 1px solid #333; background: #1a1a2e; color: #e0e0e0; cursor: pointer; font-size: 13px; }
  .filters button:hover { background: #2a2a4e; }
  .filters button.active { background: #f59e0b; color: #000; border-color: #f59e0b; }
  .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 10px; margin-bottom: 20px; }
  .stat { background: #1a1a2e; padding: 12px; border-radius: 6px; text-align: center; border: 1px solid #2a2a4e; }
  .stat .num { font-size: 24px; font-weight: bold; color: #f59e0b; }
  .stat .label { font-size: 11px; color: #888; margin-top: 4px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); gap: 16px; }
  .card { background: #1a1a2e; border-radius: 8px; padding: 16px; border: 1px solid #2a2a4e; position: relative; }
  .card.risk-high { border-color: #ef4444; }
  .card.risk-medium { border-color: #f59e0b; }
  .card.risk-low { border-color: #22c55e; }
  .card-header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px; }
  .card-id { font-size: 12px; color: #888; font-family: monospace; }
  .card-channel { font-size: 11px; padding: 2px 8px; border-radius: 4px; }
  .channel-facebook { background: #1877f2; color: #fff; }
  .channel-instagram { background: #e4405f; color: #fff; }
  .card-status { font-size: 11px; padding: 2px 8px; border-radius: 4px; text-transform: uppercase; }
  .status-needs_review { background: #f59e0b; color: #000; }
  .status-approved { background: #22c55e; color: #000; }
  .status-rejected { background: #ef4444; color: #fff; }
  .status-published { background: #3b82f6; color: #fff; }
  .card-title { font-size: 16px; font-weight: 600; margin-bottom: 8px; color: #fff; }
  .card label { display: block; font-size: 11px; color: #888; margin-bottom: 2px; margin-top: 8px; }
  .card textarea, .card input { width: 100%; padding: 8px; border-radius: 4px; border: 1px solid #333; background: #0a0a0a; color: #e0e0e0; font-size: 13px; font-family: inherit; resize: vertical; }
  .card textarea { min-height: 80px; }
  .card .meta { display: flex; gap: 12px; flex-wrap: wrap; margin-top: 8px; font-size: 11px; color: #666; }
  .card .asset-info { margin-top: 8px; padding: 8px; background: #0a0a0a; border-radius: 4px; font-size: 12px; }
  .card .asset-info .missing { color: #ef4444; }
  .card .asset-info .ok { color: #22c55e; }
  .card .safety-flags { margin-top: 8px; padding: 6px 8px; background: rgba(239,68,68,0.15); border-radius: 4px; font-size: 11px; color: #ef4444; }
  .card-actions { display: flex; gap: 8px; margin-top: 12px; flex-wrap: wrap; }
  .card-actions button { padding: 6px 14px; border-radius: 4px; border: none; cursor: pointer; font-size: 12px; font-weight: 600; transition: all 0.2s; }
  .btn-save { background: #3b82f6; color: #fff; }
  .btn-approve { background: #22c55e; color: #000; }
  .btn-reject { background: #ef4444; color: #fff; }
  .btn-publish { background: #f59e0b; color: #000; }
  .btn-publish:disabled { background: #333; color: #666; cursor: not-allowed; }
  .card-actions button:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
  .toast { position: fixed; bottom: 20px; right: 20px; padding: 12px 20px; border-radius: 6px; color: #fff; font-size: 13px; z-index: 1000; animation: slideIn 0.3s ease; }
  .toast-success { background: #22c55e; }
  .toast-error { background: #ef4444; }
  @keyframes slideIn { from { transform: translateY(100px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .panels { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px; }
  .panel { background: #1a1a2e; padding: 16px; border-radius: 8px; border: 1px solid #2a2a4e; }
  .panel h3 { color: #f59e0b; margin-bottom: 10px; font-size: 15px; }
  .panel .status-ok { color: #22c55e; }
  .panel .status-missing { color: #ef4444; }
  .panel .status-blocked { color: #f59e0b; }
  .panel p { font-size: 12px; margin-bottom: 4px; color: #aaa; }
  .material-list { max-height: 200px; overflow-y: auto; font-size: 11px; }
  .material-list .item { padding: 4px 0; border-bottom: 1px solid #222; }
  .material-list .item .obligatorio { color: #ef4444; }
  .material-list .item .fallback { color: #f59e0b; }
  .empty-state { text-align: center; padding: 60px 20px; color: #666; }
  .empty-state p { font-size: 16px; }
  .loading { text-align: center; padding: 40px; color: #888; }
</style>
</head>
<body>
<div class="header">
  <h1>${RRSS_BRAND_NAME} — RRSS Bot Dashboard</h1>
  <p>Review, approve, and manage social media publications.</p>
</div>

<div class="filters" id="filters">
  <select id="filterChannel" onchange="render()">
    <option value="all">All Channels</option>
    <option value="facebook">Facebook</option>
    <option value="instagram">Instagram</option>
  </select>
  <select id="filterFormat" onchange="render()">
    <option value="all">All Formats</option>
    <option value="feed">Feed</option>
    <option value="carousel">Carousel</option>
    <option value="reel">Reel</option>
    <option value="story">Story</option>
    <option value="comment_reply">Comment Reply</option>
    <option value="dm_reply">DM Reply</option>
  </select>
  <select id="filterStatus" onchange="render()">
    <option value="all">All Status</option>
    <option value="needs_review">Needs Review</option>
    <option value="approved">Approved</option>
    <option value="rejected">Rejected</option>
  </select>
  <select id="filterRisk" onchange="render()">
    <option value="all">All Risk</option>
    <option value="high">High</option>
    <option value="medium">Medium</option>
    <option value="low">Low</option>
  </select>
  <button onclick="refresh()">Refresh</button>
</div>

<div class="stats" id="stats"></div>

<div class="panels" id="panels">
  <div class="panel" id="liveReadiness"></div>
  <div class="panel" id="materialPanel"></div>
</div>

<div id="toast" class="toast"></div>

<div class="grid" id="grid">
  <div class="empty-state"><p>Loading publications...</p></div>
</div>

<script>
let queue = [];
let doctor = null;

async function fetchQueue() {
  try {
    const r = await fetch("/api/queue");
    const data = await r.json();
    queue = data.queue || [];
    doctor = data.doctor || null;
    render();
  } catch (e) {
    document.getElementById("grid").innerHTML =
      '<div class="empty-state"><p>Error loading. Is the server running?</p></div>';
  }
}

function getFiltered() {
  const ch = document.getElementById("filterChannel").value;
  const fmt = document.getElementById("filterFormat").value;
  const st = document.getElementById("filterStatus").value;
  const rk = document.getElementById("filterRisk").value;
  return queue.filter((item) => {
    if (ch !== "all" && item.channel !== ch) return false;
    if (fmt !== "all" && item.format !== fmt) return false;
    if (st !== "all" && item.status !== st) return false;
    if (rk !== "all" && item.riskLevel !== rk) return false;
    return true;
  });
}

function render() {
  const filtered = getFiltered();
  renderStats(filtered);
  renderCards(filtered);
  renderLiveReadiness();
  renderMaterialPanel();
}

function renderStats(items) {
  const total = items.length;
  const approved = items.filter((i) => i.status === "approved").length;
  const needsReview = items.filter((i) => i.status === "needs_review").length;
  const rejected = items.filter((i) => i.status === "rejected").length;
  const highRisk = items.filter((i) => i.riskLevel === "high").length;
  const needsAsset = items.filter((i) => !i.selectedAsset || i.selectedAsset === "ASSET_REQUIRED").length;
  document.getElementById("stats").innerHTML =
    '<div class="stat"><div class="num">' + total + '</div><div class="label">Total</div></div>' +
    '<div class="stat"><div class="num">' + needsReview + '</div><div class="label">Needs Review</div></div>' +
    '<div class="stat"><div class="num">' + approved + '</div><div class="label">Approved</div></div>' +
    '<div class="stat"><div class="num">' + rejected + '</div><div class="label">Rejected</div></div>' +
    '<div class="stat"><div class="num">' + highRisk + '</div><div class="label">High Risk</div></div>' +
    '<div class="stat"><div class="num">' + needsAsset + '</div><div class="label">Needs Asset</div></div>';
}

function renderLiveReadiness() {
  if (!doctor) return;
  const fbReady = doctor.summary.facebookReady;
  const igReady = doctor.summary.instagramReady;
  const mode = doctor.mode;
  const liveBlocked = doctor.summary.liveBlocked;

  document.getElementById("liveReadiness").innerHTML =
    '<h3>Live Readiness</h3>' +
    '<p>Mode: <strong>' + mode + '</strong></p>' +
    '<p>Facebook: <span class="' + (fbReady ? 'status-ok' : 'status-blocked') + '">' +
      (fbReady ? 'READY' : 'BLOCKED') + ' — ' + doctor.facebook.reason + '</span></p>' +
    '<p>Instagram: <span class="' + (igReady ? 'status-ok' : 'status-blocked') + '">' +
      (igReady ? 'READY' : 'BLOCKED') + ' — ' + doctor.instagram.reason + '</span></p>' +
    '<p>Messaging: <span class="status-blocked">BLOCKED BY DESIGN</span> — ' + doctor.messaging.reason + '</p>' +
    '<p>Live publish: <strong>' + (liveBlocked ? 'BLOCKED' : 'ALLOWED') + '</strong></p>';
}

function renderMaterialPanel() {
  const missing = queue.filter((i) => !i.selectedAsset || i.selectedAsset === "ASSET_REQUIRED");
  if (missing.length === 0) {
    document.getElementById("materialPanel").innerHTML =
      '<h3>Material Faltante</h3><p class="status-ok">All items have assets assigned.</p>';
    return;
  }
  let html = '<h3>Material Faltante (' + missing.length + ' items)</h3>';
  html += '<div class="material-list">';
  for (const item of missing) {
    html += '<div class="item"><span class="obligatorio">MISSING</span> ' +
      item.id + ' (' + item.channel + '/' + item.format + (item.title ? ' — ' + item.title : '') + ')</div>';
  }
  html += '</div>';
  html += '<p style="margin-top:10px;font-size:11px;color:#888;">Check <code>data/rrss/MATERIAL_REQUEST_NOW.md</code></p>';
  document.getElementById("materialPanel").innerHTML = html;
}

function renderCards(items) {
  if (items.length === 0) {
    document.getElementById("grid").innerHTML =
      '<div class="empty-state"><p>No publications match the filters.</p></div>';
    return;
  }

  let html = "";
  for (const item of items) {
    const riskClass = "risk-" + (item.riskLevel || "low");
    const channelClass = "channel-" + item.channel;
    const statusClass = "status-" + (item.status || "needs_review");
    const publishDisabled = !(item.status === "approved" && !doctor?.summary?.liveBlocked);

    const assetInfo = item.selectedAsset && item.selectedAsset !== "ASSET_REQUIRED"
      ? '<div class="asset-info"><span class="ok">Asset: ' + item.selectedAsset + '</span>' +
        (item.selectedAssetPublicUrl ? ' | <a href="' + item.selectedAssetPublicUrl + '" target="_blank" style="color:#3b82f6">Preview</a>' : '') +
        (item.requiresPublicUrlForLive ? ' <span style="color:#f59e0b">(needs public URL for live)</span>' : '') + '</div>'
      : '<div class="asset-info"><span class="missing">ASSET REQUIRED</span></div>';

    html += '<div class="card ' + riskClass + '" data-id="' + item.id + '">' +
      '<div class="card-header">' +
        '<span class="card-id">' + item.id + '</span>' +
        '<span class="card-channel ' + channelClass + '">' + item.channel + '</span>' +
        '<span class="card-status ' + statusClass + '">' + item.status + '</span>' +
      '</div>' +
      '<div class="card-title">' + (item.title || "Untitled") + '</div>' +
      '<div class="meta">' +
        '<span>Format: ' + item.format + '</span>' +
        '<span>Risk: ' + item.riskLevel + '</span>' +
      '</div>' +
      assetInfo +
      (item.safetyFlags && item.safetyFlags.length > 0
        ? '<div class="safety-flags">Safety Flags: ' +
          item.safetyFlags.map((f) => f.phrase).join(", ") + '</div>'
        : "") +
      '<label>Caption</label>' +
      '<textarea data-id="' + item.id + '" data-field="caption">' + (item.caption || "") + '</textarea>' +
      '<label>Hashtags</label>' +
      '<input data-id="' + item.id + '" data-field="hashtags" value="' + ((item.hashtags || []).join(" ")) + '">' +
      '<label>CTA</label>' +
      '<input data-id="' + item.id + '" data-field="cta" value="' + (item.cta || "") + '">' +
      (item.notes ? '<div class="meta" style="color:#f59e0b;">' + item.notes + '</div>' : "") +
      '<div class="card-actions">' +
        '<button class="btn-save" onclick="saveItem(\'' + item.id + '\')">Save</button>' +
        '<button class="btn-approve" onclick="approveItem(\'' + item.id + '\')">Approve</button>' +
        '<button class="btn-reject" onclick="rejectItem(\'' + item.id + '\')">Reject</button>' +
        '<button class="btn-publish" ' + (publishDisabled ? 'disabled' : '') +
          ' onclick="publishItem(\'' + item.id + '\')" title="' + (publishDisabled ? 'Blocked: check live readiness' : '') + '">Publish Live</button>' +
      '</div>' +
    '</div>';
  }

  document.getElementById("grid").innerHTML = html;
}

function showToast(msg, type) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.className = "toast toast-" + type;
  toast.style.display = "block";
  setTimeout(() => { toast.style.display = "none"; }, 3000);
}

async function saveItem(id) {
  const caption = document.querySelector('textarea[data-id="' + id + '"][data-field="caption"]')?.value || "";
  const hashtags = document.querySelector('input[data-id="' + id + '"][data-field="hashtags"]')?.value || "";
  const cta = document.querySelector('input[data-id="' + id + '"][data-field="cta"]')?.value || "";
  const tagList = hashtags.split(/\s+/).filter(Boolean);

  try {
    const r = await fetch("/api/item/" + id + "/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ caption, hashtags: tagList, cta }),
    });
    if (r.ok) {
      showToast("Saved: " + id, "success");
      refresh();
    } else {
      showToast("Error saving", "error");
    }
  } catch (e) {
    showToast("Error: " + e.message, "error");
  }
}

async function approveItem(id) {
  try {
    const r = await fetch("/api/item/" + id + "/approve", { method: "POST" });
    if (r.ok) {
      showToast("Approved: " + id, "success");
      refresh();
    } else {
      const data = await r.json();
      showToast(data.error || "Error approving", "error");
    }
  } catch (e) {
    showToast("Error: " + e.message, "error");
  }
}

async function rejectItem(id) {
  try {
    const r = await fetch("/api/item/" + id + "/reject", { method: "POST" });
    if (r.ok) {
      showToast("Rejected: " + id, "success");
      refresh();
    } else {
      showToast("Error rejecting", "error");
    }
  } catch (e) {
    showToast("Error: " + e.message, "error");
  }
}

async function publishItem(id) {
  try {
    const r = await fetch("/api/item/" + id + "/publish-live", { method: "POST" });
    const data = await r.json();
    if (r.ok && data.success) {
      showToast(data.message || "Published " + id, "success");
    } else {
      showToast(data.error || data.message || "Blocked", "error");
    }
    refresh();
  } catch (e) {
    showToast("Error: " + e.message, "error");
  }
}

function refresh() {
  fetchQueue();
}

fetchQueue();
</script>
</body>
</html>`;
}

function respondJSON(res, data, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body));
      } catch {
        resolve({});
      }
    });
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(serveHTML());
    return;
  }

  if (url.pathname === "/api/queue") {
    const queue = loadQueue();
    const { printDoctorReport } = await import("../../lib/rrss/secretLoader.mjs");
    const doctor = (await import("../../lib/rrss/secretLoader.mjs")).doctorReport();
    respondJSON(res, { queue, stats: getStats(queue), doctor });
    return;
  }

  const itemMatch = url.pathname.match(/^\/api\/item\/([^/]+)\/(save|approve|reject|publish-live)$/);
  if (itemMatch && req.method === "POST") {
    const id = itemMatch[1];
    const action = itemMatch[2];
    const queue = loadQueue();
    const item = queue.find((i) => i.id === id);

    if (!item) {
      respondJSON(res, { error: "Item not found" }, 404);
      return;
    }

    if (action === "save") {
      const body = await parseBody(req);
      const updated = updateItem(queue, id, {
        caption: body.caption !== undefined ? body.caption : item.caption,
        hashtags: body.hashtags !== undefined ? body.hashtags : item.hashtags,
        cta: body.cta !== undefined ? body.cta : item.cta,
      });
      logger.info(`Saved item ${id}`);
      respondJSON(res, { success: true, item: updated });
      return;
    }

    if (action === "approve") {
      if (item.riskLevel === "high") {
        respondJSON(res, { error: "High risk items require manual review. Cannot auto-approve." }, 400);
        return;
      }
      if (item.safetyFlags && item.safetyFlags.length > 0) {
        respondJSON(res, { error: "Item has safety flags: " + item.safetyFlags.map((f) => f.phrase).join(", ") }, 400);
        return;
      }
      const updated = updateItem(queue, id, { status: "approved" });
      logger.info(`Approved item ${id}`);
      respondJSON(res, { success: true, item: updated });
      return;
    }

    if (action === "reject") {
      const updated = updateItem(queue, id, { status: "rejected" });
      logger.info(`Rejected item ${id}`);
      respondJSON(res, { success: true, item: updated });
      return;
    }

    if (action === "publish-live") {
      const { canPublishLive, publishQueueItemLive } = await import(
        "../../lib/rrss/metaPublisherAdapter.mjs"
      );
      const validation = canPublishLive(item);
      if (!validation.allowed) {
        respondJSON(res, { success: false, error: validation.reasons.join("; ") }, 400);
        return;
      }
      const result = await publishQueueItemLive(item);
      if (result.success) {
        updateItem(queue, id, { status: "published", publishedAt: new Date().toISOString() });
        logger.info(`Published item ${id}`);
      }
      respondJSON(res, result);
      return;
    }
  }

  if (url.pathname === "/assets") {
    const assetPath = url.searchParams.get("path");
    if (assetPath && existsSync(resolve(__dirname, "..", "..", assetPath))) {
      res.writeHead(200, { "Content-Type": "text/plain" });
      res.end(`Asset exists: ${assetPath}`);
    } else {
      res.writeHead(404);
      res.end("Asset not found");
    }
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log("");
  console.log("========================================");
  console.log(`  ${RRSS_BRAND_NAME} — RRSS Bot Dashboard`);
  console.log("========================================");
  console.log(`  URL: http://localhost:${PORT}`);
  console.log(`  Mode: ${process.env.RRSS_MODE || "dry-run"}`);
  console.log("");
  console.log("  API Routes:");
  console.log(`    GET  /api/queue`);
  console.log(`    POST /api/item/:id/save`);
  console.log(`    POST /api/item/:id/approve`);
  console.log(`    POST /api/item/:id/reject`);
  console.log(`    POST /api/item/:id/publish-live`);
  console.log("");
  console.log("  Press Ctrl+C to stop");
  console.log("========================================\n");
  logger.info(`Dashboard started on http://localhost:${PORT}`);
});
