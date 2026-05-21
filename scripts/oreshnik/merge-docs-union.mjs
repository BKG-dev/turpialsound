#!/usr/bin/env node
import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..', '..')
const CACHE_DIR = join(__dirname, 'runs')

const args = process.argv.slice(2)
const getArg = (name) => {
  const idx = args.indexOf(name)
  return idx >= 0 ? args[idx + 1] : ''
}

const baseRef = getArg('--base')
const sourceRef = getArg('--source')
const shouldStage = args.includes('--stage')

if (!baseRef || !sourceRef) {
  console.error('Uso: node scripts/oreshnik/merge-docs-union.mjs --base <ref> --source <ref> [--stage]')
  process.exit(2)
}

function git(args, { allowFail = false } = {}) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' })
  if (result.status !== 0 && !allowFail) {
    throw new Error(`${result.stderr || result.stdout || `git ${args.join(' ')}`}`.trim())
  }
  return { ok: result.status === 0, output: result.stdout || '', error: result.stderr || '' }
}

function readRef(ref, file) {
  const result = git(['show', `${ref}:${file}`], { allowFail: true })
  return result.ok ? result.output : null
}

function writeWorkingFile(file, content) {
  const target = join(ROOT, ...file.split('/'))
  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, content)
}

function removeWorkingFile(file) {
  const target = join(ROOT, ...file.split('/'))
  if (existsSync(target)) unlinkSync(target)
}

function readWorkingFile(file) {
  const target = join(ROOT, ...file.split('/'))
  return existsSync(target) ? readFileSync(target, 'utf8') : null
}

function same(a, b) {
  return String(a ?? '') === String(b ?? '')
}

function jsonKey(value) {
  return JSON.stringify(value)
}

function mergeValue(base, current, source) {
  if (jsonKey(current) === jsonKey(source)) return current
  if (jsonKey(current) === jsonKey(base)) return source
  if (jsonKey(source) === jsonKey(base)) return current

  const currentIsObject = current && typeof current === 'object' && !Array.isArray(current)
  const sourceIsObject = source && typeof source === 'object' && !Array.isArray(source)
  const baseIsObject = base && typeof base === 'object' && !Array.isArray(base)

  if (currentIsObject && sourceIsObject) {
    const result = { ...current }
    const keys = new Set([
      ...Object.keys(baseIsObject ? base : {}),
      ...Object.keys(current),
      ...Object.keys(source)
    ])
    for (const key of keys) {
      result[key] = mergeValue(baseIsObject ? base[key] : undefined, current[key], source[key])
    }
    return result
  }

  if (Array.isArray(current) && Array.isArray(source)) {
    const result = []
    const seen = new Set()
    for (const item of [...current, ...source]) {
      const key = jsonKey(item)
      if (!seen.has(key)) {
        seen.add(key)
        result.push(item)
      }
    }
    return result
  }

  // Scalar conflict: prefer source so the closing branch can advance state.
  return source
}

function tryMergeJson(baseContent, currentContent, sourceContent) {
  try {
    const base = baseContent ? JSON.parse(baseContent) : undefined
    const current = currentContent ? JSON.parse(currentContent) : undefined
    const source = sourceContent ? JSON.parse(sourceContent) : undefined
    return `${JSON.stringify(mergeValue(base, current, source), null, 2)}\n`
  } catch {
    return null
  }
}

function normalizeText(content) {
  return String(content ?? '').replace(/^\uFEFF/, '').replace(/\r\n/g, '\n')
}

function parseDocTimestamp(content) {
  const match = normalizeText(content).match(/last_updated:\s*"(\d{2})\/(\d{2})\/(\d{2})\s+(\d{2}):(\d{2})"/)
  if (!match) return null
  const [, d, mo, y, h, min] = match.map(Number)
  return new Date(2000 + y, mo - 1, d, h, min).getTime()
}

function blockKey(block) {
  return normalizeText(block)
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim()
}

function meaningfulBlockKeys(content) {
  const text = normalizeText(content)
  const keys = new Set()

  const addKey = (block) => {
    const key = blockKey(block)
    if (key.length >= 160) keys.add(key)
  }

  let headingBlock = []
  for (const line of text.split('\n')) {
    if (/^#{1,6}\s+/.test(line) && headingBlock.length > 0) {
      addKey(headingBlock.join('\n'))
      headingBlock = [line]
    } else {
      headingBlock.push(line)
    }
  }
  addKey(headingBlock.join('\n'))

  for (const block of text.split(/\n{2,}/)) addKey(block)

  return keys
}

function sourceAlreadyCovered(currentContent, sourceContent) {
  const currentTime = parseDocTimestamp(currentContent) ?? currentDocsTime
  const sourceTime = parseDocTimestamp(sourceContent) ?? sourceDocsTime
  if (currentTime !== null && sourceTime !== null && sourceTime > currentTime) return false
  if (currentTime !== null && sourceTime !== null && sourceTime < currentTime) return true

  const sourceKeys = meaningfulBlockKeys(sourceContent)
  if (sourceKeys.size === 0) return false

  const currentKeys = meaningfulBlockKeys(currentContent)
  let covered = 0
  for (const key of sourceKeys) {
    if (currentKeys.has(key)) covered++
  }
  if (covered === sourceKeys.size) return true

  const coverage = covered / sourceKeys.size
  return currentTime !== null && sourceTime !== null && sourceTime <= currentTime && coverage >= 0.8
}

function normalizeMergedText(file, currentContent, sourceContent, mergedContent) {
  if (!file.endsWith('.md')) return mergedContent
  if (sourceAlreadyCovered(currentContent, sourceContent)) return currentContent
  return mergedContent
}

function mergeTextUnion(file, baseContent, currentContent, sourceContent) {
  mkdirSync(CACHE_DIR, { recursive: true })
  const id = Buffer.from(file).toString('hex')
  const basePath = join(CACHE_DIR, `.merge-base-${process.pid}-${id}`)
  const currentPath = join(CACHE_DIR, `.merge-current-${process.pid}-${id}`)
  const sourcePath = join(CACHE_DIR, `.merge-source-${process.pid}-${id}`)
  try {
    writeFileSync(basePath, baseContent ?? '')
    writeFileSync(currentPath, currentContent ?? '')
    writeFileSync(sourcePath, sourceContent ?? '')
    const merged = execFileSync('git', ['merge-file', '--union', '-p', currentPath, basePath, sourcePath], {
      cwd: ROOT,
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024
    })
    return normalizeMergedText(file, currentContent, sourceContent, merged)
  } finally {
    rmSync(basePath, { force: true })
    rmSync(currentPath, { force: true })
    rmSync(sourcePath, { force: true })
  }
}

const diff = git(['diff', '--name-only', `${baseRef}...${sourceRef}`, '--', 'docs/']).output
const files = diff.split(/\r?\n/).filter(Boolean)
const changed = []
const warnings = []
const currentDocsTime = parseDocTimestamp(readWorkingFile('docs/obsidian-vault/00_CENTRAL_TURPIAL.md'))
const sourceDocsTime = parseDocTimestamp(readRef(sourceRef, 'docs/obsidian-vault/00_CENTRAL_TURPIAL.md'))

for (const file of files) {
  if (!file.startsWith('docs/')) continue

  const baseContent = readRef(baseRef, file)
  const sourceContent = readRef(sourceRef, file)
  const currentContent = readWorkingFile(file)

  if (sourceContent === null) {
    if (currentContent === null || same(currentContent, baseContent)) {
      removeWorkingFile(file)
      changed.push(file)
    } else {
      warnings.push(`${file}: source deleted but current changed; preserved current`)
    }
    continue
  }

  if (currentContent === null || same(currentContent, baseContent) || same(currentContent, sourceContent)) {
    if (!same(currentContent, sourceContent)) {
      writeWorkingFile(file, sourceContent)
      changed.push(file)
    }
    continue
  }

  if (same(sourceContent, baseContent)) continue

  let merged = null
  if (file.endsWith('.json')) {
    merged = tryMergeJson(baseContent, currentContent, sourceContent)
  }
  if (merged === null) {
    merged = mergeTextUnion(file, baseContent, currentContent, sourceContent)
  }
  writeWorkingFile(file, merged)
  changed.push(file)
}

if (shouldStage && changed.length > 0) {
  git(['add', '--', ...changed])
}

console.log(JSON.stringify({ changed, warnings }, null, 2))
