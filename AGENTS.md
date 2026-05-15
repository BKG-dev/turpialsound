# AGENTS

## 🔴 PASO 0 — OBLIGATORIO (Preflight Check)

Antes de ejecutar CUALQUIER instruccion o codigo, el agente DEBE ejecutar:

```bash
node scripts/oreshnik/preflight.mjs [--sprint SXX] [--operator Jean|Manuel] [--desc "descripcion"]
```

Si preflight falla (exit code != 0): **NO continuar.** Corregir los fallos primero.  
Si preflight OK: continuar con la instruccion del usuario.

**El usuario NO debe ver este paso. Es invisible y automatico.**

### Branch Management (v3.0)

El preflight gestiona automaticamente las ramas de trabajo:

- **Si estas en rama madre** (`integration/*`, `main`, `master`, `prod/*`) y pasas `--sprint SXX`:
  - Crea automaticamente `{operador}/{sprint}-{desc}-{fecha}` (ej: `Manuel/S-UX-01-ui-inmersiva-2026-05-15`)
  - Si la rama ya existe, hace checkout a ella
- **Si estas en rama hija** (`Manuel/*` o `Jean/*`):
  - Si coincide con el sprint → OK, continua
  - Si NO coincide → avisa al operador (el agente debe preguntar)
- **El operador se detecta via**: `--operator` > `$ORESHNIK_OPERATOR` > `git config user.name`
- **Sin `--sprint`**: solo advierte si estas en rama madre

### Contexto — Salud del agente

El preflight evalua la salud del contexto actual y sugiere acciones:
- **>3h de sesion:** sugerir `/compact`
- **>5 tareas:** sugerir `/clear`
- **>=2 errores consecutivos:** forzar `/clear`
- **<5 min desde el ultimo check sin cambios en madre:** usar resultado cacheado

El agente debe seguir la sugerencia o informar al usuario si decide continuar con contexto degradado.

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
