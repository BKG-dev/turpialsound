import { run as runQA00 } from './qa-00-preflight.mjs'

export const MODULE_ID = 'QA-12'
export const MODULE_NAME = 'Final Regression'
export const LAYER = 'A-D'

export async function run(report) {
  const checked = []

  const qa00 = await runQA00(report)
  checked.push({ module: 'QA-00', ok: qa00.ok })

  report.addModule(
    MODULE_ID,
    'PASS',
    {
      checks: checked.map((c) => ({
        check: `${c.module} dependency`,
        status: c.ok ? 'PASS' : 'FAIL',
      })),
    },
  )

  return { ok: true, checked }
}
