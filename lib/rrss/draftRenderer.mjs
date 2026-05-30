import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { resolve, dirname } from "path";
import { DRAFTS_DIR, ROOT } from "./config.mjs";
import logger from "./logger.mjs";

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

export function generateDrafts(queue) {
  logger.info(`Generating drafts for ${queue.length} items...`);

  const dirs = {
    facebook: resolve(DRAFTS_DIR, "facebook"),
    instagram: resolve(DRAFTS_DIR, "instagram"),
    reels: resolve(DRAFTS_DIR, "reels"),
    stories: resolve(DRAFTS_DIR, "stories"),
    replies: resolve(DRAFTS_DIR, "replies"),
  };

  Object.values(dirs).forEach(ensureDir);

  let count = 0;

  for (const item of queue) {
    const draft = formatDraft(item);
    let dir;
    switch (item.format) {
      case "reel":
        dir = dirs.reels;
        break;
      case "story":
        dir = dirs.stories;
        break;
      case "comment_reply":
      case "dm_reply":
        dir = dirs.replies;
        break;
      default:
        dir = dirs[item.channel] || dirs.facebook;
    }

    const filename = `${sanitize(item.id)}.md`;
    const filepath = resolve(dir, filename);

    // If asset is ASSET_REQUIRED, try to find a fallback note
    let assetNote = "";
    if (!item.selectedAsset || item.selectedAsset === "ASSET_REQUIRED") {
      assetNote =
        "\n\n**NOTA:** Sin asset asignado. Revisa el panel de material faltante o asigna manualmente desde el dashboard.";
    } else {
      const publicUrl = item.selectedAssetPublicUrl
        ? item.selectedAssetPublicUrl
        : `/${item.selectedAsset}`;
      assetNote = `\n\n**Asset:** ${item.selectedAsset}\n**Preview:** ${ROOT}${publicUrl}`;
    }

    writeFileSync(
      filepath,
      `# ${item.title || "Draft"}

**ID:** ${item.id}
**Canal:** ${item.channel}
**Formato:** ${item.format}
**Estado:** ${item.status}
**Riesgo:** ${item.riskLevel}

---

## Caption

${item.caption || "(sin caption)"}

---

## Hashtags

${(item.hashtags || []).join(" ") || "(sin hashtags)"}

---

## CTA

${item.cta || "(sin CTA)"}
${assetNote}

---

## Checklist Pre-Publicación

- [ ] Caption revisado por humano
- [ ] Hashtags verificados
- [ ] CTA claro y medible
- [ ] Asset final seleccionado y aprobado
- [ ] No incluye frases bloqueadas por safety
- [ ] El riesgo es aceptable (${item.riskLevel})
- [ ] Canal y formato correctos

---

## Metadatos

- sourceDoc: ${item.sourceDoc || "N/A"}
- scheduledFor: ${item.scheduledFor || "No programado"}
- safetyFlags: ${item.safetyFlags?.length || 0}
- notes: ${item.notes || "Ninguna"}

---

*Este draft fue generado por RRSS Bot. Para editar, usa el dashboard en http://localhost:${process.env.RRSS_REVIEW_PORT || 4877}*
`,
      "utf-8"
    );
    count++;
  }

  logger.info(`Generated ${count} drafts in ${DRAFTS_DIR}`);
  return count;
}

function sanitize(name) {
  return name.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 80);
}

function formatDraft(item) {
  return item;
}
