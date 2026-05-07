import { Client } from 'pg'

type Level = 'PASS' | 'WARN' | 'FAIL'

type UrlFingerprint = {
  present: boolean
  hostHint: string
  databaseHint: string
  pooler: boolean
  sslmodePresent: boolean
  parseError?: string
}

type TableCheck = {
  table: string
  exists: boolean
}

type HttpCheck = {
  path: string
  ok: boolean
  status: number | null
  error?: string
}

type SummaryCode =
  | 'OK'
  | 'ZERO_ACTIVE'
  | 'QUERY_ERROR'
  | 'HTTP_ERROR'
  | 'PROBABLE_DB_TARGET_MISMATCH'

function hostHint(hostname: string): string {
  if (!hostname) return 'n/a'
  const parts = hostname.split('.').filter(Boolean)
  if (parts.length <= 2) return hostname
  const tail = parts.slice(-2).join('.')
  const head = parts[0]
  return `${head}.***.${tail}`
}

function databaseHint(pathname: string): string {
  const dbName = pathname.replace(/^\//, '').trim()
  if (!dbName) return 'n/a'
  if (dbName.length <= 6) return dbName
  return `${dbName.slice(0, 2)}***${dbName.slice(-2)}`
}

function safeFingerprint(raw: string | undefined): UrlFingerprint {
  if (!raw) {
    return {
      present: false,
      hostHint: 'missing',
      databaseHint: 'missing',
      pooler: false,
      sslmodePresent: false,
    }
  }

  try {
    const parsed = new URL(raw)
    const host = parsed.hostname.toLowerCase()
    const sslmodePresent = parsed.searchParams.has('sslmode')
    const pooler = /pooler|pool/.test(host)

    return {
      present: true,
      hostHint: hostHint(host),
      databaseHint: databaseHint(parsed.pathname),
      pooler,
      sslmodePresent,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown parse error'
    return {
      present: true,
      hostHint: 'parse-error',
      databaseHint: 'parse-error',
      pooler: false,
      sslmodePresent: false,
      parseError: message,
    }
  }
}

function likelySameTarget(db: UrlFingerprint, direct: UrlFingerprint): 'yes' | 'no' | 'inconclusive' {
  if (!db.present || !direct.present || db.parseError || direct.parseError) return 'inconclusive'
  if (db.databaseHint === 'n/a' || direct.databaseHint === 'n/a') return 'inconclusive'

  const hostComparableA = db.hostHint.split('.***.').pop() ?? db.hostHint
  const hostComparableB = direct.hostHint.split('.***.').pop() ?? direct.hostHint
  const sameDbHint = db.databaseHint === direct.databaseHint
  const sameHostTail = hostComparableA === hostComparableB

  if (sameDbHint && sameHostTail) return 'yes'
  if (!sameDbHint && !sameHostTail) return 'no'
  return 'inconclusive'
}

function parseArg(name: string): string | undefined {
  const args = process.argv.slice(2)
  const exact = args.find((arg) => arg.startsWith(`--${name}=`))
  if (exact) return exact.split('=').slice(1).join('=')

  const idx = args.findIndex((arg) => arg === `--${name}`)
  if (idx >= 0 && args[idx + 1]) return args[idx + 1]

  return undefined
}

function parseFlag(name: string): boolean {
  return process.argv.slice(2).includes(`--${name}`)
}

async function queryDbMetadata(connectionString: string): Promise<{
  queryError: string | null
  mpTableCount: number | null
  required: TableCheck[]
  activeListings: number | null
}> {
  const requiredTableNames = [
    'mp_listings',
    'mp_users',
    'booking_requests',
    'payment_proofs',
    'services',
    'resources',
  ]

  const requiredDefault: TableCheck[] = requiredTableNames.map((table) => ({ table, exists: false }))

  const client = new Client({ connectionString })

  try {
    await client.connect()

    const existsResult = await client.query<{
      table_name: string
      exists: boolean
    }>(
      `
      SELECT x.table_name,
             EXISTS (
               SELECT 1
               FROM information_schema.tables t
               WHERE t.table_schema = 'public'
                 AND t.table_name = x.table_name
             ) AS exists
      FROM unnest($1::text[]) AS x(table_name)
      ORDER BY x.table_name;
    `,
      [requiredTableNames],
    )

    const mpCountResult = await client.query<{ total: string }>(
      `
      SELECT COUNT(*)::text AS total
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE 'mp\\_%' ESCAPE '\\';
    `,
    )

    const required = requiredTableNames.map((name) => {
      const row = existsResult.rows.find((r: { table_name: string; exists: boolean }) => r.table_name === name)
      return { table: name, exists: Boolean(row?.exists) }
    })

    const hasMpListings = required.find((t) => t.table === 'mp_listings')?.exists ?? false

    let activeListings: number | null = null
    if (hasMpListings) {
      try {
        const activeRes = await client.query<{ total: string }>(
          `SELECT COUNT(*)::text AS total FROM public.mp_listings WHERE status = 'ACTIVE';`,
        )
        activeListings = Number(activeRes.rows[0]?.total ?? 0)
      } catch {
        activeListings = null
      }
    }

    return {
      queryError: null,
      mpTableCount: Number(mpCountResult.rows[0]?.total ?? 0),
      required,
      activeListings,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown query error'
    return {
      queryError: message,
      mpTableCount: null,
      required: requiredDefault,
      activeListings: null,
    }
  } finally {
    await client.end().catch(() => undefined)
  }
}

async function runHttpSmoke(baseUrl: string): Promise<HttpCheck[]> {
  const paths = ['/marketplace', '/reservas', '/api/bcv-rate', '/admin/login', '/ops/payment-review']
  const checks: HttpCheck[] = []

  for (const path of paths) {
    const url = new URL(path, baseUrl).toString()
    try {
      const res = await fetch(url, { redirect: 'manual' })
      checks.push({ path, ok: res.status >= 200 && res.status < 400, status: res.status })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown http error'
      checks.push({ path, ok: false, status: null, error: message })
    }
  }

  return checks
}

function deriveConclusion(params: {
  dbQueryError: string | null
  mpTableCount: number | null
  required: TableCheck[]
  activeListings: number | null
  http: HttpCheck[]
}): { level: Level; code: SummaryCode; notes: string[] } {
  const notes: string[] = []

  if (params.dbQueryError) {
    notes.push('DB metadata query failed (QUERY_ERROR).')
    return { level: 'FAIL', code: 'QUERY_ERROR', notes }
  }

  const hasMpListings = params.required.find((t) => t.table === 'mp_listings')?.exists ?? false
  const hasMpUsers = params.required.find((t) => t.table === 'mp_users')?.exists ?? false
  const missingCriticalMp = !hasMpListings || !hasMpUsers || (params.mpTableCount ?? 0) === 0

  if (missingCriticalMp) {
    notes.push('Marketplace empty + P2021 + missing mp_* => probable DB target incorrecto.')
    return { level: 'FAIL', code: 'PROBABLE_DB_TARGET_MISMATCH', notes }
  }

  if (params.activeListings === 0) {
    notes.push('mp_* existe pero ACTIVE=0 => probable ZERO_ACTIVE o issue de datos.')
    return { level: 'WARN', code: 'ZERO_ACTIVE', notes }
  }

  const httpFailures = params.http.filter((h) => !h.ok)
  if (httpFailures.length > 0) {
    const labels = httpFailures.map((f) => `${f.path} (${f.status ?? f.error ?? 'error'})`)
    notes.push(`HTTP smoke failures: ${labels.join(', ')}`)
    return { level: 'WARN', code: 'HTTP_ERROR', notes }
  }

  notes.push('DB target y metadata lucen consistentes para preview runtime guard.')
  return { level: 'PASS', code: 'OK', notes }
}

function printSection(title: string): void {
  console.log(`\n=== ${title} ===`)
}

async function main(): Promise<void> {
  const databaseUrl = process.env.DATABASE_URL
  const directUrl = process.env.DIRECT_URL
  const baseUrl = parseArg('base-url')
  const shouldSmoke = parseFlag('smoke-http') || Boolean(baseUrl)

  const dbFp = safeFingerprint(databaseUrl)
  const directFp = safeFingerprint(directUrl)
  const sameTarget = likelySameTarget(dbFp, directFp)

  printSection('Preview Runtime Guard')
  console.log(`Timestamp: ${new Date().toISOString()}`)

  printSection('DATABASE_URL Fingerprint (safe)')
  console.log(JSON.stringify(dbFp, null, 2))

  printSection('DIRECT_URL Fingerprint (safe)')
  console.log(JSON.stringify(directFp, null, 2))

  printSection('Safe Comparison')
  console.log(
    JSON.stringify(
      {
        sameProjectOrDatabaseLikely: sameTarget,
        databaseUrlLooksPooled: dbFp.pooler ? 'yes' : 'no',
        directUrlLooksDirectNoPooler: directFp.pooler ? 'no' : 'yes',
      },
      null,
      2,
    ),
  )

  let dbMetadata: {
    queryError: string | null
    mpTableCount: number | null
    required: TableCheck[]
    activeListings: number | null
  } = {
    queryError: 'DATABASE_URL missing',
    mpTableCount: null as number | null,
    required: [
      'mp_listings',
      'mp_users',
      'booking_requests',
      'payment_proofs',
      'services',
      'resources',
    ].map((table) => ({ table, exists: false })),
    activeListings: null as number | null,
  }

  if (databaseUrl) {
    dbMetadata = await queryDbMetadata(databaseUrl)
  }

  printSection('DB Metadata')
  console.log(JSON.stringify(dbMetadata, null, 2))

  let httpResults: HttpCheck[] = []
  if (shouldSmoke) {
    if (!baseUrl) {
      httpResults = [
        {
          path: 'base-url',
          ok: false,
          status: null,
          error: 'Missing --base-url while --smoke-http is enabled',
        },
      ]
    } else {
      httpResults = await runHttpSmoke(baseUrl)
    }
  }

  if (shouldSmoke) {
    printSection('HTTP Smoke')
    console.log(JSON.stringify(httpResults, null, 2))
  }

  const conclusion = deriveConclusion({
    dbQueryError: dbMetadata.queryError,
    mpTableCount: dbMetadata.mpTableCount,
    required: dbMetadata.required,
    activeListings: dbMetadata.activeListings,
    http: httpResults,
  })

  printSection('Conclusion')
  console.log(
    JSON.stringify(
      {
        level: conclusion.level,
        code: conclusion.code,
        notes: conclusion.notes,
      },
      null,
      2,
    ),
  )
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : 'unknown fatal error'
  console.error(
    JSON.stringify(
      {
        level: 'FAIL',
        code: 'QUERY_ERROR',
        notes: [message],
      },
      null,
      2,
    ),
  )
  process.exitCode = 1
})

