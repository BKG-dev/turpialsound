import { existsSync, statSync, readdirSync, copyFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { getEnv } from './env.mjs'

const ASSETS_DIR = getEnv('QA_ASSETS_DIR', path.join(process.env.USERPROFILE || 'C:\\Users', 'Downloads'))
const QA_ASSETS_COPY_DIR = 'var/qa-assets'

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif'])
const MAX_SIZE_BYTES = 10 * 1024 * 1024
const BLOCKED_PATTERNS = [
  /comprobante/i,
  /pago/i,
  /cedula/i,
  /cuenta/i,
  /banco/i,
  /firma/i,
  /documento/i,
  /identidad/i,
  /pasaporte/i,
]

export function getAllowedExtensions() {
  return [...ALLOWED_EXTENSIONS]
}

export function validateAsset(filePath) {
  if (!existsSync(filePath)) {
    return { valid: false, reason: 'FILE_NOT_FOUND', basename: path.basename(filePath) }
  }

  const ext = path.extname(filePath).toLowerCase()
  if (!ALLOWED_EXTENSIONS.has(ext)) {
    return { valid: false, reason: 'EXTENSION_NOT_ALLOWED', ext, basename: path.basename(filePath) }
  }

  const sizeBytes = statSync(filePath).size
  if (sizeBytes > MAX_SIZE_BYTES) {
    return { valid: false, reason: 'FILE_TOO_LARGE', sizeBytes, maxSizeBytes: MAX_SIZE_BYTES, basename: path.basename(filePath) }
  }

  return { valid: true, ext, sizeBytes, basename: path.basename(filePath), path: filePath }
}

export function isSensitiveName(filename) {
  const basename = path.basename(filename)
  return BLOCKED_PATTERNS.some((pattern) => pattern.test(basename))
}

export function scrubSensitiveName(filePath) {
  return path.basename(filePath)
}

export function findAssets(pattern = null, sourceDir = null) {
  const dir = sourceDir || ASSETS_DIR
  if (!existsSync(dir)) return []

  const files = readdirSync(dir).filter((name) => {
    const ext = path.extname(name).toLowerCase()
    return ALLOWED_EXTENSIONS.has(ext)
  })

  return files
    .map((name) => {
      const fullPath = path.join(dir, name)
      return validateAsset(fullPath)
    })
    .filter((result) => result.valid)
}

export function pickListingImage(sourceDir = null) {
  const assets = findAssets(null, sourceDir)
  return assets.length > 0 ? assets[0] : null
}

export function pickPaymentProof(sourceDir = null) {
  const assets = findAssets(null, sourceDir).filter((a) => !isSensitiveName(a.path))
  return assets.length > 0 ? assets[0] : null
}

export function copyToQaAssets(filePath) {
  const targetDir = path.resolve(QA_ASSETS_COPY_DIR)
  if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true })

  const basename = path.basename(filePath)
  const ext = path.extname(basename)
  const name = path.basename(basename, ext)
  const timestamp = Date.now()
  const destName = `${name}-${timestamp}${ext}`
  const destPath = path.join(targetDir, destName)

  copyFileSync(filePath, destPath)
  return { source: basename, copied: destName, destPath }
}

export function getAssetsDir() {
  return ASSETS_DIR
}
