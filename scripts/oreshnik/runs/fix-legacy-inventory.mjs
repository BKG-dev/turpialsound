import { PrismaClient } from '@prisma/client'
const p = new PrismaClient()
const r = await p.mpListing.updateMany({
  where: { OR: [{ hasInventory: { not: true } }, { hasInventory: null }, { inventory: null }] },
  data: { hasInventory: true, inventory: 1 }
})
console.log('Updated', r.count, 'legacy listings to inventory=1')
await p.$disconnect()
