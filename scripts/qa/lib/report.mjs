import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import path from 'node:path'

export class ReportBuilder {
  constructor(opts = {}) {
    this.runId = opts.runId || new Date().toISOString().replace(/[:.]/g, '-')
    this.appUrl = opts.appUrl || process.env.APP_URL || 'unknown'
    this.modules = []
    this.startedAt = null
    this.outputDir = opts.outputDir || 'var/qa-results'
  }

  start() {
    this.startedAt = new Date().toISOString()
    return this
  }

  addModule(name, status, opts = {}) {
    this.modules.push({
      module: name,
      status,
      durationMs: opts.durationMs ?? null,
      failureCode: opts.failureCode ?? null,
      failureDetail: opts.failureDetail ?? null,
      checks: opts.checks ?? [],
      startedAt: opts.startedAt ?? null,
      finishedAt: opts.finishedAt ?? null,
    })
    return this
  }

  summary() {
    const total = this.modules.length
    const passed = this.modules.filter((m) => m.status === 'PASS').length
    const failed = this.modules.filter((m) => m.status === 'FAIL').length
    const skipped = this.modules.filter((m) => m.status === 'SKIP').length
    return { total, passed, failed, skipped }
  }

  toJSON() {
    return {
      runId: this.runId,
      appUrl: this.appUrl,
      startedAt: this.startedAt,
      finishedAt: new Date().toISOString(),
      modules: this.modules,
      summary: this.summary(),
    }
  }

  writeJSON(filename = null) {
    const name = filename || `report-${this.runId}.json`
    const dir = this.outputDir
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    const filePath = path.join(dir, name)
    writeFileSync(filePath, JSON.stringify(this.toJSON(), null, 2), 'utf8')
    return filePath
  }

  writeMD(filename = null) {
    const name = filename || `report-${this.runId}.md`
    const dir = this.outputDir
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    const filePath = path.join(dir, name)
    const s = this.summary()
    let md = `# QA Report -- ${this.runId}\n\n`
    md += `**App URL:** ${this.appUrl}\n`
    md += `**Started:** ${this.startedAt}\n`
    md += `**Finished:** ${new Date().toISOString()}\n\n`
    md += `## Summary\n\n`
    md += `| Status | Count |\n|--------|-------|\n`
    md += `| PASS | ${s.passed} |\n| FAIL | ${s.failed} |\n| SKIP | ${s.skipped} |\n| TOTAL | ${s.total} |\n\n`
    md += `## Modules\n\n`
    md += `| Module | Status | Duration | Failure | Detail |\n`
    md += `|--------|--------|----------|---------|--------|\n`
    for (const m of this.modules) {
      md += `| ${m.module} | ${m.status} | ${m.durationMs ? m.durationMs + 'ms' : '-'} | ${m.failureCode || '-'} | ${m.failureDetail || '-'} |\n`
    }
    if (this.modules.some(m => m.checks?.length)) {
      md += `\n## Checks\n\n`
      for (const m of this.modules) {
        if (m.status === 'RUNNING') continue
        for (const c of (m.checks || [])) {
          md += `- **${c.check}** -- ${c.status}: ${c.detail || '-'}\n`
        }
      }
    }
    writeFileSync(filePath, md, 'utf8')
    return filePath
  }
}
