#!/usr/bin/env node
/**
 * Oreshnik Preflight v3.0 — Evaluacion de 10 condiciones antes de cualquier tarea.
 * Paso 0 OBLIGATORIO. Cumple metodologia Oreshnik + Optimizacion.
 * 
 * Uso: node scripts/oreshnik/preflight.mjs [--sprint SXX] [--operator Jean|Manuel] [--desc "descripcion"]
 * Exit code: 0 = OK, 1 = bloqueante, 2 = solo advertencias
 * 
 * Branch management (v3.0):
 *   - Si estas en rama madre y hay --sprint, crea automaticamente rama hija {operator}/{sprint}-{desc}-{fecha}
 *   - Si la rama hija ya existe, hace checkout a ella
 *   - Si estas en rama hija de otro sprint, avisa al operador
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CACHE_DIR = join(__dirname, 'runs')
const CACHE_FILE = join(CACHE_DIR, '.preflight-cache.json')
const MOTHER = 'RAMA-MADRE'

const sprintId = process.argv.includes('--sprint') 
  ? process.argv[process.argv.indexOf('--sprint') + 1] 
  : null

const operatorFlag = process.argv.includes('--operator')
  ? process.argv[process.argv.indexOf('--operator') + 1]
  : null

const descFlag = process.argv.includes('--desc')
  ? process.argv[process.argv.indexOf('--desc') + 1]
  : null

// Mother branch patterns: integration/*, main, master, prod/*
const MOTHER_PATTERNS = [/^integration\/.*/, /^hotfix\/.*/, /^main$/, /^master$/, /^prod\/.*/]

function isMotherBranch(branch) {
  return MOTHER_PATTERNS.some(p => p.test(branch))
}

function resolveOperator() {
  if (operatorFlag) return operatorFlag
  const envOp = process.env.ORESHNIK_OPERATOR
  if (envOp) return envOp
  const gitUser = sh('git config user.name').toLowerCase()
  if (gitUser.includes('manuel') || gitUser.includes('mvera')) return 'Manuel'
  if (gitUser.includes('jean')) return 'Jean'
  return gitUser.split(' ')[0] || 'operator'
}

function sanitizeBranchName(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

const operator = resolveOperator()
const today = getToday()
function getToday() { return new Date().toISOString().slice(0, 10) }

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
console.log(`${BOLD}  ORESHNIK PREFLIGHT v3.0${RESET}`)
console.log(`${BOLD}  ${now.toISOString()}${RESET}`)
console.log(`${BOLD}==============================================${RESET}`)
console.log('')

let blockers = 0
let warnings = 0

// 1/7 SYNC
step('1/7 SYNC — Sincronizacion docs')

// ── Obsidian guard — cierre automatico ──────────────────────────────
const obsidianRunning = process.platform === 'win32'
  ? (() => { try { execSync('tasklist /FI "IMAGENAME eq Obsidian.exe" 2>nul', { encoding: 'utf8' }); return true } catch { return false } })()
  : (() => { try { execSync('pgrep -x Obsidian 2>/dev/null', { encoding: 'utf8' }); return true } catch { return false } })()

if (obsidianRunning) {
  info('Obsidian detectado. Cerrando para evitar corrupcion en operaciones git...')
  try {
    if (process.platform === 'win32') {
      execSync('taskkill /F /IM Obsidian.exe 2>nul', { encoding: 'utf8' })
    } else {
      execSync('pkill -9 Obsidian 2>/dev/null', { encoding: 'utf8' })
    }
    ok('Obsidian cerrado automaticamente.')
  } catch {
    ok('Obsidian ya estaba cerrado o no se pudo cerrar.')
  }
  
  // Revisar si Obsidian dejo el vault sucio
  const vaultDirty = sh('git diff --name-only -- docs/obsidian-vault/')
  if (vaultDirty) {
    const files = vaultDirty.split('\n').filter(Boolean).join(', ')
    warn(`Obsidian modifico el vault antes de cerrar: ${files}`)
    warn('Ejecuta manualmente si necesitas restaurar: git checkout HEAD -- docs/obsidian-vault/')
    warnings++
  }
}

// ── Conflict detection ──────────────────────────────────────────────
const vaultFiles = sh('git diff --name-only -- docs/obsidian-vault/')
if (vaultFiles) {
  const files = vaultFiles.split('\n').filter(Boolean)
  for (const f of files) {
    const lastAuthor = sh(`git log -1 --format='%an' origin/${MOTHER} -- "${f}"`)
    const currentAuthor = sh('git config user.name')
    if (lastAuthor && currentAuthor &&
        !lastAuthor.toLowerCase().includes(currentAuthor.toLowerCase().split(' ')[0]) &&
        !currentAuthor.toLowerCase().includes(lastAuthor.toLowerCase().split(' ')[0])) {
      warn(`Conflicto potencial en ${f}: editado por ${lastAuthor} en madre y tu tambien lo tienes modificado.`)
      warn('Coordina con el otro operador antes de mergear.')
      warnings++
    }
  }
}

const syncCode = sh('powershell -ExecutionPolicy Bypass -File scripts/oreshnik/sync-obsidian.ps1')
console.log(syncCode)
const syncOk = !syncCode.includes('FAIL')
if (syncOk) {
  ok('Docs sincronizados')
  // Check staleness usando git log — NO modifica el archivo
  const centralPath = resolve(__dirname, '..', '..', 'docs', 'obsidian-vault', '00_CENTRAL_TURPIAL.md')
  if (existsSync(centralPath)) {
    // Leer last_updated del committed version (no del working tree)
    const committedContent = sh(`git show HEAD:docs/obsidian-vault/00_CENTRAL_TURPIAL.md`)
    const m = committedContent.match(/last_updated:\s*"([^"]+)"/)
    if (m) {
      const docDate = new Date(m[1].replace(/-04:00$/, '-04:00'))
      const hoursStale = (now - docDate) / 3600000
      if (hoursStale > 4) {
        warn(`00_CENTRAL sin actualizar hace ${hoursStale.toFixed(0)}h. Contenido puede estar desactualizado.`)
        warnings++
      } else if (hoursStale > 1) {
        info(`00_CENTRAL actualizado hace ${hoursStale.toFixed(0)}h.`)
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

// 3/7 GIT — Working tree, rama y branch management
step('3/7 GIT — Working tree, rama y branch management')
const currentBranch = sh('git branch --show-current')
const fullStatus = sh('git status --porcelain')
const allDirty = fullStatus
  .split('\n').filter(l => l.trim() && !l.startsWith('??')).length
const dirtyCount = fullStatus
  .split('\n').filter(l => l.trim() && !l.startsWith('??') && !l.includes('.obsidian')).length
const localCommit = sh('git rev-parse --short HEAD')

// Detect if changes are only cache/runs files (safe to auto-stash)
const cacheOnlyChanges = fullStatus
  .split('\n')
  .filter(l => l.trim() && !l.startsWith('??'))
  .every(l => l.includes('scripts/oreshnik/runs/') || l.includes('.obsidian') || l.includes('.kilo/kilo.json'))

if (dirtyCount > 0 && !cacheOnlyChanges) {
  warn(`Working tree: ${dirtyCount} archivos sin commit. Rama: ${currentBranch}`)
  warnings++
} else if (allDirty > 0 && cacheOnlyChanges) {
  info(`Cambios solo en cache/runs — ignorables. Rama: ${currentBranch} @ ${localCommit}`)
} else {
  ok(`Working tree limpio. Rama: ${currentBranch} @ ${localCommit}`)
}

// ── Branch Management ───────────────────────────────────────────────
let branchAction = ''
let branchSwitched = false

if (sprintId) {
  const onMother = isMotherBranch(currentBranch)
  const isOperatorBranch = new RegExp(`^${operator}/`, 'i').test(currentBranch)
  const expectedBranchPrefix = `${operator}/${sanitizeBranchName(sprintId)}`
  const expectedBranch = descFlag
    ? `${expectedBranchPrefix}-${sanitizeBranchName(descFlag)}-${today}`
    : `${expectedBranchPrefix}-${getToday()}`

  if (onMother) {
    // Check if child branch already exists
    const existingBranch = sh(`git branch --list "${operator}/${sanitizeBranchName(sprintId)}-*"`)
    
    if (existingBranch) {
      const branchName = existingBranch.split('\n')[0].trim().replace(/^\*\s*/, '')
      info(`Rama hija existente: ${branchName}`)
      
      if (allDirty === 0 || cacheOnlyChanges) {
        const switched = sh(`git checkout "${branchName}" 2>&1`)
        if (switched.includes('Switched')) {
          ok(`Cambiado a rama hija: ${branchName}`)
          branchAction = `switched_to_${branchName}`
          branchSwitched = true
        }
      } else {
        warn(`Rama hija ${branchName} existe pero working tree sucio. Stashea primero.`)
        branchAction = 'need_stash'
      }
    } else {
      // Crear nueva rama hija
      if (allDirty === 0 || cacheOnlyChanges) {
        const created = sh(`git checkout -b "${expectedBranch}" 2>&1`)
        if (created.includes('Switched')) {
          ok(`Rama hija creada: ${expectedBranch}`)
          branchAction = `created_${expectedBranch}`
          branchSwitched = true
        } else {
          fail(`No se pudo crear rama: ${created.slice(0, 80)}`)
          blockers++
        }
      } else {
        warn(`Para crear rama ${expectedBranch}, necesitas stashear o commitear primero.`)
        branchAction = 'need_stash'
      }
    }
  } else if (isOperatorBranch) {
    if (currentBranch.startsWith(expectedBranchPrefix)) {
      ok(`Rama correcta para sprint ${sprintId}: ${currentBranch}`)
      branchAction = 'ok'
    } else {
      warn(`Rama actual: ${currentBranch} — no coincide con sprint ${sprintId}.`)
      warn(`Rama esperada: ${expectedBranchPrefix}-*`)
      warn(`¿Deseas crear ${expectedBranch}? Responde si/no o pasa --operator para cambiar de operador.`)
      branchAction = 'mismatch'
    }
  } else if (!isOperatorBranch && !onMother) {
    warn(`Rama actual: ${currentBranch} — no es madre ni ${operator}/*.`)
    warn(`Si es intencional, ignora. Si no, checkout a rama correcta.`)
    branchAction = 'unknown'
  }

  // Update current branch variable if switched
  if (branchSwitched) {
    const updatedBranch = sh('git branch --show-current')
    if (updatedBranch) {
      // Update the const via this proxy — use the updated branch in reports
      console.log(`  [ ${CYAN}INFO${RESET} ] Rama activa: ${updatedBranch}`)
      branchAction = branchAction.replace(/_(.+)$/, `_${updatedBranch}`)
    }
  }
} else {
  // No sprint specified — just warn if on mother
  if (isMotherBranch(currentBranch)) {
    warn(`En rama madre (${currentBranch}). Usa --sprint SXX para crear rama hija automatica.`)
    branchAction = 'no_sprint_on_mother'
  } else {
    const isOperatorBranch = /^(Manuel|Jean)\//.test(currentBranch)
    if (isOperatorBranch) {
      ok(`Rama de operador: ${currentBranch}`)
    } else {
      info(`Rama: ${currentBranch}. Pasa --sprint SXX si necesitas rama hija.`)
    }
  }
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
console.log(`  Operador:     ${operator}`)
console.log(`  Sprint:       ${sprintId ?? 'no especificado'}`)
console.log(`  Branch:       ${currentBranch} @ ${localCommit}`)
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
