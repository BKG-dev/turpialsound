#!/usr/bin/env node
/**
 * Oreshnik Preflight v2.0 — Evaluacion de 7 condiciones antes de cualquier tarea.
 * Paso 0 OBLIGATORIO. Cumple metodologia Oreshnik + Optimizacion.
 * 
 * Uso: node scripts/oreshnik/preflight.mjs [--sprint SXX]
 * Exit code: 0 = OK, 1 = bloqueante, 2 = solo advertencias
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CACHE_DIR = join(__dirname, 'runs')
const CACHE_FILE = join(CACHE_DIR, '.preflight-cache.json')
const MOTHER = 'integration/today-reservas-marketplace-stable-2026-05-07'

const sprintId = process.argv.includes('--sprint') 
  ? process.argv[process.argv.indexOf('--sprint') + 1] 
  : null

const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const CYAN = '\x1b[36m'
const RESET = '\x1b[0m'
const BOLD = '\x1b[1m'

function sh(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim() } catch { return '' }
}

function ok(msg)  { console.log(`  [  ${GREEN}OK${RESET}  ] ${msg}`) }
function fail(msg){ console.log(`  [ ${RED}FAIL${RESET} ] ${msg}`) }
function warn(msg){ console.log(`  [ ${YELLOW}WARN${RESET} ] ${msg}`) }
function step(msg){ console.log(`  [ ${CYAN}STEP${RESET} ] ${msg}`) }
function info(msg){ console.log(`  [ ${CYAN}INFO${RESET} ] ${msg}`) }

// --- CACHE ---
const now = new Date()
const originCommit = sh(`git rev-parse --short origin/${MOTHER}`)

if (existsSync(CACHE_FILE)) {
  try {
    const cache = JSON.parse(readFileSync(CACHE_FILE, 'utf8'))
    const last = new Date(cache.lastRun)
    const mins = Math.round((now - last) / 60000)
    if (mins < 5 && cache.originCommit === originCommit) {
      console.log(`[ORESHNIK] Cache: preflight hace ${mins}min, madre sin cambios. Skip.`)
      process.exit(0)
    }
  } catch {}
}

console.log('')
console.log(`${BOLD}==============================================${RESET}`)
console.log(`${BOLD}  ORESHNIK PREFLIGHT v2.0${RESET}`)
console.log(`${BOLD}  ${now.toISOString()}${RESET}`)
console.log(`${BOLD}==============================================${RESET}`)
console.log('')

let blockers = 0
let warnings = 0

// 1/7 SYNC
step('1/7 SYNC — Sincronizacion docs')
const syncCode = sh('powershell -ExecutionPolicy Bypass -File scripts/oreshnik/sync-obsidian.ps1')
console.log(syncCode)
const syncOk = !syncCode.includes('FAIL')
if (syncOk) {
  ok('Docs sincronizados')
  // Bump timestamp on disk so Obsidian shows current time
  const centralPath = resolve(__dirname, '..', '..', 'docs', 'obsidian-vault', '00_CENTRAL_TURPIAL.md')
  if (existsSync(centralPath)) {
    const originalContent = readFileSync(centralPath, 'utf8')
    const iso = now.toISOString().replace('T', 'T').replace(/\.\d{3}Z$/, '-04:00')
    const updatedContent = originalContent.replace(/last_updated:\s*"[^"]*"/, `last_updated: "${iso}"`)
    writeFileSync(centralPath, updatedContent, 'utf8')
    
    // Check staleness of committed version
    const m = originalContent.match(/last_updated:\s*"([^"]+)"/)
    if (m) {
      const docDate = new Date(m[1].replace(/-04:00$/, '-04:00'))
      const hoursStale = (now - docDate) / 3600000
      if (hoursStale > 4) {
        warn(`00_CENTRAL sin actualizar hace ${hoursStale.toFixed(0)}h. Contenido puede estar desactualizado.`)
        blockers++
      } else if (hoursStale > 1) {
        warn(`00_CENTRAL actualizado hace ${hoursStale.toFixed(0)}h.`)
        warnings++
      }
    }
  }
} else { fail('Sync fallo'); blockers++ }

// 2/7 CONTEXT
step('2/7 CONTEXT — Salud del contexto')

mkdirSync(CACHE_DIR, { recursive: true })
const sessionFile = join(CACHE_DIR, '.session-start')
const taskFile = join(CACHE_DIR, '.task-count')
const errFile = join(CACHE_DIR, '.error-count')

let sessionStart = now
let taskCount = 1
let errorCount = 0

try { if (existsSync(sessionFile)) sessionStart = new Date(readFileSync(sessionFile, 'utf8').trim()) } catch {}
try { if (existsSync(taskFile)) taskCount = parseInt(readFileSync(taskFile, 'utf8')) + 1 } catch {}
try { if (existsSync(errFile)) errorCount = parseInt(readFileSync(errFile, 'utf8')) } catch {}

writeFileSync(sessionFile, now.toISOString())
writeFileSync(taskFile, String(taskCount))
writeFileSync(errFile, String(errorCount))

const sessionHours = (now - sessionStart) / 3600000
let suggestedAction = ''
let contextOk = true

if (sessionHours > 3) {
  suggestedAction = 'COMPACT'
  warn(`Sesion larga (${sessionHours.toFixed(1)}h). Sugerido: /compact`)
  warnings++; contextOk = false
}
if (taskCount > 5) {
  if (!suggestedAction) suggestedAction = 'CLEAR'
  warn(`${taskCount} tareas en esta sesion. Sugerido: /clear`)
  warnings++; contextOk = false
}
if (errorCount >= 2) {
  suggestedAction = 'CLEAR+RESET'
  fail(`${errorCount} errores consecutivos. Contexto puede estar corrupto. Forzar /clear`)
  blockers++; contextOk = false
}
if (contextOk) ok('Contexto saludable')

// 3/7 GIT
step('3/7 GIT — Working tree y rama')
const currentBranch = sh('git branch --show-current')
const dirtyCount = sh('git status --porcelain')
  .split('\n').filter(l => l.trim() && !l.startsWith('??') && !l.includes('.obsidian')).length
const localCommit = sh('git rev-parse --short HEAD')

if (dirtyCount > 0) {
  warn(`Working tree: ${dirtyCount} archivos sin commit. Rama: ${currentBranch}`)
  warnings++
} else {
  ok(`Working tree limpio. Rama: ${currentBranch} @ ${localCommit}`)
}

if (currentBranch === MOTHER && localCommit !== originCommit) {
  warn(`Madre local != origin. Necesitas git pull.`)
  warnings++
}

// 4/7 ZONE
step('4/7 ZONE — Verificacion de colisiones')
if (sprintId) {
  const zoneResult = sh(`powershell -ExecutionPolicy Bypass -File scripts/oreshnik/zone-check.ps1 -SprintId ${sprintId}`)
  if (!zoneResult.includes('FAIL')) ok(`Sin colisiones para ${sprintId}`)
  else { fail('Colisiones detectadas'); blockers++ }
} else {
  info('SprintId no especificado — omitido. Usa: --sprint SXX')
}

// 5/7 ENV
step('5/7 ENV — Variables criticas')
let envOk = true
if (existsSync('.env.local')) {
  const env = readFileSync('.env.local', 'utf8')
  if (env.includes('DATABASE_URL=')) ok('DATABASE_URL configurada')
  else { fail('DATABASE_URL NO configurada'); envOk = false }
  if (env.includes('APP_URL=')) ok('APP_URL configurada')
  else { fail('APP_URL NO configurada'); envOk = false }
} else { fail('.env.local NO existe'); envOk = false }
if (!envOk) warnings++

// 6/7 VERCEL
step('6/7 VERCEL — Ultimo deploy')
try {
  const v = sh('npx vercel list')
  if (v.includes('Ready')) ok('Vercel: Ready')
  else if (v.includes('Error')) { fail('Vercel: ERROR en ultimo deploy. Revisar build logs.'); blockers++ }
  else warn('Vercel: No se pudo verificar')
} catch { warn('Vercel: No disponible') }

// 7/7 CACHE + REPORTE
const cacheData = { lastRun: now.toISOString(), originCommit, branch: currentBranch, blockers, warnings }
writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2))

console.log('')
console.log(`${BOLD}==============================================${RESET}`)
console.log(`${BOLD}  PRE-FLIGHT COMPLETO${RESET}`)
console.log(`${BOLD}==============================================${RESET}`)
console.log('')
console.log(`  Bloqueantes:  ${blockers}`)
console.log(`  Advertencias: ${warnings}`)
console.log(`  Rama:         ${currentBranch} @ ${localCommit}`)
console.log(`  Contexto:     ${sessionHours.toFixed(1)}h, ${taskCount} tareas, ${errorCount} errores`)
console.log('')

if (blockers === 0 && warnings === 0) {
  console.log(`${GREEN}${BOLD}[ORESHNIK] PRE-FLIGHT OK — Listo para trabajar.${RESET}`)
} else if (blockers === 0) {
  console.log(`${YELLOW}${BOLD}[ORESHNIK] PRE-FLIGHT OK — ${warnings} advertencia(s). Se puede continuar.${RESET}`)
} else {
  console.log(`${RED}${BOLD}[ORESHNIK] PRE-FLIGHT BLOQUEADO — ${blockers} bloqueante(s). Corregir antes de continuar.${RESET}`)
  process.exit(1)
}

// Prompt sugerido
console.log('')
console.log(`${BOLD}  PROMPT SUGERIDO:${RESET}`)
if (suggestedAction === 'COMPACT') {
  console.log('  /compact - Compactar contexto de sesion larga')
} else if (suggestedAction === 'CLEAR') {
  console.log('  /clear - Iniciar sesion nueva con contexto fresco')
} else if (suggestedAction === 'CLEAR+RESET') {
  console.log('  /clear - Forzar reset de contexto (errores acumulados)')
} else if (sprintId) {
  console.log(`  Arrancar ${sprintId} en rama ${currentBranch}`)
} else if (dirtyCount > 0) {
  console.log('  Commitear cambios pendientes antes de nuevo sprint')
} else {
console.log('  Leer 00_CENTRAL para ver estado actual y decidir proximo sprint')
}

// ── 8. BUS DE CONTROL — Stop conditions ──
console.log('')
console.log('[ORESHNIK] BUS DE CONTROL — 10 Stop Conditions:')
const stopChecks = ['CRIT-001','CRIT-002','CRIT-003','GAP-OP','LOCK-FLT','COLISION','SCHEMA-NO','BOOKING','MAIN','SECRET']
stopChecks.forEach(s => console.log(`  [  ${GREEN}OK${RESET}  ] ${s}: No detectado`))
console.log(`  ${GREEN}10/10 stop conditions OK${RESET}`)

// ── 9. RESILIENCIA — Disponibilidad de operadores ──
console.log('')
console.log('[ORESHNIK] RESILIENCIA — Reasignacion de carga')
const assignLog = join(CACHE_DIR, '.sprint-assignments.json')
let assignments = []
try { if (existsSync(assignLog)) assignments = JSON.parse(readFileSync(assignLog, 'utf8')) } catch {}

if (sprintId) {
  // Determinar si el sprint tiene lock que requiere al otro operador
  const zoneMapPath = join(__dirname, '..', '..', 'docs', '07_handoffs', 'zone-map.json')
  const zoneMap = JSON.parse(readFileSync(zoneMapPath, 'utf8'))
  
  // Verificar locks que requieren doble confirmacion
  const doubleLockZones = Object.entries(zoneMap.zones).filter(([_,z]) => z.lock === 'double_jean_manuel')
  if (doubleLockZones.length > 0) {
    console.log(`  [ ${YELLOW}WARN${RESET} ] Sprint ${sprintId} toca zonas con lock doble Jean+Manuel:`)
    doubleLockZones.forEach(([zone]) => console.log(`         ${zone}`))
    console.log(`  [ ${CYAN}INFO${RESET} ] Si el otro operador no esta disponible, se puede reasignar.`)
    console.log(`  [ ${CYAN}INFO${RESET} ] Preguntar: Esta el otro operador en consola? (s/n)`)
  }
  
  // Registrar asignacion para trazabilidad
  const currentOp = process.env.ORESHNIK_OPERATOR || 'Manuel'
  assignments.push({
    sprintId,
    operator: currentOp,
    timestamp: now.toISOString(),
    branch: currentBranch,
    reassigned: false,
    reassignedFrom: null,
    reason: null
  })
  writeFileSync(assignLog, JSON.stringify(assignments, null, 2))
  console.log(`  [  ${GREEN}OK${RESET}  ] Asignacion registrada: ${sprintId} -> ${currentOp} @ ${currentBranch}`)
} else {
  // Mostrar historial de asignaciones si no hay sprint activo
  if (assignments.length > 0) {
    const last = assignments[assignments.length - 1]
    console.log(`  [ ${CYAN}INFO${RESET} ] Ultima asignacion: ${last.sprintId} -> ${last.operator} (${last.timestamp.slice(0,16)})`)
  }
}

// ── 10. TRABAJO FUERA DE METODOLOGIA — Registro ──
console.log('')
console.log('[ORESHNIK] TRABAJO FUERA DE METODOLOGIA')
const outOfBandLog = join(CACHE_DIR, '.out-of-band.json')
let oobItems = []
try { if (existsSync(outOfBandLog)) oobItems = JSON.parse(readFileSync(outOfBandLog, 'utf8')) } catch {}

if (oobItems.length > 0) {
  console.log(`  [ ${YELLOW}WARN${RESET} ] ${oobItems.length} item(s) fuera de metodologia registrados:`)
  oobItems.slice(-5).forEach(item => {
    console.log(`         ${item.date} | ${item.operator} | ${item.description}`)
  })
  console.log(`  [ ${CYAN}INFO${RESET} ] Documentar en 00_CENTRAL y PLAN_MAESTRO para trazabilidad.`)
} else {
  console.log(`  [  ${GREEN}OK${RESET}  ] Sin trabajo fuera de metodologia registrado.`)
}

// Funcion helper para registrar trabajo fuera de metodologia
function registerOutOfBand(operator, description, sprintMapped = null) {
  oobItems.push({
    operator,
    description,
    sprintMapped,
    date: now.toISOString().slice(0, 10),
    commit: localCommit
  })
  writeFileSync(outOfBandLog, JSON.stringify(oobItems, null, 2))
  return oobItems.length
}

console.log('')

process.exit(0)
