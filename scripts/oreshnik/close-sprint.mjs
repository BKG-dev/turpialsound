#!/usr/bin/env node
/**
 * Oreshnik Close Sprint v2.0 — Cierre automatizado con cobertura holística de docs.
 * 
 * PRINCIPIO: Cada archivo de código modificado debe tener su documentación actualizada.
 * 
 * Flujo:
 *   A. COBERTURA — Analiza archivos modificados vs docs requeridos, reporta gaps
 *   B. MECÁNICA  — Actualiza 00_CENTRAL, PLAN_MAESTRO, timestamps
 *   C. GIT       — Commitea docs en rama hija, pushea hija + madre
 *   D. EVENTO    — Registra cierre, versiona madre dinámica
 * 
 * Uso: node scripts/oreshnik/close-sprint.mjs --sprint SXX [--operator Jean|Manuel] [--desc "desc"] [--force]
 *   --force: Omite verificación de cobertura (solo emergencias)
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..', '..')
const CACHE_DIR = join(__dirname, 'runs')
const VERSION_FILE = join(CACHE_DIR, '.mother-version.json')
const SPRINT_EVENTS_DIR = join(ROOT, 'var', 'sprint-events')

const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const CYAN = '\x1b[36m'
const BOLD = '\x1b[1m'
const RESET = '\x1b[0m'

// ─── TRACEABILITY: Código → Documentación ───────────────────────────
// Cada zona de código mapea a los documentos que DEBEN reflejar sus cambios.
const CODE_TO_DOCS = {
  'prisma/schema.prisma': {
    docs: ['docs/obsidian-vault/ARQUITECTURA/ARQUITECTURA_TASAS.md', 'docs/obsidian-vault/00_CENTRAL_TURPIAL.md'],
    label: 'DB Schema'
  },
  'prisma/migrations/': {
    docs: ['docs/obsidian-vault/ARQUITECTURA/ARQUITECTURA_TASAS.md', 'docs/obsidian-vault/00_CENTRAL_TURPIAL.md'],
    label: 'Migraciones DB'
  },
  'actions/marketplace/': {
    docs: ['docs/marketplace/01_ROADMAP_AND_STATUS.md', 'docs/07_handoffs/qa-dispatcher.json', 'docs/obsidian-vault/00_CENTRAL_TURPIAL.md'],
    label: 'Server Actions Marketplace'
  },
  'app/(public)/marketplace/': {
    docs: ['docs/marketplace/01_ROADMAP_AND_STATUS.md', 'docs/obsidian-vault/00_CENTRAL_TURPIAL.md'],
    label: 'Rutas Marketplace'
  },
  'app/api/marketplace/': {
    docs: ['docs/marketplace/01_ROADMAP_AND_STATUS.md', 'docs/obsidian-vault/ARQUITECTURA/ARQUITECTURA_TASAS.md', 'docs/obsidian-vault/00_CENTRAL_TURPIAL.md'],
    label: 'API Marketplace'
  },
  'components/marketplace/': {
    docs: ['docs/marketplace/01_ROADMAP_AND_STATUS.md', 'docs/obsidian-vault/00_CENTRAL_TURPIAL.md'],
    label: 'Componentes Marketplace'
  },
  'app/(public)/reservas/': {
    docs: ['docs/obsidian-vault/00_CENTRAL_TURPIAL.md'],
    label: 'Rutas Booking'
  },
  'app/api/reservas/': {
    docs: ['docs/obsidian-vault/00_CENTRAL_TURPIAL.md'],
    label: 'API Booking'
  },
  'components/bookings/': {
    docs: ['docs/obsidian-vault/00_CENTRAL_TURPIAL.md'],
    label: 'Componentes Booking'
  },
  'lib/bookings/': {
    docs: ['docs/obsidian-vault/00_CENTRAL_TURPIAL.md'],
    label: 'Libreria Booking'
  },
  'scripts/qa/modules/': {
    docs: ['docs/07_handoffs/qa-dispatcher.json', 'docs/obsidian-vault/QA/QA_HARNESS_INDEX.md', 'docs/obsidian-vault/00_CENTRAL_TURPIAL.md'],
    label: 'QA Modules'
  },
  'scripts/qa/playwright/': {
    docs: ['docs/07_handoffs/qa-dispatcher.json', 'docs/07_handoffs/qa-canonical-runbook.md', 'docs/obsidian-vault/00_CENTRAL_TURPIAL.md'],
    label: 'QA Playwright'
  },
  'scripts/oreshnik/': {
    docs: ['docs/obsidian-vault/METODOLOGIA/METODOLOGIA_ORESHNIK.md', 'docs/obsidian-vault/METODOLOGIA/INSTRUCCION_APERTURA_SESION.md'],
    label: 'Scripts Oreshnik'
  },
  'app/admin/': {
    docs: ['docs/obsidian-vault/00_CENTRAL_TURPIAL.md'],
    label: 'Admin Panel'
  },
  'app/(public)/': {
    docs: ['docs/obsidian-vault/00_CENTRAL_TURPIAL.md'],
    label: 'Rutas Publicas'
  },
  'components/ui/': {
    docs: ['docs/obsidian-vault/00_CENTRAL_TURPIAL.md'],
    label: 'UI Components'
  },
  'docs/': {
    docs: ['docs/obsidian-vault/00_INDICE_MAESTRO.md'],
    label: 'Documentacion'
  }
}

// Documentos canónicos que SIEMPRE deben actualizarse al cerrar sprint
const CANONICAL_DOCS = [
  'docs/obsidian-vault/00_CENTRAL_TURPIAL.md',
  'docs/obsidian-vault/SPRINTS/PLAN_MAESTRO_SPRINTS.md'
]

const sprintId = process.argv.includes('--sprint')
  ? process.argv[process.argv.indexOf('--sprint') + 1]
  : null
const operatorFlag = process.argv.includes('--operator')
  ? process.argv[process.argv.indexOf('--operator') + 1]
  : null
const descFlag = process.argv.includes('--desc')
  ? process.argv[process.argv.indexOf('--desc') + 1]
  : null
const forceFlag = process.argv.includes('--force')

if (!sprintId) {
  console.error(`${RED}Error: --sprint es obligatorio.${RESET}`)
  console.error('Uso: node scripts/oreshnik/close-sprint.mjs --sprint SXX [--operator Jean|Manuel] [--desc "desc"] [--force]')
  process.exit(1)
}

function sh(cmd, { fatal = false } = {}) {
  try { return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim() }
  catch (e) {
    if (fatal) { console.error(`${RED}Error: ${cmd}${RESET}\n${e.stderr || e.message}`); process.exit(1) }
    return ''
  }
}
function ok(msg)  { console.log(`  [  ${GREEN}OK${RESET}  ] ${msg}`) }
function fail(msg){ console.log(`  [ ${RED}FAIL${RESET} ] ${msg}`) }

// ─── Obsidian auto-close/reopen ─────────────────────────────────────
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
  try {
    if (process.platform === 'win32') {
      const vaultPath = resolve(ROOT, 'docs', 'obsidian-vault')
      execSync(`start "" "${obsidianExePath}" "obsidian://open?vault=${encodeURIComponent(vaultPath)}"`, { encoding: 'utf8', stdio: 'ignore' })
    }
  } catch {}
}
function warn(msg){ console.log(`  [ ${YELLOW}WARN${RESET} ] ${msg}`) }
function step(msg){ console.log(`  [ ${CYAN}STEP${RESET} ] ${msg}`) }
function info(msg){ console.log(`  [ ${CYAN}INFO${RESET} ] ${msg}`) }
function title(msg){ console.log(`${BOLD}${msg}${RESET}`) }

function resolveOperator() {
  if (operatorFlag) return operatorFlag
  const envOp = process.env.ORESHNIK_OPERATOR
  if (envOp) return envOp
  const gitUser = sh('git config user.name').toLowerCase()
  if (gitUser.includes('manuel') || gitUser.includes('mvera')) return 'Manuel'
  if (gitUser.includes('jean')) return 'Jean'
  return gitUser.split(' ')[0] || 'operator'
}
function sanitize(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
}
function getNowVET() {
  const now = new Date()
  const dd = String(now.getDate()).padStart(2, '0')
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const yy = String(now.getFullYear()).slice(2)
  const hh = String(now.getHours()).padStart(2, '0')
  const min = String(now.getMinutes()).padStart(2, '0')
  return { fulldate: `${dd}/${mm}/${yy} ${hh}:${min}`, date: now.toISOString().slice(0, 10), iso: now.toISOString() }
}
function readMotherVersion() {
  try { if (existsSync(VERSION_FILE)) return JSON.parse(readFileSync(VERSION_FILE, 'utf8')) } catch {}
  return { version: 1, branches: [], current: 'RAMA-MADRE' }
}
function writeMotherVersion(data) {
  mkdirSync(CACHE_DIR, { recursive: true })
  writeFileSync(VERSION_FILE, JSON.stringify(data, null, 2))
}

// ─── MAIN ────────────────────────────────────────────────────────────
const operator = resolveOperator()
const vet = getNowVET()
const motherData = readMotherVersion()
const oldMother = motherData.current
const newVersion = motherData.version + 1
const sprintTag = sanitize(sprintId)
const descTag = descFlag ? `-${sanitize(descFlag)}` : ''
const newMotherName = `MADRE/v${newVersion}-${sprintTag}${descTag}-${vet.date}`

console.log('')
title('═══════════════════════════════════════════')
title('  ORESHNIK CLOSE SPRINT v2.0')
title(`  ${vet.iso}`)
title('═══════════════════════════════════════════')
console.log('')
info(`Sprint:    ${sprintId}`)
info(`Operador:  ${operator}`)
info(`Fecha:     ${vet.fulldate} VET`)
info(`Madre:     ${oldMother}`)
console.log('')

// ─── A. COBERTURA — Verificación holística de documentación ─────────
step('A/4 COBERTURA — Verificar documentacion actualizada')

const motherBranch = motherData.current
const currentBranch = sh('git branch --show-current', { fatal: true })

if (!new RegExp(`^${operator}/`, 'i').test(currentBranch)) {
  fail(`Rama actual ${currentBranch} no es rama de ${operator}.`)
  process.exit(1)
}
ok(`Rama: ${currentBranch}`)

// Working tree debe estar limpio
const dirty = sh('git diff --name-only')
const dirtyStaged = sh('git diff --cached --name-only')
const allDirty = sh('git status --porcelain').split('\n').filter(l => l.trim())
const onlyDocsDirty = allDirty.every(l => l.includes('docs/') || l.includes('scripts/oreshnik/runs/'))
if (dirty || dirtyStaged) {
  if (!onlyDocsDirty) {
    fail('Working tree sucio con archivos fuera de docs/. Commitea o stashea.')
    process.exit(1)
  }
  warn('Working tree tiene cambios solo en docs/ — se incluiran en el cierre.')
}

// Obtener archivos modificados en la rama hija vs madre
const changedFiles = sh(`git diff --name-only ${motherBranch}...${currentBranch} 2>nul`)
  .split('\n').filter(Boolean)

if (!changedFiles.length) {
  warn('No hay archivos modificados vs la rama madre. ¿Seguro que quieres cerrar?')
}

// Mapear archivos modificados a zonas de documentación
const requiredDocs = new Map()
const changedZones = new Set()

for (const file of changedFiles) {
  for (const [zone, { docs, label }] of Object.entries(CODE_TO_DOCS)) {
    if (file.startsWith(zone) || file === zone) {
      changedZones.add(label)
      for (const doc of docs) {
        if (!requiredDocs.has(doc)) requiredDocs.set(doc, new Set())
        requiredDocs.get(doc).add(label)
      }
    }
  }
}

// Siempre requerir docs canónicos
for (const doc of CANONICAL_DOCS) {
  if (!requiredDocs.has(doc)) requiredDocs.set(doc, new Set())
  requiredDocs.get(doc).add('DOCUMENTO CANONICO')
}

// Mostrar análisis de cobertura
console.log('')
info(`Zonas de codigo modificadas: ${changedZones.size > 0 ? [...changedZones].join(', ') : '(ninguna — solo docs)'}`)
console.log('')
console.log(`${BOLD}  COBERTURA DE DOCUMENTACION:${RESET}`)
console.log('')

const coverageGaps = []
const coverageOk = []

for (const [doc, zones] of requiredDocs) {
  const docPath = join(ROOT, doc)
  const docExists = existsSync(docPath)
  const wasModified = changedFiles.some(f => f === doc || f.startsWith(doc.replace(/\/[^\/]+$/, '') + '/'))
  const docModifiedInSprint = wasModified || sh(`git diff --name-only ${motherBranch}...${currentBranch} -- "${doc}"`)
  
  let status = ''
  if (!docExists) {
    status = `${RED}NO EXISTE${RESET}`
    coverageGaps.push({ doc, zones: [...zones], reason: 'Archivo no encontrado' })
  } else if (!docModifiedInSprint) {
    status = `${YELLOW}SIN MODIFICAR${RESET}`
    coverageGaps.push({ doc, zones: [...zones], reason: 'No fue modificado en este sprint' })
  } else {
    // Verificar que tenga last_updated reciente
    const content = readFileSync(docPath, 'utf8')
    const hasUpdatedDate = content.includes(vet.date) || content.includes(sprintId)
    if (hasUpdatedDate) {
      status = `${GREEN}ACTUALIZADO${RESET}`
      coverageOk.push(doc)
    } else {
      status = `${YELLOW}MODIFICADO (sin fecha reciente)${RESET}`
      coverageGaps.push({ doc, zones: [...zones], reason: 'Modificado pero sin referencia a fecha/sprint actual' })
    }
  }
  
  const pad = doc.length > 55 ? '\n' + ' '.repeat(57) : ' '.repeat(Math.max(1, 56 - doc.length))
  console.log(`  ${doc}${pad}${status}`)
}

console.log('')

if (coverageGaps.length > 0) {
  console.log(`${YELLOW}${BOLD}  ⚠️  DOCUMENTACION INCOMPLETA — ${coverageGaps.length} documento(s) requieren actualizacion:${RESET}`)
  console.log('')
  for (const gap of coverageGaps) {
    console.log(`    ${gap.doc}`)
    console.log(`    Zonas de codigo: ${gap.zones.join(', ')}`)
    console.log(`    Motivo: ${gap.reason}`)
    console.log('')
  }
  
  if (forceFlag) {
    warn('--force activo: Continuando a pesar de gaps de cobertura.')
  } else {
    console.log(`${BOLD}  ACCION REQUERIDA:${RESET}`)
    console.log('  Actualiza manualmente los documentos listados arriba para reflejar')
    console.log('  los cambios de codigo de este sprint. Luego vuelve a ejecutar:')
    console.log(`  ${CYAN}node scripts/oreshnik/close-sprint.mjs --sprint ${sprintId} --operator ${operator}${RESET}`)
    console.log('')
    console.log('  O usa --force para omitir esta verificacion (solo emergencias).')
    console.log('')
    process.exit(2)
  }
} else {
  ok(`Cobertura completa: ${coverageOk.length} documentos actualizados`)
}

console.log('')

// ─── B. MECÁNICA — Actualizar timestamps y estados ──────────────────
step('B/4 MECANICA — Actualizar documentos canonicos')

// B1: 00_CENTRAL_TURPIAL.md
const centralPath = join(ROOT, 'docs', 'obsidian-vault', '00_CENTRAL_TURPIAL.md')
if (existsSync(centralPath)) {
  let central = readFileSync(centralPath, 'utf8')
  central = central.replace(/last_updated:\s*"[^"]*"/, `last_updated: "${vet.fulldate}"`)
  central = central.replace(/mother_branch:\s*"[^"]*"/, `mother_branch: "${newMotherName}"`)

  // Actualizar estado del sprint
  const sprintEscaped = sprintId.replace(/[-/\\]/g, '[-\\\\/]')
  const tablePattern = new RegExp(`(\\|\\s*${sprintEscaped}\\s*\\|.*?\\|.*?\\|)\\s*[🟡🔴🟢⏳](\\s*[^\\|]*?)(\\s*\\|)`, 'g')
  if (tablePattern.test(central)) {
    central = central.replace(tablePattern, `$1✅ CERRADO |`)
  }

  // Actualizar linea final
  central = central.replace(
    /> \*\*Ultima actualizacion:\*\*.*$/m,
    `> **Ultima actualizacion:** ${vet.fulldate} VET | **Estado:** ${sprintId} CERRADO | **Tag:** \`close-${operator.toLowerCase()}-${sanitize(sprintId)}-${vet.date}\``
  )

  writeFileSync(centralPath, central, 'utf8')
  ok(`00_CENTRAL_TURPIAL.md → last_updated: ${vet.fulldate}`)
}

// B2: PLAN_MAESTRO_SPRINTS.md
const planPath = join(ROOT, 'docs', 'obsidian-vault', 'SPRINTS', 'PLAN_MAESTRO_SPRINTS.md')
if (existsSync(planPath)) {
  let plan = readFileSync(planPath, 'utf8')
  plan = plan.replace(/last_updated:\s*"[^"]*"/, `last_updated: "${vet.iso}"`)
  plan = plan.replace(/mother_branch:\s*"[^"]*"/, `mother_branch: "${newMotherName}"`)

  // Marcar sprint como CERRADO en su sección
  const sprintEscaped = sprintId.replace(/[-/\\]/g, '[-\\\\/]')
  const sectionRegex = new RegExp(`(###\\s+${sprintEscaped}\\s+[—\\-].*?\\n[\\s\\S]*?)(\\n###\\s+|\\n---\\n|\\n##\\s+)`)
  const sectionMatch = sectionRegex.exec(plan)
  if (sectionMatch) {
    if (!sectionMatch[1].includes('✅ CERRADO')) {
      plan = plan.replace(
        sectionMatch[1],
        sectionMatch[1].replace(/\*\*Cierre:\*\*.*$/m, `**Cierre:** ✅ ${vet.fulldate} VET — ${sprintId} CERRADO por ${operator}`)
      )
    }
  }

  writeFileSync(planPath, plan, 'utf8')
  ok('PLAN_MAESTRO_SPRINTS.md actualizado')
}

// B3: INSTRUCCION_APERTURA_SESION.md — actualizar madre y fecha
const aperturaPath = join(ROOT, 'docs', 'obsidian-vault', 'METODOLOGIA', 'INSTRUCCION_APERTURA_SESION.md')
if (existsSync(aperturaPath)) {
  let apertura = readFileSync(aperturaPath, 'utf8')
  apertura = apertura.replace(/actualizado:\s*"[^"]*"/, `actualizado: "${vet.iso}"`)
  apertura = apertura.replace(/mother_branch:\s*"[^"]*"/, `mother_branch: "${newMotherName}"`)
  writeFileSync(aperturaPath, apertura, 'utf8')
  ok('INSTRUCCION_APERTURA_SESION.md actualizado')
}

// B4: METODOLOGIA_ORESHNIK.md
const metodologiaPath = join(ROOT, 'docs', 'obsidian-vault', 'METODOLOGIA', 'METODOLOGIA_ORESHNIK.md')
if (existsSync(metodologiaPath)) {
  let met = readFileSync(metodologiaPath, 'utf8')
  met = met.replace(/fecha:\s*"[^"]*"/, `fecha: "${vet.date}"`)
  met = met.replace(/actualizado:\s*"[^"]*"/, `actualizado: "${vet.iso}"`)
  writeFileSync(metodologiaPath, met, 'utf8')
  ok('METODOLOGIA_ORESHNIK.md actualizado')
}

// B5: 00_INDICE_MAESTRO.md
const indicePath = join(ROOT, 'docs', 'obsidian-vault', '00_INDICE_MAESTRO.md')
if (existsSync(indicePath)) {
  let indice = readFileSync(indicePath, 'utf8')
  indice = indice.replace(/last_updated:\s*"[^"]*"/, `last_updated: "${vet.iso}"`)
  writeFileSync(indicePath, indice, 'utf8')
  ok('00_INDICE_MAESTRO.md actualizado')
}

console.log('')

obsidianWasRunning = closeObsidian()

// ─── C. GIT — Commit, push hija, crear madre ────────────────────────
step('C/4 GIT — Commits y push')

// C1: Commit docs en rama hija
const docChanges = sh('git diff --name-only -- docs/ scripts/oreshnik/runs/')
if (docChanges) {
  sh('git add docs/ scripts/oreshnik/runs/', { fatal: true })
  const commitMsg = `docs(sprint): cerrar ${sprintId} — ${descFlag || 'CERRADO'} [${vet.fulldate} VET]`
  sh(`git commit -m "${commitMsg}"`, { fatal: true })
  ok(`Commit hija: ${commitMsg}`)
} else {
  info('Sin cambios adicionales en docs')
}

// C2: Push rama hija completa
sh(`git push origin ${currentBranch}`, { fatal: true })
ok(`Push rama hija: ${currentBranch}`)

// C3: Crear nueva rama madre dinamica desde la ultima madre publicada
info(`Creando rama madre: ${newMotherName}`)

const oldMotherExists = sh(`git rev-parse --verify ${oldMother} 2>nul`)

if (oldMotherExists) {
  sh(`git checkout ${oldMother}`, { fatal: true })
} else {
  sh(`git fetch origin ${oldMother}`, { fatal: true })
  sh(`git checkout -b ${oldMother} origin/${oldMother}`, { fatal: true })
}

info(`Actualizando madre desde origin/${oldMother}...`)
sh(`git pull --ff-only origin ${oldMother}`, { fatal: true })

const existingNewMother = sh(`git rev-parse --verify ${newMotherName} 2>nul`)
const existingRemoteNewMother = sh(`git rev-parse --verify origin/${newMotherName} 2>nul`)
if (existingNewMother || existingRemoteNewMother) {
  fail(`La rama madre destino ya existe: ${newMotherName}`)
  sh(`git checkout ${currentBranch}`, { fatal: true })
  process.exit(1)
}

sh(`git checkout -b ${newMotherName}`, { fatal: true })
info(`Nueva madre creada desde ${oldMother}: ${newMotherName}`)

// C4: Merge real de docs (Google Docs style), sin checkout destructivo.
step('C4/6 MERGE — Fusionar docs sin pisar cambios del otro operador')
info(`Fusionando docs desde ${currentBranch} sobre ${newMotherName}...`)
const docsMerge = sh(`node scripts/oreshnik/merge-docs-union.mjs --base ${oldMother} --source ${currentBranch} --stage`, { fatal: true })
if (docsMerge) info(docsMerge)

motherData.version = newVersion
motherData.current = newMotherName
motherData.branches.push({
  version: newVersion,
  name: newMotherName,
  sprint: sprintId,
  operator,
  date: vet.date,
  fulldate: vet.fulldate,
  description: descFlag || 'CERRADO',
  previous: oldMother
})
writeMotherVersion(motherData)

mkdirSync(SPRINT_EVENTS_DIR, { recursive: true })
const eventFile = join(SPRINT_EVENTS_DIR, `${vet.date}_${sprintId}_CERRADO.json`)
const eventData = {
  sprint: sprintId,
  operator,
  status: 'CERRADO',
  date: vet.date,
  fulldate: vet.fulldate,
  iso: vet.iso,
  childBranch: currentBranch,
  motherBranch: newMotherName,
  description: descFlag || null,
  previousMother: oldMother,
  changedZones: [...changedZones],
  docsUpdated: [...requiredDocs.keys()],
  coverageGaps: coverageGaps.length,
  forceClose: forceFlag
}
writeFileSync(eventFile, JSON.stringify(eventData, null, 2))

sh('git add docs/ scripts/oreshnik/runs/.mother-version.json var/sprint-events/', { fatal: true })

const stagedForMother = sh('git diff --cached --name-only')
const invalidMotherFiles = stagedForMother
  .split('\n')
  .filter(Boolean)
  .filter(file => !file.startsWith('docs/') && file !== 'scripts/oreshnik/runs/.mother-version.json' && !file.startsWith('var/sprint-events/'))

if (invalidMotherFiles.length > 0) {
  fail('El merge intento incluir archivos fuera de docs/metadata/eventos:')
  for (const file of invalidMotherFiles) console.log(`  ${file}`)
  sh('git reset HEAD -- . 2>nul')
  sh(`git checkout ${currentBranch}`, { fatal: true })
  sh(`git branch -D ${newMotherName} 2>nul`)
  reopenObsidian()
  process.exit(1)
}

if (stagedForMother) {
  const motherCommitMsg = `docs(mother): merge ${sprintId} — ${operator} [${vet.fulldate} VET] → ${newMotherName}`
  sh(`git commit -m "${motherCommitMsg}"`, { fatal: true })
  ok(`Commit madre: ${motherCommitMsg}`)
} else {
  info('Sin cambios netos en docs/metadata respecto a madre')
}

// C5: Push madre
sh(`git push origin ${newMotherName}`, { fatal: true })
ok(`Push madre: origin/${newMotherName}`)

// C6: Volver a rama hija y registrar metadata/evento tambien ahi
sh(`git checkout ${currentBranch}`, { fatal: true })
writeFileSync(eventFile, JSON.stringify(eventData, null, 2))
writeMotherVersion(motherData)

// ─── D. EVENTO — Registro de cierre ─────────────────────────────────
step('D/4 EVENTO — Registro de cierre')

const childClosureChanges = sh('git diff --name-only -- scripts/oreshnik/runs/.mother-version.json var/sprint-events/')
if (childClosureChanges) {
  sh('git add scripts/oreshnik/runs/.mother-version.json var/sprint-events/', { fatal: true })
  const closureCommitMsg = `chore(oreshnik): record ${sprintId} sprint closure`
  sh(`git commit -m "${closureCommitMsg}"`, { fatal: true })
  ok(`Commit metadata hija: ${closureCommitMsg}`)
  sh(`git push origin ${currentBranch}`, { fatal: true })
  ok(`Push metadata hija: ${currentBranch}`)
}
ok(`Evento: var/sprint-events/${vet.date}_${sprintId}_CERRADO.json`)

// ─── REPORTE FINAL ──────────────────────────────────────────────────
console.log('')
title('═══════════════════════════════════════════')
title(`  SPRINT CERRADO — ${sprintId}`)
title('═══════════════════════════════════════════')
console.log('')
console.log(`  Sprint:        ${sprintId}`)
console.log(`  Operador:      ${operator}`)
console.log(`  Rama hija:     ${currentBranch}`)
console.log(`  Rama madre:    ${newMotherName}  ← NUEVA`)
console.log(`  Version madre: v${newVersion}`)
console.log(`  Fecha:         ${vet.fulldate} VET`)
console.log(`  Madre anterior: ${oldMother}`)
console.log(`  Zonas tocadas: ${[...changedZones].join(', ') || 'solo docs'}`)
console.log(`  Docs actualizados: ${requiredDocs.size}`)
console.log(`  Gaps cobertura: ${coverageGaps.length}`)
console.log('')
console.log('  Próximo paso para el otro operador:')
console.log(`    git fetch origin && git checkout ${newMotherName}`)
console.log('')
info('Documentacion sincronizada a rama madre. El otro operador la recibira al iniciar sesion.')
console.log('')

reopenObsidian()
process.exit(0)
