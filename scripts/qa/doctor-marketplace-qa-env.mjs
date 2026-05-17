import { loadEnv, getEnv } from './lib/env.mjs'

const REQUIRED_VARS = [
  'DATABASE_URL',
  'DIRECT_URL',
  'APP_URL',
  'QA_BUYER_IDENTIFIER',
  'QA_BUYER_EMAIL',
  'QA_BUYER_PASSWORD',
  'QA_SELLER_IDENTIFIER',
  'QA_SELLER_EMAIL',
  'QA_SELLER_PASSWORD',
  'QA_ADMIN_IDENTIFIER',
  'QA_ADMIN_PASSWORD',
]

loadEnv()

const missing = []
const result = {
  ok: true,
  appUrlPresent: false,
  databaseUrlPresent: false,
  directUrlPresent: false,
  buyerIdentifierPresent: false,
  buyerEmailPresent: false,
  buyerPasswordPresent: false,
  sellerIdentifierPresent: false,
  sellerEmailPresent: false,
  sellerPasswordPresent: false,
  adminIdentifierPresent: false,
  adminPasswordPresent: false,
  missing: [],
}

for (const name of REQUIRED_VARS) {
  const present = Boolean(getEnv(name))
  switch (name) {
    case 'APP_URL': result.appUrlPresent = present; break
    case 'DATABASE_URL': result.databaseUrlPresent = present; break
    case 'DIRECT_URL': result.directUrlPresent = present; break
    case 'QA_BUYER_IDENTIFIER': result.buyerIdentifierPresent = present; break
    case 'QA_BUYER_EMAIL': result.buyerEmailPresent = present; break
    case 'QA_BUYER_PASSWORD': result.buyerPasswordPresent = present; break
    case 'QA_SELLER_IDENTIFIER': result.sellerIdentifierPresent = present; break
    case 'QA_SELLER_EMAIL': result.sellerEmailPresent = present; break
    case 'QA_SELLER_PASSWORD': result.sellerPasswordPresent = present; break
    case 'QA_ADMIN_IDENTIFIER': result.adminIdentifierPresent = present; break
    case 'QA_ADMIN_PASSWORD': result.adminPasswordPresent = present; break
  }
  if (!present) {
    result.ok = false
    missing.push(name)
  }
}

result.missing = missing

console.log(JSON.stringify(result, null, 2))

if (!result.ok) {
  console.log('')
  console.log('Action required:')
  console.log('  powershell -ExecutionPolicy Bypass -File scripts/qa/ensure-marketplace-qa-env.ps1')
  process.exit(1)
}

process.exit(0)
