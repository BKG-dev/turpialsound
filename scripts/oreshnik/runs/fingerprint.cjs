const fs = require('fs')
const { Client } = require('pg')

const c = fs.readFileSync('.env.local', 'utf8')
const m = c.match(/DATABASE_URL="(.+?)"/) || c.match(/DATABASE_URL=(.+)/)
const url = (m[1] || m[2]).replace(/&channel_binding=[^&\s"]+/g, '')

console.log('Connecting to:', url.replace(/\/\/.*@/, '//***@'))

const cl = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })
cl.connect().then(async () => {
  const r1 = await cl.query("SELECT to_regclass('public.mp_transactions') as mp, to_regclass('public.mp_orders') as mo")
  console.log('Tables:', JSON.stringify(r1.rows[0]))

  const r2 = await cl.query("SELECT column_name FROM information_schema.columns WHERE table_name='mp_transactions' AND column_name IN ('orderId','quantity','unitPrice')")
  console.log('Columns:', JSON.stringify(r2.rows.map(c => c.column_name)))

  const r3 = await cl.query("SELECT migration_name, finished_at, rolled_back_at FROM _prisma_migrations WHERE migration_name IN ('20260517_marketplace_consolidated_orders','20260518_ensure_order_quantity_columns') ORDER BY started_at")
  for (const m of r3.rows) {
    console.log('Migration:', m.migration_name, '| finished:', !!m.finished_at, '| rolled_back:', !!m.rolled_back_at)
  }

  cl.end()
}).catch(e => { console.error('Error:', e.message); process.exit(1) })
