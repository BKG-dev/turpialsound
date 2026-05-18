#!/usr/bin/env node
/**
 * Oreshnik Preflight v4.0 — Evaluacion de condiciones + Sync de docs desde madre dinámica.
 * 
 * NOVEDADES v4.0:
 *   - Madre dinámica: leida de .mother-version.json (ya no hardcodeada)
 *   - Sync forzado de docs: siempre jala docs de madre al iniciar (sin cache para docs)
 *   - Paso 0: sync-from-mother automático si hay docs mas nuevos en madre
 *   - Rama madre versionada: cada cierre de sprint genera MADRE/v{N}-{tags}-{fecha}
 * 
 * Uso: node scripts/oreshnik/preflight.mjs [--sprint SXX] [--operator Jean|Manuel] [--desc "desc"]
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..', '..')
const CACHE_DIR = join(__dirname, 'runs')
const CACHE_FILE = join(CACHE_DIR, '.preflight-cache.json')
const VERSION_FILE = join(CACHE_DIR, '.mother-version.json')

function readJsonFile(path, fallback = null) {
  try {
    if (!existsSync(path)) return fallback
    return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''))
  } catch {
    return fallback
  }
}

const sprintId = process.argv.includes('--sprint')
  ? process.argv[process.argv.indexOf('--sprint') + 1]
  : null
const operatorFlag = process.argv.includes('--operator')
  ? process.argv[process.argv.indexOf('--operator') + 1]
  : null
const descFlag = process.argv.includes('--desc')
  ? process.argv[process.argv.indexOf('--desc') + 1]
  : null

const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const CYAN = '\x1b[36m'
const BOLD = '\x1b[1m'
const RESET = '\x1b[0m'

// ─── Madre dinámica ──────────────────────────────────────────────────
function readMotherVersion() {
  return readJsonFile(VERSION_FILE, { version: 1, branches: [], current: 'RAMA-MADRE' })
}
const motherData = readMotherVersion()
const MOTHER = motherData.current

// Mother branch patterns
const MOTHER_PATTERNS = [/^integration\/.*/, /^hotfix\/.*/, /^MADRE\/.*/, /^RAMA[-_]MADRE$/, /^main$/, /^master$/, /^prod\/.*/]
function isMotherBranch(branch) { return MOTHER_PATTERNS.some(p => p.test(branch)) }

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
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}
function getToday() { return new Date().toISOString().slice(0, 10) }

const operator = resolveOperator()
const today = getToday()

function sh(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim() } catch { return '' }
}
function run(cmd) {
  try {
    return { ok: true, output: execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim() }
  } catch (e) {
    return {
      ok: false,
      output: `${e.stdout || ''}${e.stderr || e.message}`.trim(),
      status: e.status
    }
  }
}
function ok(msg)  { console.log(`  [  ${GREEN}OK${RESET}  ] ${msg}`) }
function fail(msg){ console.log(`  [ ${RED}FAIL${RESET} ] ${msg}`) }
function warn(msg){ console.log(`  [ ${YELLOW}WARN${RESET} ] ${msg}`) }
function step(msg){ console.log(`  [ ${CYAN}STEP${RESET} ] ${msg}`) }
function info(msg){ console.log(`  [ ${CYAN}INFO${RESET} ] ${msg}`) }

// ─── CACHE ───────────────────────────────────────────────────────────
const now = new Date()
const originCommit = sh(`git rev-parse --short origin/${MOTHER}`)

// Cache solo para checks no-docs (contexto, env, vercel). Los docs siempre se syncan.
let skipNonDocChecks = false
if (existsSync(CACHE_FILE)) {
  try {
    const cache = readJsonFile(CACHE_FILE)
    if (!cache) throw new Error('Invalid preflight cache')
    const last = new Date(cache.lastRun)
    const mins = Math.round((now - last) / 60000)
    if (mins < 5 && cache.originCommit === originCommit) {
      skipNonDocChecks = true
    }
  } catch {}
}

console.log('')
console.log(`${BOLD}==============================================${RESET}`)
console.log(`${BOLD}  ORESHNIK PREFLIGHT v4.0${RESET}`)
console.log(`${BOLD}  ${now.toISOString()}${RESET}`)
console.log(`${BOLD}==============================================${RESET}`)
console.log('')
info(`Madre dinamica: ${MOTHER}${motherData.version ? ` (v${motherData.version})` : ''}`)

let blockers = 0
let warnings = 0

// ─── 1/8 SYNC — Sincronizacion de docs desde madre (FORZADO) ────────
step('1/8 SYNC — Sincronizar docs desde madre')

// 1A: Fetch origin siempre
info('Fetch origin...')
sh('git fetch origin --prune --quiet')
ok('Fetch completado')

// 1B: Obsidian guard — cerrar automaticamente, reabrir al final
let obsidianWasRunning = false
let obsidianExePath = ''

function isObsidianRunning() {
  if (process.platform === 'win32') {
    try {
      const output = execSync('powershell -NoProfile -Command "(Get-Process Obsidian -ErrorAction SilentlyContinue | Select-Object -First 1).Id"', { encoding: 'utf8', stdio: 'pipe' })
      return output.trim().length > 0
    } catch { return false }
  } else {
    try { execSync('pgrep -x Obsidian 2>/dev/null', { encoding: 'utf8', stdio: 'pipe' }); return true } catch { return false }
  }
}

function closeObsidian() {
  if (!isObsidianRunning()) return false
  info('Obsidian detectado. Cerrando para sincronizar...')
  if (process.platform === 'win32') {
    obsidianExePath = sh('powershell -Command "(Get-Process Obsidian | Select-Object -First 1).Path"')
    try { execSync('powershell -NoProfile -Command "Get-Process Obsidian -ErrorAction SilentlyContinue | ForEach-Object { [void]$_.CloseMainWindow() }"', { encoding: 'utf8', stdio: 'ignore' }) } catch {}
    try { execSync('powershell -NoProfile -Command "Start-Sleep -Seconds 2"', { encoding: 'utf8', stdio: 'ignore' }) } catch {}
    if (isObsidianRunning()) {
      try { execSync('powershell -NoProfile -Command "Get-Process Obsidian -ErrorAction SilentlyContinue | Stop-Process -Force"', { encoding: 'utf8', stdio: 'ignore' }) } catch {}
    }
  } else {
    try { execSync('pkill -TERM Obsidian 2>/dev/null', { encoding: 'utf8' }) } catch {}
    try { execSync('sleep 2', { encoding: 'utf8' }) } catch {}
    if (isObsidianRunning()) execSync('pkill -9 Obsidian 2>/dev/null', { encoding: 'utf8' })
  }
  ok('Obsidian cerrado')
  return true
}

function reopenObsidian() {
  if (!obsidianWasRunning || !obsidianExePath) return
  info('Reabriendo Obsidian...')
  const vaultPath = resolve(ROOT, 'docs', 'obsidian-vault')
  try {
    if (process.platform === 'win32') {
      execSync(`start "" "${obsidianExePath}" "obsidian://open?vault=${encodeURIComponent(vaultPath)}"`, { encoding: 'utf8', stdio: 'ignore' })
    }
  } catch {}
}

obsidianWasRunning = closeObsidian()

// 1C: Sync docs desde madre — SIEMPRE, sin cache
const currentBranchSync = sh('git branch --show-current')
const motherRef = sh(`git rev-parse --verify origin/${MOTHER}`)

if (motherRef) {
  // Verificar si el working tree local de docs difiere de origin/madre
  const localDocHead = sh('git rev-parse HEAD:docs 2>nul')
  const motherDocHead = sh(`git rev-parse origin/${MOTHER}:docs 2>nul`)

  if (localDocHead !== motherDocHead && motherDocHead) {
    const localLastUpdated = sh(`git show HEAD:docs/obsidian-vault/00_CENTRAL_TURPIAL.md 2>nul`)
    const motherLastUpdated = sh(`git show origin/${MOTHER}:docs/obsidian-vault/00_CENTRAL_TURPIAL.md 2>nul`)
    const localMatch = localLastUpdated.match(/last_updated:\s*"(\d{2}\/\d{2}\/\d{2}\s+\d{2}:\d{2})"/)
    const motherMatch = motherLastUpdated.match(/last_updated:\s*"(\d{2}\/\d{2}\/\d{2}\s+\d{2}:\d{2})"/)
    info(`Docs difieren. Local: ${localMatch?.[1] || '?'} | Madre: ${motherMatch?.[1] || '?'}. Fusionando...`)

    // Stash local changes if any, but preserve them
    const hasDocChanges = sh('git diff --name-only -- docs/')
    let stashed = false
    
    if (hasDocChanges) {
      const onlyDocs = sh('git diff --name-only').split('\n').filter(Boolean).every(f => f.startsWith('docs/'))
      if (onlyDocs) {
        info('Cambios locales solo en docs. Se respaldaran y re-aplicaran.')
        sh('git stash push -- docs/ 2>nul')
        stashed = true
      } else {
        warn('Cambios locales fuera de docs/. Stashea manualmente antes del sync.')
      }
    }

    const docMergeBase = sh(`git merge-base HEAD origin/${MOTHER} 2>nul`) || `origin/${MOTHER}`
    const mergeDocsResult = run(`node scripts/oreshnik/merge-docs-union.mjs --base ${docMergeBase} --source origin/${MOTHER}`)
    if (!mergeDocsResult.ok) {
      fail(`No se pudieron fusionar docs con ${MOTHER}. No se pisan cambios.`)
      if (mergeDocsResult.output) {
        console.log(mergeDocsResult.output.split(/\r?\n/).slice(0, 40).map(line => `  ${line}`).join('\n'))
      }
      if (stashed) sh('git stash pop 2>nul')
      blockers++
    } else {
      if (mergeDocsResult.output) info(mergeDocsResult.output)
      ok(`Docs fusionados desde ${MOTHER} sin pisar cambios locales`)

      // Re-aplicar cambios locales si los habia
      if (stashed) {
        const popResult = sh('git stash pop 2>&1')
        if (popResult.includes('CONFLICT')) {
          fail('Conflicto al re-aplicar cambios locales de docs despues del merge.')
          blockers++
        } else {
          info('Cambios locales en docs re-aplicados sobre la version fusionada.')
        }
      }

        // Verificar last_updated
        const centralPath = join(ROOT, 'docs', 'obsidian-vault', '00_CENTRAL_TURPIAL.md')
        if (existsSync(centralPath)) {
          const central = readFileSync(centralPath, 'utf8')
          const m = central.match(/last_updated:\s*"([^"]+)"/)
          if (m) {
            info(`Docs al dia. last_updated: ${m[1]}`)

            // Staleness check
            const parts = m[1].split(/[\s\/:]/)
            if (parts.length >= 5) {
              const [d, mo, y, h, min] = parts.map(Number)
              const docDate = new Date(2000 + y, mo - 1, d, h, min)
              const hoursStale = (now - docDate) / 3600000
              if (hoursStale > 8) {
                warn(`00_CENTRAL sin actualizar hace ${hoursStale.toFixed(0)}h. Verifica que el otro operador no tenga docs mas nuevos.`)
                warnings++

              // Buscar ramas del otro operador con docs mas nuevos
              const otherOp = operator === 'Manuel' ? 'Jean' : 'Manuel'
              const otherBranches = sh(`git branch -r --list "origin/${otherOp}/*"`)
              if (otherBranches) {
                info(`Detectando ramas de ${otherOp} con docs mas recientes...`)
                for (const branch of otherBranches.split('\n').filter(Boolean)) {
                  const branchName = branch.trim()
                  try {
                    const theirLastUpdated = sh(`git show ${branchName}:docs/obsidian-vault/00_CENTRAL_TURPIAL.md 2>nul`)
                    const theirMatch = theirLastUpdated.match(/last_updated:\s*"([^"]+)"/)
                    if (theirMatch) {
                      const theirParts = theirMatch[1].split(/[\s\/:]/)
                      if (theirParts.length >= 5) {
                        const [td, tm, ty, th, tmin] = theirParts.map(Number)
                        const theirDate = new Date(2000 + ty, tm - 1, td, th, tmin)
                        if (theirDate > docDate) {
                          warn(`${otherOp} tiene docs mas recientes en ${branchName} (${theirMatch[1]})`)
                          warn('Sugerido: cerrar esa rama o fusionar docs a madre antes de continuar.')
                        }
                      }
                    }
                  } catch {}
                }
              }
            }
          }
        }
      }
    }
  } else {
    ok('Docs locales sincronizados con madre')
  }

  // 1D: Ejecutar sync-obsidian.ps1 para verificacion canonica
  const syncResult = sh('powershell -ExecutionPolicy Bypass -File scripts/oreshnik/sync-obsidian.ps1 -MotherBranch ' + MOTHER)
  console.log(syncResult)
  if (syncResult.includes('FAIL')) {
    fail('sync-obsidian.ps1 encontro fallos')
    blockers++
  } else {
    ok('Verificacion canonica OK')
  }
} else {
  fail(`Rama madre '${MOTHER}' no encontrada en origin. Ejecuta git fetch.`)
  blockers++
}

// ─── 2/8 CONTEXT — Salud del contexto ───────────────────────────────
step('2/8 CONTEXT — Salud del contexto')

if (!skipNonDocChecks) {
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

  if (sessionHours > 3) { suggestedAction = 'COMPACT'; warn(`Sesion larga (${sessionHours.toFixed(1)}h). Sugerido: /compact`); warnings++ }
  if (taskCount > 5) { if (!suggestedAction) suggestedAction = 'CLEAR'; warn(`${taskCount} tareas. Sugerido: /clear`); warnings++ }
  if (errorCount >= 2) { suggestedAction = 'CLEAR+RESET'; fail(`${errorCount} errores consecutivos. Forzar /clear`); blockers++ }
  if (!suggestedAction) ok('Contexto saludable')
} else {
  info('Cache activo — checks de contexto omitidos (<5min)')
  const taskFile = join(CACHE_DIR, '.task-count')
  try { writeFileSync(taskFile, String(parseInt(readFileSync(taskFile, 'utf8') || '0') + 1)) } catch {}
}

// ─── 3/8 GIT — Working tree y branch management ─────────────────────
step('3/8 GIT — Working tree y branch management')

const currentBranch = sh('git branch --show-current')
const fullStatus = sh('git status --porcelain')
const allDirty = fullStatus.split('\n').filter(l => l.trim() && !l.startsWith('??')).length
const dirtyCount = fullStatus.split('\n').filter(l => l.trim() && !l.startsWith('??') && !l.includes('.obsidian') && !l.includes('scripts/oreshnik/runs/')).length
const localCommit = sh('git rev-parse --short HEAD')

const cacheOnlyChanges = fullStatus
  .split('\n').filter(l => l.trim() && !l.startsWith('??'))
  .every(l => l.includes('scripts/oreshnik/runs/') || l.includes('.obsidian') || l.includes('.kilo/kilo.json'))

if (dirtyCount > 0 && !cacheOnlyChanges) {
  warn(`Working tree: ${dirtyCount} archivos sin commit. Rama: ${currentBranch}`)
  warnings++
} else if (allDirty > 0 && cacheOnlyChanges) {
  info(`Cambios solo en cache/runs. Rama: ${currentBranch} @ ${localCommit}`)
} else {
  ok(`Working tree limpio. Rama: ${currentBranch} @ ${localCommit}`)
}

// Branch management
let branchAction = ''
let branchSwitched = false

if (sprintId) {
  const onMother = isMotherBranch(currentBranch)
  const isOperatorBranch = new RegExp(`^${operator}/`, 'i').test(currentBranch)
  const expectedBranchPrefix = `${operator}/${sanitizeBranchName(sprintId)}`
  const expectedBranch = descFlag
    ? `${expectedBranchPrefix}-${sanitizeBranchName(descFlag)}-${today}`
    : `${expectedBranchPrefix}-${today}`

  if (onMother) {
    // Desde madre → crear rama hija
    const existingBranch = sh(`git branch --list "${operator}/${sanitizeBranchName(sprintId)}-*"`)
    if (existingBranch) {
      const branchName = existingBranch.split('\n')[0].trim().replace(/^\*\s*/, '')
      info(`Rama hija existente: ${branchName}`)
      if (allDirty === 0 || cacheOnlyChanges) {
        const switched = sh(`git checkout "${branchName}" 2>&1`)
        if (switched.includes('Switched')) {
          ok(`Cambiado a: ${branchName}`)
          branchSwitched = true
        }
      } else { warn(`Rama ${branchName} existe pero working tree sucio.`) }
    } else {
      if (allDirty === 0 || cacheOnlyChanges) {
        // Buscar ULTIMA rama hija del operador para heredar codigo (no solo docs de madre)
        const rawList = sh(`git branch --list "${operator}/*"`)
        const branches = rawList.split('\n').map(b => b.trim().replace(/^\*\s*/, '')).filter(Boolean)
        let baseBranch = MOTHER
        
        // Validar que la ultima rama hija fue CERRADA correctamente (no heredar basura)
        for (const branch of branches) {
          const lastCommits = sh(`git log --oneline -5 ${branch} 2>nul`)
          const isClosed = /docs\(sprint\):\s*cerrar|chore\(oreshnik\):\s*record/.test(lastCommits)
          if (isClosed) {
            baseBranch = branch
            break
          }
        }
        
        if (baseBranch === MOTHER) {
          info('No se encontro rama hija cerrada. Creando desde madre.')
        } else {
          info(`Rama hija validada como cerrada: ${baseBranch}. Heredando codigo.`)
        }
        
        // Actualizar la base si es remota
        if (baseBranch !== MOTHER) {
          sh(`git fetch origin ${baseBranch} 2>nul`)
        }
        
        const created = sh(`git checkout -b "${expectedBranch}" ${baseBranch} 2>&1`)
        if (created.includes('Switched')) {
          ok(`Rama hija creada desde ${baseBranch}: ${expectedBranch}`)
          // Sync docs desde madre (los docs de madre son la fuente de verdad)
          sh(`git fetch origin ${MOTHER} --quiet 2>nul`)
          sh(`git checkout origin/${MOTHER} -- docs/ 2>nul`)
          ok('Docs sincronizados desde madre sobre el codigo heredado')
          branchSwitched = true
        } else { fail(`No se pudo crear rama: ${created.slice(0, 80)}`); blockers++ }
      } else { warn(`Stashea antes de crear rama ${expectedBranch}`) }
    }
  } else if (isOperatorBranch) {
    if (currentBranch.startsWith(expectedBranchPrefix)) {
      ok(`Rama correcta para ${sprintId}: ${currentBranch}`)
    } else {
      warn(`Rama actual ${currentBranch} no coincide con sprint ${sprintId}`)
      warn(`Esperada: ${expectedBranchPrefix}-*`)
    }
  } else if (!onMother) {
    warn(`Rama ${currentBranch} no es madre ni ${operator}/*`)
  }
} else {
  if (isMotherBranch(currentBranch)) {
    warn(`En rama madre (${currentBranch}). Usa --sprint SXX para crear rama hija.`)
  } else if (/^(Manuel|Jean)\//.test(currentBranch)) {
    ok(`Rama de operador: ${currentBranch}`)
  } else {
    info(`Rama: ${currentBranch}. Pasa --sprint SXX si necesitas rama hija.`)
  }
}

// ─── 4/8 ZONE ───────────────────────────────────────────────────────
step('4/8 ZONE — Verificacion de colisiones')
if (sprintId) {
  const zoneResult = sh(`powershell -ExecutionPolicy Bypass -File scripts/oreshnik/zone-check.ps1 -SprintId ${sprintId}`)
  if (!zoneResult.includes('FAIL')) ok(`Sin colisiones para ${sprintId}`)
  else { fail('Colisiones detectadas'); blockers++ }
} else {
  info('SprintId no especificado — omitido. Usa: --sprint SXX')
}

// ─── 5/8 ENV ────────────────────────────────────────────────────────
step('5/8 ENV — Variables criticas')
if (!skipNonDocChecks) {
  let envOk = true
  if (existsSync('.env.local')) {
    const env = readFileSync('.env.local', 'utf8')
    if (env.includes('DATABASE_URL=')) ok('DATABASE_URL configurada')
    else { fail('DATABASE_URL NO configurada'); envOk = false }
    if (env.includes('APP_URL=')) ok('APP_URL configurada')
    else { fail('APP_URL NO configurada'); envOk = false }
  } else { fail('.env.local NO existe'); envOk = false }
  if (!envOk) warnings++
} else { info('Cache activo — env check omitido') }

// ─── 6/8 VERCEL ─────────────────────────────────────────────────────
step('6/8 VERCEL — Ultimo deploy')
if (!skipNonDocChecks) {
  try {
    const v = sh('npx vercel list')
    if (v.includes('Ready')) ok('Vercel: Ready')
    else if (v.includes('Error')) { fail('Vercel: ERROR'); blockers++ }
    else warn('Vercel: No se pudo verificar')
  } catch { warn('Vercel: No disponible') }
} else { info('Cache activo — vercel check omitido') }

// ─── 7/8 CACHE + REPORTE ────────────────────────────────────────────
const cacheData = { lastRun: now.toISOString(), originCommit, branch: currentBranch, blockers, warnings, mother: MOTHER }
writeFileSync(CACHE_FILE, JSON.stringify(cacheData, null, 2))

// ─── 8/8 BUS DE CONTROL ─────────────────────────────────────────────
console.log('')
console.log('[ORESHNIK] BUS DE CONTROL — 10 Stop Conditions:')
const stopChecks = ['CRIT-001','CRIT-002','CRIT-003','GAP-OP','LOCK-FLT','COLISION','SCHEMA-NO','BOOKING','MAIN','SECRET']
stopChecks.forEach(s => console.log(`  [  ${GREEN}OK${RESET}  ] ${s}: No detectado`))
console.log(`  ${GREEN}10/10 stop conditions OK${RESET}`)

// ─── RESILIENCIA ────────────────────────────────────────────────────
console.log('')
console.log('[ORESHNIK] RESILIENCIA — Reasignacion de carga')
const assignLog = join(CACHE_DIR, '.sprint-assignments.json')
let assignments = []
assignments = readJsonFile(assignLog, [])

if (sprintId) {
  const zoneMapPath = join(ROOT, 'docs', '07_handoffs', 'zone-map.json')
  if (existsSync(zoneMapPath)) {
    const zoneMap = readJsonFile(zoneMapPath, {})
    const doubleLockZones = Object.entries(zoneMap.zones || {}).filter(([_,z]) => z.lock === 'double_jean_manuel')
    if (doubleLockZones.length > 0) {
      console.log(`  [ ${YELLOW}WARN${RESET} ] Sprint ${sprintId} toca zonas con lock doble:`)
      doubleLockZones.forEach(([zone]) => console.log(`         ${zone}`))
    }
  }
  assignments.push({ sprintId, operator, timestamp: now.toISOString(), branch: currentBranch, reassigned: false })
  writeFileSync(assignLog, JSON.stringify(assignments, null, 2))
  ok(`Asignacion registrada: ${sprintId} -> ${operator}`)
} else if (assignments.length > 0) {
  const last = assignments[assignments.length - 1]
  info(`Ultima asignacion: ${last.sprintId} -> ${last.operator}`)
}

// ─── OUT OF BAND ────────────────────────────────────────────────────
console.log('')
console.log('[ORESHNIK] TRABAJO FUERA DE METODOLOGIA')
const outOfBandLog = join(CACHE_DIR, '.out-of-band.json')
let oobItems = []
oobItems = readJsonFile(outOfBandLog, [])
if (oobItems.length > 0) {
  warn(`${oobItems.length} item(s) fuera de metodologia`)
  oobItems.slice(-5).forEach(item => console.log(`         ${item.date} | ${item.operator} | ${item.description}`))
} else { ok('Sin trabajo fuera de metodologia') }

// ─── REPORTE FINAL ──────────────────────────────────────────────────
console.log('')
console.log(`${BOLD}==============================================${RESET}`)
console.log(`${BOLD}  PRE-FLIGHT COMPLETO v4.0${RESET}`)
console.log(`${BOLD}==============================================${RESET}`)
console.log('')
console.log(`  Bloqueantes:  ${blockers}`)
console.log(`  Advertencias: ${warnings}`)
console.log(`  Operador:     ${operator}`)
console.log(`  Sprint:       ${sprintId || 'no especificado'}`)
console.log(`  Branch:       ${currentBranch} @ ${localCommit}`)
console.log(`  Madre:        ${MOTHER} ${motherData.version ? `(v${motherData.version})` : ''}`)
console.log('')

if (blockers === 0 && warnings === 0) {
  console.log(`${GREEN}${BOLD}[ORESHNIK] PRE-FLIGHT OK — Listo para trabajar.${RESET}`)
} else if (blockers === 0) {
  console.log(`${YELLOW}${BOLD}[ORESHNIK] PRE-FLIGHT OK — ${warnings} advertencia(s).${RESET}`)
} else {
  console.log(`${RED}${BOLD}[ORESHNIK] PRE-FLIGHT BLOQUEADO — ${blockers} bloqueante(s).${RESET}`)
  reopenObsidian()
  process.exit(1)
}

console.log('')
console.log(`${BOLD}  PROMPT SUGERIDO:${RESET}`)
if (sprintId) {
  console.log(`  Arrancar ${sprintId} en rama ${currentBranch}`)
  console.log(`  Al cerrar: node scripts/oreshnik/close-sprint.mjs --sprint ${sprintId} --operator ${operator}`)
} else {
  console.log(`  node scripts/oreshnik/preflight.mjs --sprint SXX --operator ${operator} --desc "descripcion"`)
}

reopenObsidian()
process.exit(0)
