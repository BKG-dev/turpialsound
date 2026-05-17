// ─────────────────────────────────────────────────────────────────────────────
// DEV-ONLY seed: creates fixed accounts for local simulation and testing.
// NEVER runs in production — exits immediately if NODE_ENV === 'production'.
//
// Run:  npm run seed:dev
// ─────────────────────────────────────────────────────────────────────────────

import { readFileSync, existsSync } from 'fs'
import { join } from 'path'
import bcrypt from 'bcryptjs'

// Load .env.local (not loaded automatically outside Next.js)
function loadEnvFile(filename: string) {
  const p = join(process.cwd(), filename)
  if (!existsSync(p)) return
  for (const raw of readFileSync(p, 'utf-8').split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    const val = line.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
    if (key) (process.env as Record<string, string>)[key] ??= val
  }
}
loadEnvFile('.env.local')
loadEnvFile('.env')

if (process.env.NODE_ENV === 'production') {
  console.error('❌  seed-dev cannot run in production.')
  process.exit(1)
}

if (!process.env.DATABASE_URL) {
  console.error('❌  DATABASE_URL not found — check .env.local')
  process.exit(1)
}

// ─── Seed data ────────────────────────────────────────────────────────────────

const SEED_USERS = [
  // ── Superusers (developers) — full access, no commission ──────────────────
  { displayName: 'mvera',  email: 'mvera@dev.local',  passwordEnv: 'QA_ADMIN_PASSWORD', role: 'SUPER', isSeller: true },
  { displayName: 'Igor',   email: 'igor@dev.local',   passwordEnv: 'DEV_IGOR_PASSWORD', role: 'SUPER', isSeller: true },
  // ── Socios (partners) — no commission ────────────────────────────────────
  { displayName: 'frank',  email: 'frank@dev.local',  passwordEnv: 'DEV_FRANK_PASSWORD', role: 'SOCIO', isSeller: true },
  { displayName: 'susej',  email: 'susej@dev.local',  passwordEnv: 'DEV_SUSEJ_PASSWORD', role: 'SOCIO', isSeller: true },
  // ── Regular test user ─────────────────────────────────────────────────────
  { displayName: 'user',   email: 'user@dev.local',   passwordEnv: 'DEV_USER_PASSWORD', role: 'USER',  isSeller: false },
] as const

function requireEnv(name: string) {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`${name} not found. Add it to .env.local before running seed:dev.`)
  }
  return value
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  // Dynamic imports — same pattern as server actions
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient } = await import('../generated/prisma/client')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaPg } = await import('@prisma/adapter-pg')

  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const prisma = new (PrismaClient as any)({ adapter })

  console.log('\n🌱  Seeding dev users…\n')

  for (const u of SEED_USERS) {
    const passwordHash = await bcrypt.hash(requireEnv(u.passwordEnv), 12)

    const user = await prisma.mpUser.upsert({
      where:  { email: u.email },
      update: { passwordHash, role: u.role, isSeller: u.isSeller, displayName: u.displayName },
      create: { displayName: u.displayName, email: u.email, passwordHash, role: u.role, isSeller: u.isSeller },
    })

    const badge =
      u.role === 'SUPER' ? '🔴 SUPER' :
      u.role === 'SOCIO' ? '🟣 SOCIO' : '⚪ USER '

    console.log(`  ${badge}  ${u.displayName.padEnd(7)} ${u.email.padEnd(22)}  id: ${user.id}`)
  }

  await prisma.$disconnect()

  console.log('\n✅  Done.\n')
  console.log('  Login with username OR email:\n')
  console.log('  Username   Password source')
  console.log('  ─────────────────────────────')
  for (const u of SEED_USERS) {
    const tag = u.role === 'SUPER' ? ' (Admin)' : u.role === 'SOCIO' ? ' (Socio)' : ''
    console.log(`  ${u.displayName.padEnd(10)} ${u.passwordEnv}${tag}`)
  }
  console.log('')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
