import { getDb } from '../../lib/marketplace/db'

async function main() {
  const db = await getDb()
  if (!db) {
    console.log('No database connection')
    process.exit(1)
  }

  const r = await db.mpListing.updateMany({
    where: {
      inventory: null
    },
    data: {
      inventory: 1
    }
  })

  console.log('Updated', r.count, 'legacy listings to inventory=1')
  await db.$disconnect()
}

main().catch(e => { console.error(e.message); process.exit(1) })
