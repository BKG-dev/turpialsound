#!/usr/bin/env node

const HELP_TEXT = `
Turpial Sound env readiness check

Usage:
  node scripts/checks/env-readiness-check.mjs [--help] [--strict] [--json]

Options:
  --help     Show this help.
  --strict   Exit with code 1 when any critical variable is missing in any env.
  --json     Print machine-readable JSON without secret values.

Safety:
  - Reads only process.env.
  - Does not print env values.
  - Does not connect to DB.
  - Does not send emails.
  - Does not call external APIs.
`

const args = new Set(process.argv.slice(2))

if (args.has('--help') || args.has('-h')) {
  console.log(HELP_TEXT.trim())
  process.exit(0)
}

const knownArgs = new Set(['--strict', '--json'])
const unknownArgs = [...args].filter((arg) => !knownArgs.has(arg))
if (unknownArgs.length > 0) {
  console.error(`Unknown option: ${unknownArgs.join(', ')}`)
  console.error('Run with --help for usage.')
  process.exit(2)
}

const strictMode = args.has('--strict')
const jsonMode = args.has('--json')

const ENV_GROUPS = [
  {
    name: 'database',
    description: 'Runtime DB and Prisma CLI datasource.',
    variables: [
      {
        key: 'DATABASE_URL',
        required: true,
        critical: true,
        secret: true,
        purpose: 'Runtime database connection used by the application and Prisma client.',
        classify: 'databaseUrl',
      },
      {
        key: 'DIRECT_URL',
        required: true,
        critical: true,
        secret: true,
        purpose: 'Direct datasource used by Prisma CLI through prisma.config.ts.',
        classify: 'databaseUrl',
      },
    ],
  },
  {
    name: 'booking core',
    description: 'Public booking flow. No dedicated env vars detected in the inspected scope.',
    variables: [],
  },
  {
    name: 'pagos manuales',
    description: 'Visible manual payment instructions shown in /reservas.',
    variables: [
      {
        key: 'BOOKINGS_PAYMENT_MOBILE_ID_TYPE',
        required: false,
        critical: false,
        secret: false,
        purpose: 'Pago Movil beneficiary document type.',
      },
      {
        key: 'BOOKINGS_PAYMENT_MOBILE_ID_NUMBER',
        required: false,
        critical: false,
        secret: false,
        purpose: 'Pago Movil beneficiary document number.',
      },
      {
        key: 'BOOKINGS_PAYMENT_MOBILE_BANK',
        required: false,
        critical: false,
        secret: false,
        purpose: 'Pago Movil bank label.',
      },
      {
        key: 'BOOKINGS_PAYMENT_MOBILE_PHONE',
        required: false,
        critical: false,
        secret: false,
        purpose: 'Pago Movil phone number.',
      },
      {
        key: 'BOOKINGS_BANK_TRANSFER_BANK',
        required: false,
        critical: false,
        secret: false,
        purpose: 'Bank transfer bank label.',
      },
      {
        key: 'BOOKINGS_BANK_TRANSFER_ACCOUNT_NUMBER',
        required: false,
        critical: false,
        secret: false,
        purpose: 'Bank transfer account number.',
      },
      {
        key: 'BOOKINGS_BANK_TRANSFER_BENEFICIARY',
        required: false,
        critical: false,
        secret: false,
        purpose: 'Bank transfer account holder.',
      },
      {
        key: 'BOOKINGS_BINANCE_PAY_ID',
        required: false,
        critical: false,
        secret: false,
        purpose: 'Binance Pay ID shown to customers.',
      },
      {
        key: 'BOOKINGS_BINANCE_PHONE',
        required: false,
        critical: false,
        secret: false,
        purpose: 'Binance phone reference shown to customers.',
      },
    ],
  },
  {
    name: 'email Resend',
    description: 'Booking notifications to customers and Turpial Sound.',
    variables: [
      {
        key: 'RESEND_API_KEY',
        required: true,
        critical: true,
        secret: true,
        purpose: 'Resend API key for transactional booking email.',
      },
      {
        key: 'BOOKINGS_EMAIL_FROM',
        required: true,
        critical: true,
        secret: false,
        purpose: 'Verified sender used by booking notifications.',
      },
      {
        key: 'BOOKINGS_EMAIL_REPLY_TO',
        required: false,
        critical: false,
        secret: false,
        purpose: 'Optional reply-to address for customer/admin email.',
      },
      {
        key: 'BOOKINGS_ADMIN_NOTIFICATIONS_EMAIL',
        required: true,
        critical: true,
        secret: false,
        purpose: 'Internal recipient for payment verification and ops alerts.',
      },
    ],
  },
  {
    name: 'Google Calendar',
    description: 'Central operational calendar sync for bookings.',
    variables: [
      {
        key: 'GOOGLE_CLIENT_ID',
        required: true,
        critical: true,
        secret: false,
        purpose: 'Google OAuth client ID.',
      },
      {
        key: 'GOOGLE_CLIENT_SECRET',
        required: true,
        critical: true,
        secret: true,
        purpose: 'Google OAuth client secret.',
      },
      {
        key: 'GOOGLE_REFRESH_TOKEN',
        required: true,
        critical: true,
        secret: true,
        purpose: 'Refresh token for the central calendar account.',
      },
      {
        key: 'GOOGLE_CALENDAR_ID',
        required: true,
        critical: true,
        secret: false,
        purpose: 'Central operational calendar ID.',
      },
      {
        key: 'GOOGLE_CALENDAR_TIMEZONE',
        required: true,
        critical: true,
        secret: false,
        purpose: 'Calendar timezone, expected America/Caracas.',
        expected: 'America/Caracas',
      },
    ],
  },
  {
    name: 'Blob/proofs',
    description: 'Private payment proof uploads.',
    variables: [
      {
        key: 'BLOB_READ_WRITE_TOKEN',
        required: true,
        critical: true,
        secret: true,
        purpose: 'Vercel Blob token required to upload private JPG payment proofs.',
      },
    ],
  },
  {
    name: 'BCV/rates',
    description: 'Reference exchange rate providers and guardrails.',
    variables: [
      {
        key: 'RATE_SOURCE_A_NAME',
        required: false,
        critical: false,
        secret: false,
        purpose: 'Optional display name for rate source A.',
      },
      {
        key: 'RATE_SOURCE_A_URL',
        required: false,
        critical: false,
        secret: false,
        purpose: 'Optional CSV URL for rate source A; code has a fallback.',
      },
      {
        key: 'RATE_SOURCE_B_NAME',
        required: false,
        critical: false,
        secret: false,
        purpose: 'Optional display name for rate source B.',
      },
      {
        key: 'RATE_SOURCE_B_URL',
        required: false,
        critical: false,
        secret: false,
        purpose: 'Optional JSON URL for rate source B; code has a fallback.',
      },
      {
        key: 'RATE_SOURCE_B_PATH',
        required: false,
        critical: false,
        secret: false,
        purpose: 'Optional dot path for rate source B JSON payload.',
      },
      {
        key: 'RATE_SOURCE_C_NAME',
        required: false,
        critical: false,
        secret: false,
        purpose: 'Optional display name for provider C.',
      },
      {
        key: 'RATE_SOURCE_C_URL',
        required: false,
        critical: false,
        secret: false,
        purpose: 'Optional URL for provider C.',
      },
      {
        key: 'RATE_SOURCE_C_FORMAT',
        required: false,
        critical: false,
        secret: false,
        purpose: 'Optional provider C format: json or csv.',
      },
      {
        key: 'RATE_SOURCE_C_PATH',
        required: false,
        critical: false,
        secret: false,
        purpose: 'Optional provider C JSON dot path.',
      },
      {
        key: 'RATE_DELTA_PCT',
        required: false,
        critical: false,
        secret: false,
        purpose: 'Optional consensus tolerance percentage.',
      },
      {
        key: 'RATE_MAX_JUMP_PCT',
        required: false,
        critical: false,
        secret: false,
        purpose: 'Optional maximum accepted jump vs last good rate.',
      },
      {
        key: 'RATE_LAST_GOOD_MIN_PERSIST_SECONDS',
        required: false,
        critical: false,
        secret: false,
        purpose: 'Optional persistence throttle for last good consensus.',
      },
      {
        key: 'BCV_EMERGENCY_FALLBACK_RATE',
        required: false,
        critical: false,
        secret: false,
        purpose: 'Optional emergency fallback rate.',
      },
      {
        key: 'BCV_FALLBACK_RATE',
        required: false,
        critical: false,
        secret: false,
        purpose: 'Legacy fallback rate if BCV_EMERGENCY_FALLBACK_RATE is not set.',
      },
      {
        key: 'ADMIN_API_TOKEN',
        required: false,
        critical: false,
        secret: true,
        purpose: 'Optional bearer/api-key passed to JSON rate providers that need auth.',
      },
    ],
  },
  {
    name: 'WhatsApp',
    description: 'Automatic WhatsApp remains out of scope; no env vars detected in the inspected scope.',
    variables: [],
  },
  {
    name: 'cron expiracion',
    description: 'Internal endpoint protection for pending_payment expiration.',
    variables: [
      {
        key: 'BOOKINGS_EXPIRE_CRON_SECRET',
        required: true,
        critical: true,
        secret: true,
        purpose: 'Bearer secret required by POST /api/bookings/expire.',
      },
    ],
  },
]

function readEnv(name) {
  const value = process.env[name]
  if (typeof value !== 'string') return ''
  return value.trim()
}

function isPresent(name) {
  return readEnv(name).length > 0
}

function classifyDatabaseUrl(value) {
  if (!value) return 'no disponible'

  const normalized = value.toLowerCase()
  const productionSignals = [
    'prod',
    'production',
    'live',
    'main',
    'primary',
  ]
  const localSignals = [
    'localhost',
    '127.0.0.1',
    '::1',
    'turpial_atomicity_test',
    'test',
    'testing',
    'dev',
    'development',
    'shadow',
    'branch/dev',
  ]

  if (productionSignals.some((signal) => normalized.includes(signal))) {
    return 'produccion/sospechoso'
  }

  if (localSignals.some((signal) => normalized.includes(signal))) {
    return 'local/test/dev'
  }

  if (
    normalized.includes('neon.tech') ||
    normalized.includes('supabase.co') ||
    normalized.includes('render.com') ||
    normalized.includes('railway.app') ||
    normalized.includes('amazonaws.com') ||
    normalized.includes('azure.com') ||
    normalized.includes('gcp') ||
    normalized.includes('cloudsql')
  ) {
    return 'remoto/sospechoso'
  }

  return 'desconocido/sospechoso'
}

function classifyExpectedValue(item, present) {
  if (!present || !item.expected) return null
  return readEnv(item.key) === item.expected ? 'ok' : `esperado: ${item.expected}`
}

function envContext() {
  const nodeEnv = readEnv('NODE_ENV') || 'unset'
  const vercelEnv = readEnv('VERCEL_ENV') || 'unset'
  const isProduction = nodeEnv === 'production' || vercelEnv === 'production'

  return { nodeEnv, vercelEnv, isProduction }
}

function buildReport() {
  const context = envContext()
  const groups = ENV_GROUPS.map((group) => {
    const variables = group.variables.map((item) => {
      const present = isPresent(item.key)
      const classification =
        item.classify === 'databaseUrl' ? classifyDatabaseUrl(readEnv(item.key)) : null
      const expected = classifyExpectedValue(item, present)

      return {
        key: item.key,
        present,
        required: item.required,
        critical: item.critical,
        secret: item.secret,
        purpose: item.purpose,
        classification,
        expected,
      }
    })

    return {
      name: group.name,
      description: group.description,
      variables,
    }
  })

  const missingCritical = groups.flatMap((group) =>
    group.variables
      .filter((item) => item.critical && !item.present)
      .map((item) => ({ group: group.name, key: item.key })),
  )
  const missingRequired = groups.flatMap((group) =>
    group.variables
      .filter((item) => item.required && !item.present)
      .map((item) => ({ group: group.name, key: item.key })),
  )
  const expectedWarnings = groups.flatMap((group) =>
    group.variables
      .filter((item) => item.expected && item.expected !== 'ok')
      .map((item) => ({ group: group.name, key: item.key, expected: item.expected })),
  )

  const shouldFail = (context.isProduction && missingCritical.length > 0) || (strictMode && missingCritical.length > 0)
  const status = shouldFail ? 'blocked' : missingCritical.length > 0 ? 'warning' : 'ready'

  return {
    context,
    strictMode,
    status,
    groups,
    missingCritical,
    missingRequired,
    expectedWarnings,
  }
}

function printHumanReport(report) {
  console.log('Turpial Sound env readiness')
  console.log(`NODE_ENV: ${report.context.nodeEnv}`)
  console.log(`VERCEL_ENV: ${report.context.vercelEnv}`)
  console.log(`Mode: ${report.context.isProduction ? 'production' : 'non-production'}`)
  console.log(`Status: ${report.status}`)
  console.log('')

  for (const group of report.groups) {
    console.log(`[${group.name}] ${group.description}`)

    if (group.variables.length === 0) {
      console.log('- no env vars inventoried')
    }

    for (const item of group.variables) {
      const state = item.present ? 'present' : 'missing'
      const requirement = item.critical ? 'critical' : item.required ? 'required' : 'optional'
      const secretLabel = item.secret ? 'secret' : 'non-secret'
      const extra = []

      if (item.classification) extra.push(`classification=${item.classification}`)
      if (item.expected) extra.push(`check=${item.expected}`)

      const suffix = extra.length > 0 ? ` (${extra.join(', ')})` : ''
      console.log(`- ${item.key}: ${state} | ${requirement} | ${secretLabel}${suffix}`)
    }

    console.log('')
  }

  if (report.missingCritical.length > 0) {
    console.log('Missing critical variables:')
    for (const item of report.missingCritical) {
      console.log(`- ${item.key} (${item.group})`)
    }
    console.log('')
  }

  if (report.expectedWarnings.length > 0) {
    console.log('Configuration warnings:')
    for (const item of report.expectedWarnings) {
      console.log(`- ${item.key} (${item.group}): ${item.expected}`)
    }
    console.log('')
  }

  if (report.status === 'blocked') {
    console.log('Result: blocked. Production/strict readiness requires all critical variables.')
    return
  }

  if (report.status === 'warning') {
    console.log('Result: warning. Non-production can continue, but production is not ready.')
    return
  }

  console.log('Result: ready. All critical variables are present.')
}

const report = buildReport()

if (jsonMode) {
  console.log(JSON.stringify(report, null, 2))
} else {
  printHumanReport(report)
}

process.exit(report.status === 'blocked' ? 1 : 0)
