#!/usr/bin/env node
/**
 * Oreshnik Sync from Mother — Jala docs desde la rama madre dinamica a la rama hija actual.
 * 
 * Uso: node scripts/oreshnik/sync-from-mother.mjs
 * 
 * Efecto: Reemplaza los docs/ locales con los de la ultima rama madre.
 *          Respeta cambios locales en docs/ (los stashea y re-aplica).
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const VERSION_FILE = join(__dirname, 'runs', '.mother-version.json')

function sh(cmd) {
  try { return execSync(cmd, { encoding: 'utf8', stdio: 'pipe' }).trim() } catch { return '' }
}

function readMotherVersion() {
  try { if (existsSync(VERSION_FILE)) return JSON.parse(readFileSync(VERSION_FILE, 'utf8')) } catch {}
  return { version: 1, current: 'RAMA-MADRE' }
}

const motherData = readMotherVersion()
const MOTHER = motherData.current
const currentBranch = sh('git branch --show-current')

console.log('')
console.log('[SYNC-FROM-MOTHER] Madre actual:', MOTHER)
console.log('[SYNC-FROM-MOTHER] Rama actual:', currentBranch)

// Fetch
sh('git fetch origin --prune --quiet')
console.log('[SYNC-FROM-MOTHER] Fetch completado')

// Verificar que la madre existe
const motherRef = sh(`git rev-parse --verify origin/${MOTHER}`)
if (!motherRef) {
  console.error(`[SYNC-FROM-MOTHER] ERROR: Rama madre '${MOTHER}' no encontrada.`)
  process.exit(1)
}

// Verificar si docs locales difieren de madre
const localDocHead = sh('git rev-parse HEAD:docs')
const motherDocHead = sh(`git rev-parse origin/${MOTHER}:docs`)

if (localDocHead === motherDocHead) {
  console.log('[SYNC-FROM-MOTHER] Docs ya estan sincronizados con madre.')
  process.exit(0)
}

// Stash cambios locales en docs
const hasDocChanges = sh('git diff --name-only -- docs/')
if (hasDocChanges) {
  console.log('[SYNC-FROM-MOTHER] Respaldando cambios locales en docs/...')
  sh('git stash push -- docs/')
}

// Sync docs desde madre
console.log('[SYNC-FROM-MOTHER] Sincronizando docs desde madre...')
const result = sh(`git checkout origin/${MOTHER} -- docs/ 2>&1`)

if (result.includes('error')) {
  console.error('[SYNC-FROM-MOTHER] ERROR al sincronizar:', result)
  // Restaurar stash si habia
  if (hasDocChanges) sh('git stash pop')
  process.exit(1)
}

console.log('[SYNC-FROM-MOTHER] Docs sincronizados exitosamente.')

// Re-aplicar cambios locales
if (hasDocChanges) {
  const popResult = sh('git stash pop 2>&1')
  if (popResult.includes('CONFLICT')) {
    console.log('[SYNC-FROM-MOTHER] ATENCION: Conflictos al re-aplicar cambios locales. Resuelve manualmente.')
  } else {
    console.log('[SYNC-FROM-MOTHER] Cambios locales re-aplicados.')
  }
}

console.log('[SYNC-FROM-MOTHER] Listo. Docs actualizados desde', MOTHER)
process.exit(0)
