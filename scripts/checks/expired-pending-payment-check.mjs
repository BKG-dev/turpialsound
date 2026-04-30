#!/usr/bin/env node

const SCRIPT_LABEL = 'expired-pending-payment-check'
const DEFAULT_LIMIT = 50
const DEFAULT_PAYMENT_WINDOW_MINUTES = 60
const OPERATIONAL_STATUS_PATTERN =
  /\[ops_status:(submitted|pending_payment|payment_reported|payment_verified|confirmed|cancelled|expired)\]/i
const EXPIRABLE_OPERATIONAL_STATUSES = new Set(['pending_payment'])

function printHelp() {
  console.log(`
${SCRIPT_LABEL}

Inspeccion read-only para reservas pending_payment reales que ya excedieron la ventana de pago.
No modifica datos, no dispara emails y no sincroniza Google Calendar.
Excluye payment_reported y reservas con comprobante activo.

Uso:
  node scripts/checks/expired-pending-payment-check.mjs --confirm-local-db

Opciones:
  --confirm-local-db        Requerido para consultar la DB.
  --limit=<n>               Maximo de filas under_review a inspeccionar. Default: ${DEFAULT_LIMIT}
  --window-minutes=<n>      Ventana de pago en minutos. Default: env o ${DEFAULT_PAYMENT_WINDOW_MINUTES}
  --help                    Muestra esta ayuda.

Seguridad:
  - DATABASE_URL debe estar definido en el entorno actual.
  - La DB debe clasificarse claramente como local/test/dev.
  - No imprime DATABASE_URL ni secretos.
`)
}

function parseArgs(argv) {
  const args = {
    confirmLocalDb: false,
    help: false,
    limit: DEFAULT_LIMIT,
    windowMinutes: null,
  }

  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      args.help = true
      continue
    }

    if (arg === '--confirm-local-db') {
      args.confirmLocalDb = true
      continue
    }

    if (arg.startsWith('--limit=')) {
      args.limit = Number(arg.slice('--limit='.length))
      continue
    }

    if (arg.startsWith('--window-minutes=')) {
      args.windowMinutes = Number(arg.slice('--window-minutes='.length))
      continue
    }

    throw new Error(`Argumento no reconocido: ${arg}`)
  }

  if (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 500) {
    throw new Error('--limit debe ser un entero entre 1 y 500.')
  }

  if (
    args.windowMinutes !== null &&
    (!Number.isInteger(args.windowMinutes) || args.windowMinutes < 1)
  ) {
    throw new Error('--window-minutes debe ser un entero positivo.')
  }

  return args
}

function readPaymentWindowMinutes(args) {
  if (args.windowMinutes !== null) {
    return args.windowMinutes
  }

  const raw =
    process.env.BOOKINGS_PAYMENT_WINDOW_MINUTES ?? process.env.PAYMENT_WINDOW_MINUTES ?? ''
  const value = Number(raw)
  return Number.isInteger(value) && value > 0 ? value : DEFAULT_PAYMENT_WINDOW_MINUTES
}

function classifyDatabaseUrl(raw) {
  try {
    const url = new URL(raw)
    const host = url.hostname.toLowerCase()
    const database = url.pathname.toLowerCase()
    const joined = `${host} ${database}`
    const hasProductionHint = /prod|production|main|live/.test(joined)
    const hasLocalHint =
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host.endsWith('.local') ||
      /(^|[^a-z])test([^a-z]|$)|(^|[^a-z])dev([^a-z]|$)|shadow|branch\/dev/.test(joined)
    const hasRemoteHint =
      /neon|supabase|amazonaws|railway|render|fly\.io|digitalocean|azure|gcp|cloud|vercel/.test(
        joined,
      )

    if (hasProductionHint) return 'produccion'
    if (hasLocalHint) return 'local/test/dev'
    if (hasRemoteHint) return 'sospechoso'
    return 'sospechoso'
  } catch {
    return 'sospechoso'
  }
}

function assertSafeEnvironment(args) {
  if (!args.confirmLocalDb) {
    throw new Error('Falta --confirm-local-db. No se consulta la DB sin confirmacion local/test.')
  }

  if (process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production') {
    throw new Error('Entorno production detectado. Checker bloqueado.')
  }

  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL no esta definido en el entorno.')
  }

  const classification = classifyDatabaseUrl(databaseUrl)
  console.log(`[${SCRIPT_LABEL}] DATABASE_URL: presente`)
  console.log(`[${SCRIPT_LABEL}] Clasificacion DB: ${classification}`)

  if (classification !== 'local/test/dev') {
    throw new Error('DB no clasificada como local/test/dev. Checker bloqueado por seguridad.')
  }

  return databaseUrl
}

function sanitizeErrorMessage(error, databaseUrl) {
  const message = error instanceof Error ? error.message : String(error)
  return message
    .replaceAll(databaseUrl, '[DATABASE_URL_REDACTED]')
    .replace(/:\/\/[^@\s]+@/g, '://[REDACTED]@')
}

function getOperationalStatus(internalNotes) {
  if (!internalNotes) return null
  const match = internalNotes.match(OPERATIONAL_STATUS_PATTERN)
  return match ? match[1].toLowerCase() : null
}

function getDeadline(createdAt, paymentWindowMinutes) {
  return new Date(createdAt.getTime() + paymentWindowMinutes * 60 * 1000)
}

async function createPgClient(databaseUrl) {
  const pg = await import('pg')
  const Client = pg.default?.Client ?? pg.Client
  return new Client({ connectionString: databaseUrl })
}

async function inspectExpiredPendingPayments(args) {
  const databaseUrl = assertSafeEnvironment(args)
  const paymentWindowMinutes = readPaymentWindowMinutes(args)
  const now = new Date()
  const client = await createPgClient(databaseUrl)

  console.log(`[${SCRIPT_LABEL}] Ventana de pago: ${paymentWindowMinutes} minutos`)
  console.log(`[${SCRIPT_LABEL}] Inspeccion read-only: ${now.toISOString()}`)

  try {
    await client.connect()

    const response = await client.query(
      `
        SELECT
          br.id,
          br."publicCode",
          br."createdAt",
          br."internalNotes",
          EXISTS (
            SELECT 1
            FROM payment_proofs pp
            WHERE pp."bookingRequestId" = br.id
              AND pp."isActive" = true
          ) AS "hasActivePaymentProof"
        FROM booking_requests br
        WHERE br.status = 'under_review'
        ORDER BY br."createdAt" ASC
        LIMIT $1
      `,
      [args.limit],
    )

    const rows = response.rows.map((row) => {
      const createdAt = row.createdAt instanceof Date ? row.createdAt : new Date(row.createdAt)
      const deadline = getDeadline(createdAt, paymentWindowMinutes)
      const operationalStatus = getOperationalStatus(row.internalNotes)
      return {
        publicCode: row.publicCode,
        createdAt,
        deadline,
        operationalStatus,
        hasActivePaymentProof: Boolean(row.hasActivePaymentProof),
        isExpired: deadline.getTime() <= now.getTime(),
        isExpirableStatus:
          operationalStatus === null || EXPIRABLE_OPERATIONAL_STATUSES.has(operationalStatus),
      }
    })

    const expiredCandidates = rows.filter(
      (row) => row.isExpired && row.isExpirableStatus && !row.hasActivePaymentProof,
    )
    const protectedByPaymentReport = rows.filter(
      (row) => row.isExpired && (row.operationalStatus === 'payment_reported' || row.hasActivePaymentProof),
    )

    console.log(`[${SCRIPT_LABEL}] under_review inspeccionadas: ${rows.length}`)
    console.log(`[${SCRIPT_LABEL}] candidatas vencidas: ${expiredCandidates.length}`)
    console.log(
      `[${SCRIPT_LABEL}] protegidas por pago reportado/comprobante activo: ${protectedByPaymentReport.length}`,
    )

    if (expiredCandidates.length > 0) {
      console.table(
        expiredCandidates.map((row) => ({
          publicCode: row.publicCode,
          operationalStatus: row.operationalStatus ?? 'untagged',
          hasActivePaymentProof: row.hasActivePaymentProof ? 'yes' : 'no',
          createdAt: row.createdAt.toISOString(),
          deadline: row.deadline.toISOString(),
        })),
      )
    }
  } catch (error) {
    console.error(`[${SCRIPT_LABEL}] Error read-only: ${sanitizeErrorMessage(error, databaseUrl)}`)
    process.exitCode = 1
  } finally {
    await client.end().catch(() => undefined)
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  if (args.help) {
    printHelp()
    return
  }

  await inspectExpiredPendingPayments(args)
}

void main().catch((error) => {
  console.error(`[${SCRIPT_LABEL}] Error fatal: ${error instanceof Error ? error.message : String(error)}`)
  process.exit(1)
})
