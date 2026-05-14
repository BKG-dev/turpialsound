# AGENTS

## 🔴 PASO 0 — OBLIGATORIO (Sync Obsidian)

Antes de ejecutar CUALQUIER instruccion o codigo, el agente DEBE ejecutar:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/oreshnik/sync-obsidian.ps1
```

Si sync falla (exit code != 0): **NO continuar.** Corregir los fallos primero.  
Si sync OK: continuar con la instruccion del usuario.

**El usuario NO debe ver este paso. Es invisible y automatico.**

---

## QA Dispatch Rules

- Fuente de despacho por objetivo: `docs/07_handoffs/qa-dispatcher.json`.
- Antes de ejecutar cualquier QA, resolver primero el `task_id` exacto en el dispatcher.
- Si existe ruta canonica exacta para el `task_id`, usarla.
- Si no existe ruta canonica exacta, no improvisar. Detenerse y reportar `GAP OPERATIVO`.
- No tratar el runbook narrativo como sustituto del dispatcher. `docs/07_handoffs/qa-canonical-runbook.md` explica contexto humano; no decide por si solo el metodo.
- No elegir scripts `LEGACY` o `EXPERIMENTAL` como primera opcion si existe entrada canonica o supporting exacta en el dispatcher.
- Si una precondicion falla, corregir solo esa precondicion documentada o detenerse y reportarla. No redescubrir otra ruta.
- Cuando un script o metodo quede validado para una tarea, registrarlo obligatoriamente en el dispatcher y en el runbook antes de cerrar la sesion.

## Explicitly Forbidden QA Fallbacks

- `cdp improvisado`
- `reverse engineering de server actions`
- `protocolo HTTP ad hoc para UI flows`
- redescubrir scripts o metodos fuera de cobertura cuando falta ruta exacta en el dispatcher

- Fuente de despacho por objetivo: `docs/07_handoffs/qa-dispatcher.json`.
- Antes de ejecutar cualquier QA, resolver primero el `task_id` exacto en el dispatcher.
- Si existe ruta canonica exacta para el `task_id`, usarla.
- Si no existe ruta canonica exacta, no improvisar. Detenerse y reportar `GAP OPERATIVO`.
- No tratar el runbook narrativo como sustituto del dispatcher. `docs/07_handoffs/qa-canonical-runbook.md` explica contexto humano; no decide por si solo el metodo.
- No elegir scripts `LEGACY` o `EXPERIMENTAL` como primera opcion si existe entrada canonica o supporting exacta en el dispatcher.
- Si una precondicion falla, corregir solo esa precondicion documentada o detenerse y reportarla. No redescubrir otra ruta.
- Cuando un script o metodo quede validado para una tarea, registrarlo obligatoriamente en el dispatcher y en el runbook antes de cerrar la sesion.

## Explicitly Forbidden QA Fallbacks

- `cdp improvisado`
- `reverse engineering de server actions`
- `protocolo HTTP ad hoc para UI flows`
- redescubrir scripts o metodos fuera de cobertura cuando falta ruta exacta en el dispatcher
