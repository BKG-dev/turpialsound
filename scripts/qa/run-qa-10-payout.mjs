import { loadEnv } from './lib/env.mjs'
import { ReportBuilder } from './lib/report.mjs'

loadEnv()

const appUrl = process.env.APP_URL || 'http://localhost:3002'
const report = new ReportBuilder({ appUrl })
report.start()

console.log(`Turpial Marketplace QA -- QA-10 Payout Audit`)
console.log(`App URL: ${appUrl}\n`)

const { run } = await import('./modules/qa-10-payout.mjs')
const result = await run(report)

if (result.ok) {
  console.log('\nQA-10 PASS -- Payout auditable validado.')
} else {
  console.log(`\nQA-10 FAIL -- ${result.error || 'audit checks failed'}`)
}

const summary = report.summary()
console.log(`PASS: ${summary.passed}  FAIL: ${summary.failed}  SKIP: ${summary.skipped}`)

const jsonPath = report.writeJSON()
const mdPath = report.writeMD()
console.log(`\nReport JSON: ${jsonPath}`)
console.log(`Report MD: ${mdPath}`)

if (summary.failed > 0) process.exit(1)
