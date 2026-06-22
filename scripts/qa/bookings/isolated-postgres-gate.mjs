import assert from 'node:assert/strict'
import { URL } from 'node:url'
import { Client } from 'pg'

const EXPECTED_HOSTS = new Set(['127.0.0.1', 'localhost'])
const EXPECTED_PORT = '5432'
const EXPECTED_DATABASE = 'turpial_booking_ci'
const EXPECTED_USER = 'turpial_ci'
const EXPECTED_PASSWORD = 'turpial_ci_only'

function fail(message) {
  console.error('booking_isolated_postgres_gate FAILED')
  console.error(message)
  process.exit(1)
}

function isRemoteIpHost(hostname) {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname)
}

function validateConnectionUrl(rawValue) {
  if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
    fail('TURPIAL_ISOLATED_DATABASE_URL is required.')
  }

  let url
  try {
    url = new URL(rawValue)
  } catch {
    fail('TURPIAL_ISOLATED_DATABASE_URL is not a valid URL.')
  }

  if (url.protocol !== 'postgresql:' && url.protocol !== 'postgres:') {
    fail('TURPIAL_ISOLATED_DATABASE_URL must use postgres protocol.')
  }

  const host = url.hostname.toLowerCase()
  if (host.includes('neon') || host.includes('supabase') || host.includes('vercel')) {
    fail('Remote platform hosts are not allowed for this gate.')
  }

  if (!EXPECTED_HOSTS.has(host)) {
    if (isRemoteIpHost(host)) {
      fail('Remote IP hosts are not allowed for this gate.')
    }

    fail('TURPIAL_ISOLATED_DATABASE_URL must target 127.0.0.1 or localhost.')
  }

  if (url.port !== EXPECTED_PORT) {
    fail('TURPIAL_ISOLATED_DATABASE_URL must use port 5432.')
  }

  if (url.pathname.replace(/^\//, '') !== EXPECTED_DATABASE) {
    fail('TURPIAL_ISOLATED_DATABASE_URL must target the isolated booking database.')
  }

  if (url.username !== EXPECTED_USER) {
    fail('TURPIAL_ISOLATED_DATABASE_URL must use the isolated gate user.')
  }

  if (url.password !== EXPECTED_PASSWORD) {
    fail('TURPIAL_ISOLATED_DATABASE_URL must use the isolated gate password.')
  }

  return url.toString()
}

async function main() {
  if (process.env.TURPIAL_ALLOW_ISOLATED_DB_TESTS !== 'true') {
    fail('TURPIAL_ALLOW_ISOLATED_DB_TESTS must be true.')
  }

  const connectionString = validateConnectionUrl(process.env.TURPIAL_ISOLATED_DATABASE_URL)
  const client = new Client({
    connectionString,
    ssl: false,
  })

  try {
    await client.connect()

    const identityResult = await client.query(
      'SELECT current_database() AS database, current_user AS username',
    )
    const identity = identityResult.rows[0]

    assert.equal(identity.database, EXPECTED_DATABASE)
    assert.equal(identity.username, EXPECTED_USER)

    await client.query('BEGIN')
    try {
      await client.query(
        'CREATE TEMPORARY TABLE turpial_isolation_probe (id integer not null)',
      )
      await client.query('INSERT INTO turpial_isolation_probe (id) VALUES (1)')

      const countResult = await client.query(
        'SELECT count(*)::int AS count FROM turpial_isolation_probe',
      )
      assert.equal(Number(countResult.rows[0].count), 1)

      await client.query('ROLLBACK')
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {})
      throw error
    }

    const probeResult = await client.query(
      "SELECT to_regclass('pg_temp.turpial_isolation_probe') AS regclass",
    )
    assert.equal(probeResult.rows[0].regclass, null)

    console.log('booking_isolated_postgres_gate OK')
    console.log('database: turpial_booking_ci')
    console.log('user: turpial_ci')
    console.log('rollback: verified')
  } catch (error) {
    console.error('booking_isolated_postgres_gate FAILED')
    if (error instanceof Error) {
      console.error(error.message)
    } else {
      console.error(error)
    }
    process.exitCode = 1
  } finally {
    await client.end().catch(() => {})
  }
}

await main()
