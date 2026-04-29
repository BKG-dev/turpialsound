import { execSync } from 'node:child_process'

const FORBIDDEN_PREFIXES = [
  '.env',
  'app/api/',
  'generated/',
  'lib/auth/',
  'lib/bookings/actions',
  'lib/bookings/google-calendar',
  'lib/bookings/payment',
  'lib/bookings/reference-rate',
  'lib/storage/payment-proofs',
  'prisma/',
]

const FORBIDDEN_EXACT_PATHS = new Set([
  'middleware.ts',
  'package.json',
  'pnpm-lock.yaml',
])

function normalizePath(value) {
  return value.replace(/\\/g, '/').trim()
}

function parseStatusPath(line) {
  const rawPath = line.slice(3).trim()
  if (!rawPath) return []

  if (rawPath.includes(' -> ')) {
    return rawPath.split(' -> ').map(normalizePath).filter(Boolean)
  }

  return [normalizePath(rawPath)]
}

function isMarketplacePath(filePath) {
  return filePath.split('/').some((segment) => segment.toLowerCase() === 'marketplace')
}

function hasMpSegment(filePath) {
  return filePath.split('/').some((segment) => /^Mp[A-Za-z0-9_-]*/.test(segment))
}

function isForbiddenPath(filePath) {
  if (FORBIDDEN_EXACT_PATHS.has(filePath)) return true
  if (isMarketplacePath(filePath)) return true
  if (hasMpSegment(filePath)) return true
  return FORBIDDEN_PREFIXES.some((prefix) => filePath.startsWith(prefix))
}

function getChangedFiles() {
  const status = execSync('git status --short --untracked-files=all', {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  return status
    .split(/\r?\n/)
    .flatMap(parseStatusPath)
    .filter(Boolean)
}

function main() {
  console.log('[ORESHNIK] Running preflight path check...')

  let changedFiles
  try {
    changedFiles = getChangedFiles()
  } catch (error) {
    console.error('[ORESHNIK] Could not read git status.')
    console.error(error instanceof Error ? error.message : String(error))
    process.exit(1)
  }

  const violations = [...new Set(changedFiles.filter(isForbiddenPath))]

  if (violations.length > 0) {
    console.error('[ORESHNIK] Forbidden zones modified:')
    for (const violation of violations) {
      console.error(`- ${violation}`)
    }
    console.error('Review required before commit.')
    process.exit(1)
  }

  console.log('[ORESHNIK] OK: no forbidden zones modified.')
}

main()
