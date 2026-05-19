import { readFileSync } from 'fs'
import pg from 'pg'
const { Client } = pg

function parseEnvDotfile(path) {
  const env = {}
  const content = readFileSync(path, 'utf8')
  for (const line of content.split('\n')) {
    const m = line.match(/^([A-Z_]+)=(.*)$/)
    if (m) env[m[1]] = m[2].trim()
  }
  return env
}

const envPath = process.argv[2] || '.env.vercel-preview-branch'
const env = parseEnvDotfile(envPath)
// DIRECT_URL apunta a Vercel internal (inaccesible desde local)
// DATABASE_URL apunta a Neon pooler (accesible)
const url = env.DATABASE_URL

if (!url) { console.error('No DB URL found'); process.exit(1) }

const client = new Client({ connectionString: url })

async function main() {
  await client.connect()
  
  const hostname = new URL(url).hostname
  console.log('DB hostname:', hostname)
  
  const { rows: [fp] } = await client.query('SELECT current_database() AS db, current_schema() AS schema, current_user AS usr, inet_server_addr() AS server_addr')
  console.log('DB:', fp.db, '| schema:', fp.schema, '| user:', fp.usr, '| addr:', fp.server_addr)

  const { rows: [{ exists: mp_tx }] } = await client.query("SELECT to_regclass('public.mp_transactions') IS NOT NULL AS exists")
  const { rows: [{ exists: mp_o }] } = await client.query("SELECT to_regclass('public.mp_orders') IS NOT NULL AS exists")
  console.log('mp_transactions table:', mp_tx, '| mp_orders table:', mp_o)

  const { rows: cols } = await client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_schema='public' AND table_name='mp_transactions' AND column_name IN ('orderId','orderid','quantity','unitPrice','unitprice') ORDER BY column_name")
  console.log('Columns found:', JSON.stringify(cols.map(c => c.column_name)))

  const { rows: migs } = await client.query("SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations WHERE migration_name IN ('20260517_marketplace_consolidated_orders','20260518_ensure_order_quantity_columns') ORDER BY started_at")
  for (const m of migs) {
    console.log('Migration:', m.migration_name, '| finished:', !!m.finished_at, '| rolled_back:', !!m.rolled_back_at)
  }

  await client.end()
}

main().catch(e => { console.error(e.message); process.exit(1) })
