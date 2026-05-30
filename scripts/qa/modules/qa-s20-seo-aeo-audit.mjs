import { loadEnv, getEnv } from '../lib/env.mjs'

const PAGES = [
  { path: '/', title: 'Turpial Sound', checks: ['title', 'description', 'canonical', 'og:image', 'jsonld'] },
  { path: '/reservas', title: 'Reservas', checks: ['title', 'description', 'canonical', 'noindex'] },
  { path: '/marketplace', title: 'Marketplace', checks: ['title', 'description', 'canonical', 'og:image', 'jsonld', 'structured'] },
  { path: '/marketplace/qa-e2e-s03f-selleria-discovery', title: 'Listing', checks: ['title', 'description', 'canonical', 'jsonld'] },
  { path: '/marketplace/venezuela/distrito-capital/caracas', title: 'SEO Location', checks: ['title', 'description', 'canonical'] },
  { path: '/salas-de-ensayo', title: 'Salas de Ensayo', checks: ['title', 'description', 'canonical', 'jsonld'] },
  { path: '/estudio-de-grabacion', title: 'Estudio de Grabacion', checks: ['title', 'description', 'canonical'] },
  { path: '/servicios', title: 'Servicios', checks: ['title', 'description', 'canonical'] },
  { path: '/contacto', title: 'Contacto', checks: ['title', 'description', 'canonical'] },
  { path: '/sitemap.xml', title: 'Sitemap', checks: ['xml', 'urls'] },
]

async function check(page, appUrl) {
  const url = `${appUrl}${page.path}`
  const results = { path: page.path, checks: [] }
  
  try {
    const res = await fetch(url, { redirect: 'follow', headers: { 'Accept': 'text/html,application/xml' } })
    const html = await res.text()
    
    results.status = res.status
    results.contentType = res.headers.get('content-type') || ''
    
    for (const check of page.checks) {
      switch (check) {
        case 'title': {
          const match = html.match(/<title>(.*?)<\/title>/)
          results.checks.push({
            check: 'meta:title',
            status: match ? 'PASS' : 'FAIL',
            detail: match ? match[1] : 'NO TITLE TAG',
          })
          break
        }
        case 'description': {
          const match = html.match(/<meta[^>]+name="description"[^>]+content="([^"]*)"/) ||
                        html.match(/<meta[^>]+content="([^"]*)"[^>]+name="description"/)
          results.checks.push({
            check: 'meta:description',
            status: match ? 'PASS' : 'FAIL',
            detail: match ? `${match[1].slice(0, 80)}...` : 'NO META DESCRIPTION',
          })
          break
        }
        case 'canonical': {
          const match = html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]*)"/)
          results.checks.push({
            check: 'meta:canonical',
            status: match ? 'PASS' : 'FAIL',
            detail: match ? match[1] : 'NO CANONICAL',
          })
          break
        }
        case 'og:image': {
          const match = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]*)"/)
          results.checks.push({
            check: 'meta:og:image',
            status: match ? 'PASS' : 'WARN',
            detail: match ? match[1] : 'NO OG:IMAGE',
          })
          break
        }
        case 'jsonld': {
          const match = html.match(/<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/)
          results.checks.push({
            check: 'structured:jsonld',
            status: match ? 'PASS' : 'FAIL',
            detail: match ? `JSON-LD presente (${match[1].length} chars)` : 'NO JSON-LD',
          })
          break
        }
        case 'structured': {
          const hasBreadcrumb = html.includes('BreadcrumbList')
          const hasCollection = html.includes('CollectionPage')
          results.checks.push({
            check: 'structured:breadcrumb',
            status: hasBreadcrumb ? 'PASS' : 'FAIL',
            detail: hasBreadcrumb ? 'BreadcrumbList presente' : 'NO BreadcrumbList',
          })
          results.checks.push({
            check: 'structured:collection',
            status: hasCollection ? 'PASS' : 'FAIL',
            detail: hasCollection ? 'CollectionPage presente' : 'NO CollectionPage',
          })
          break
        }
        case 'noindex': {
          const robots = html.match(/<meta[^>]+name="robots"[^>]+content="([^"]*)"/)
          const xRobots = res.headers.get('x-robots-tag') || ''
          results.checks.push({
            check: 'seo:robots',
            status: robots || xRobots ? 'PASS' : 'WARN',
            detail: robots ? robots[1] : xRobots || 'sin directiva robots',
          })
          break
        }
        case 'xml': {
          const isXml = res.headers.get('content-type')?.includes('xml') || html.startsWith('<?xml')
          results.checks.push({
            check: 'sitemap:xml',
            status: isXml ? 'PASS' : 'FAIL',
            detail: isXml ? 'Sitemap XML valido' : 'NO XML',
          })
          break
        }
        case 'urls': {
          const urlCount = (html.match(/<url>/g) || []).length
          results.checks.push({
            check: 'sitemap:urls',
            status: urlCount > 0 ? 'PASS' : 'FAIL',
            detail: `${urlCount} URLs en sitemap`,
          })
          break
        }
      }
    }
  } catch (err) {
    results.status = 'ERROR'
    results.error = err.message
  }
  
  return results
}

async function main() {
  loadEnv()
  const appUrl = getEnv('APP_URL', 'http://localhost:3002')
  
  console.log('=== S20 SEO/AEO Audit ===')
  console.log(`App URL: ${appUrl}`)
  console.log(`Timestamp: ${new Date().toISOString()}`)
  console.log('')
  
  const allResults = []
  let pass = 0, fail = 0, warn = 0, total = 0
  
  for (const page of PAGES) {
    console.log(`[${page.path}] ...`)
    const result = await check(page, appUrl)
    allResults.push(result)
    
    for (const c of result.checks) {
      total++
      if (c.status === 'PASS') pass++
      else if (c.status === 'FAIL') fail++
      else warn++
      const icon = c.status === 'PASS' ? 'PASS' : c.status === 'FAIL' ? 'FAIL' : 'WARN'
      console.log(`  [${icon}] ${c.check}: ${c.detail}`)
    }
  }
  
  console.log('')
  console.log(`=== S20 AUDIT: ${pass}/${total} PASS, ${fail} FAIL, ${warn} WARN ===`)
  console.log(`PASS: ${pass} | FAIL: ${fail} | WARN: ${warn} | TOTAL: ${total}`)
  
  const report = {
    sprint: 'S20',
    test: 'SEO/AEO Audit',
    appUrl,
    timestamp: new Date().toISOString(),
    pages: allResults,
    summary: { pass, fail, warn, total },
  }
  
  const fs = await import('node:fs')
  const path = await import('node:path')
  const dir = path.resolve(process.cwd(), 'var', 'qa-results', 's20-seo-aeo-audit')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify(report, null, 2))
  
  const md = [
    '# S20 SEO/AEO Audit',
    `**URL:** ${appUrl}`,
    `**Fecha:** ${new Date().toISOString()}`,
    `**Resultado:** ${pass}/${total} PASS`,
    '',
    '| Pagina | Status | Checks |',
    '|--------|--------|--------|',
    ...allResults.map(r => `| ${r.path} | HTTP ${r.status} | ${r.checks.map(c => `${c.check}=${c.status}`).join(', ')} |`),
    '',
    `**Total:** ${pass} PASS, ${fail} FAIL, ${warn} WARN`,
  ].join('\n')
  fs.writeFileSync(path.join(dir, 'report.md'), md)
  
  console.log('')
  console.log(`Report: ${dir}/report.json`)
  
  process.exit(fail > 0 ? 1 : 0)
}

main()
