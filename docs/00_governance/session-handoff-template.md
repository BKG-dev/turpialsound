# Template de handoff de sesión

Usar antes de cerrar una sesión o compactar el contexto.
**Regla:** commit + push antes de compactar. Nunca compactar sin push limpio.

---

## session-summary-active.md

```md
# Session Summary — [fecha]

- Objetivo de la sesión:
- Decisiones cerradas:
- Archivos modificados:
- Problemas pendientes:
- Estado del build: [limpio / errores]
- Estado del QA: [ok / pendiente]
- Riesgos abiertos:
```

---

## next-window-brief.md

```md
# Next Window Brief — [fecha]

- Siguiente meta:
- Abrir primero:
- No reabrir:
- Validar al inicio:
- Primer prompt sugerido:
```

---

## QA checklist de sesión (antes de push)

**Técnica**
- [ ] `npx tsc --noEmit` — sin errores
- [ ] lint sin warnings nuevos
- [ ] build local sin error
- [ ] rutas sin 404
- [ ] metadata por página nueva
- [ ] imágenes/video con src correcto

**Visual (revisar en browser)**
- [ ] desktop · laptop · mobile
- [ ] contraste legible
- [ ] jerarquía visual correcta
- [ ] consistencia con resto del sistema

**Editorial**
- [ ] headline con valor real (no relleno)
- [ ] tono consistente con `tone-of-voice.md`
- [ ] CTA coherente con la página

---

## Test points completos por área → `docs/06_delivery/qa-checklist.md`
