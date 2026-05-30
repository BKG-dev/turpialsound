# Turpial Sound — RRSS Bot Live Review MVP Handoff

**Versión:** v1.0  
**Fecha:** 2026-05-30  
**Branch:** `Manuel/rrss-bot-live-review-mvp-2026-05-30`  
**Commit:** PENDING  

---

## Summary

RRSS Bot MVP funcional construido. 35 publicaciones en cola, dashboard local de revisión/aprobación, motor de assets, safety rules, response bot, y adaptador Meta seguro (bloqueado hasta credenciales).

---

## What Works

### Dashboard (`http://localhost:4877`)
- Panel de Live Readiness con estado de credenciales
- Panel de Material Faltante
- Cards editables por publicación (caption, hashtags, CTA)
- Botones Save / Approve / Reject / Publish Live
- Filtros por canal, formato, estado, riesgo
- Stats en tiempo real
- Publish Live bloqueado correctamente en dry-run

### CLI
- `node scripts/rrss/rrss-cli.mjs` con todos los comandos
- 9 comandos funcionales: material-request, index-assets, build-queue, validate, generate-drafts, dry-run, desk, secure-setup, credentials-doctor

### Asset Engine
- Indexador lee `/public` (304 assets) y `data/rrss/inbox/`
- Genera `asset-index.json` y `asset-index.md`
- Omite archivos sensibles (payment-proofs)
- Match automático entre posts y assets

### Publication Queue
- 35 items en `data/rrss/queue/publication-queue.json`
- 10 Facebook posts, 10 Instagram feed (6 carruseles), 5 reels, 5 stories, 5 DM/reply suggestions
- Cada item con caption, hashtags, CTA, asset, safety flags, risk level
- Correcciones del Consejo de Expertos aplicadas

### Safety Engine
- Detección de 15+ frases prohibidas
- Clasificación de riesgo: low/medium/high
- Bloqueo de auto-aprobación para items de alto riesgo
- Flag de revisión humana para contenido sensible

### Meta Publisher Adapter
- Funciones listas: validateMetaEnv, canPublishLive, publishFacebook*, createInstagramMediaContainer
- Bloqueo en dry-run
- Bloqueo si faltan credenciales
- Bloqueo si Instagram no tiene public asset URL
- Nunca imprime tokens

### Secure Credentials
- `secure-setup.mjs`: wizard interactivo
- `credentials-doctor.mjs`: diagnóstico sin exponer secretos
- `.env.rrss.example` con placeholders
- `.env.rrss.local` gitignored por defecto

### Response Bot
- 12 reglas de respuesta (keyword → intent → reply sugerido)
- Clasificación: COMPRAR, VENDER, PRECIO, PAGO, ENVÍO, RECLAMO, etc.
- Reclamos y pagos siempre derivan a humano
- NO activo para envío automático

---

## Files Created

| File | Description |
|------|-------------|
| `lib/rrss/config.mjs` | Configuration loader |
| `lib/rrss/logger.mjs` | Structured logger |
| `lib/rrss/assetIndex.mjs` | Asset indexer + report generator |
| `lib/rrss/matchAssetsToPosts.mjs` | Asset-to-post matching |
| `lib/rrss/publicationQueue.mjs` | Queue CRUD + stats |
| `lib/rrss/safetyRules.mjs` | Phrase scanner + risk assessment |
| `lib/rrss/draftRenderer.mjs` | Draft markdown generator |
| `lib/rrss/metaPublisherAdapter.mjs` | Meta API adapter (safe) |
| `lib/rrss/responseBot.mjs` | Response rules + matching |
| `lib/rrss/secretLoader.mjs` | Secret loader + doctor |
| `scripts/rrss/rrss-cli.mjs` | CLI dispatcher |
| `scripts/rrss/rrss-desk.mjs` | Dashboard server |
| `scripts/rrss/index-assets.mjs` | Index task |
| `scripts/rrss/build-publication-queue.mjs` | Queue builder |
| `scripts/rrss/validate-publication-queue.mjs` | Queue validator |
| `scripts/rrss/generate-drafts.mjs` | Draft generator task |
| `scripts/rrss/dry-run-publisher.mjs` | Dry-run task |
| `scripts/rrss/secure-setup.mjs` | Secure setup wizard |
| `scripts/rrss/credentials-doctor.mjs` | Credential diagnostics |
| `data/rrss/MATERIAL_REQUEST_NOW.md` | Asset requirements for Manuel |
| `data/rrss/queue/publication-queue.json` | 35-item publication queue |
| `data/rrss/reports/asset-index.json` | 304 indexed assets |
| `data/rrss/reports/asset-index.md` | Human-readable asset report |
| `data/rrss/queue/response-rules.json` | 12 response rules |
| `.env.rrss.example` | Environment template |
| `docs/marketing/rrss/13_rrss_bot_today_runbook.md` | How-to guide |
| `docs/07_handoffs/rrss-bot-live-review-mvp-2026-05-30.md` | This handoff |

---

## Commands

```
node scripts/rrss/rrss-cli.mjs material-request
node scripts/rrss/rrss-cli.mjs index-assets
node scripts/rrss/rrss-cli.mjs build-queue
node scripts/rrss/rrss-cli.mjs validate
node scripts/rrss/rrss-cli.mjs generate-drafts
node scripts/rrss/rrss-cli.mjs dry-run
node scripts/rrss/rrss-cli.mjs desk
node scripts/rrss/rrss-cli.mjs secure-setup
node scripts/rrss/rrss-cli.mjs credentials-doctor
```

Or via npm:
```
pnpm rrss:index-assets
pnpm rrss:build-queue
pnpm rrss:validate
pnpm rrss:generate-drafts
pnpm rrss:dry-run
pnpm rrss:desk
pnpm rrss:secure-setup
pnpm rrss:credentials-doctor
```

---

## Publications Generated

| Category | Count |
|----------|-------|
| Facebook Feed | 10 |
| Instagram Feed | 4 |
| Instagram Carousels | 6 |
| Reels | 5 |
| Stories | 5 |
| Replies/DM Suggestions | 5 |
| **Total** | **35** |

---

## Assets Status

- **Indexed:** 304 (from `/public`)
- **Inbox:** 0 (Manuel needs to add)
- **Skipped (sensitive):** 2 payment proof files
- **Needs Asset:** Assets matched automatically from `/public` fallback

---

## Safety Validation

- 23 items: no flags (low risk)
- 12 items: flagged for human review (mentions of precio/comisión/pago)
- 1 item: high risk (reply_05 — reclamo, correctamente requiere humano)
- 0 items: critical risk

---

## Dry Run Result

- 35 items in queue, 0 approved, 0 published
- Live publish: BLOCKED (RRSS_MODE=dry-run, no credentials)
- All items start in `needs_review` status

---

## What's Missing for Live

### Facebook
- [ ] META_PAGE_ID
- [ ] META_ACCESS_TOKEN
- [ ] META_APP_ID + META_APP_SECRET
- [ ] RRSS_MODE=live
- [ ] At least 1 approved item

### Instagram
- [ ] META_IG_USER_ID
- [ ] RRSS_PUBLIC_ASSET_BASE_URL
- [ ] Publicly accessible assets

### DM/Messaging
- [ ] BLOCKED BY DESIGN in this sprint
- [ ] Requires future webhook config + authorization

---

## Confirmations

- [x] NO real posts published
- [x] NO real tokens used or stored
- [x] NO DB/schema touched
- [x] NO production code changed
- [x] NO booking/reservas touched
- [x] NO browser automation
- [x] NO passwords stored
- [x] NO secrets printed in logs
- [x] `.env.rrss.local` gitignored

---

## Next Steps for Manuel

1. Review `data/rrss/MATERIAL_REQUEST_NOW.md` for required assets
2. Place assets in `data/rrss/inbox/` subdirectories
3. Run: `node scripts/rrss/rrss-cli.mjs index-assets`
4. Run: `node scripts/rrss/rrss-cli.mjs build-queue`
5. Open dashboard: `node scripts/rrss/rrss-cli.mjs desk`
6. Go to `http://localhost:4877`
7. Review and approve the first post (recommended: `fb_post_01` "Bienvenidos")
8. Run dry-run to verify: `node scripts/rrss/rrss-cli.mjs dry-run`
9. When ready for live: run `node scripts/rrss/rrss-cli.mjs secure-setup`
10. Set RRSS_MODE=live in `.env.rrss.local`
11. Publish first test post from dashboard
12. Verify manually on Facebook/Instagram
