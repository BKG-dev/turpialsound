import fs from 'node:fs'
import path from 'node:path'
import { chromium } from '@playwright/test'
import { loadEnv, getEnv } from '../lib/env.mjs'
import { loginViaMarketplaceModal, getQACredentials } from './login.mjs'

const REPORT_DIR = path.resolve(process.cwd(), 'var', 'qa-results', 's-mp-04-publish')
const REPORT_FILE = path.join(REPORT_DIR, 'report.md')

loadEnv()

function ensureDirs() {
  if (!fs.existsSync(REPORT_DIR)) fs.mkdirSync(REPORT_DIR, { recursive: true })
}

async function ss(page, name) {
  ensureDirs()
  await page.screenshot({ path: path.join(REPORT_DIR, `${name}.png`), fullPage: true })
}

const steps = []
function log(step, status, detail = '') {
  steps.push({ step, status, detail })
  const icon = status === 'PASS' ? 'PASS' : status === 'FAIL' ? 'FAIL' : '--'
  console.log(`  [${icon}] ${step}${detail ? ' — ' + detail : ''}`)
}

function createTestImage(index = 1) {
  ensureDirs()
  // Minimal valid 1x1 white PNG
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64')
  const imgPath = path.join(REPORT_DIR, `test-image-${index}.png`)
  fs.writeFileSync(imgPath, png)
  return imgPath
}

async function main() {
  console.log('=== S-MP-04 — Publish Images Playwright Test ===')
  console.log('')

  const appUrl = getEnv('APP_URL') || 'http://localhost:3002'
  console.log(`APP_URL: ${appUrl}`)
  ensureDirs()

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, locale: 'es-VE' })
  const page = await context.newPage()

  try {
    // ── Login as seller ──
    console.log('1. Login as seller...')
    const creds = getQACredentials()
    await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)
    const loggedIn = await loginViaMarketplaceModal(page, creds.seller.identifier, creds.seller.password)
    log('login', loggedIn ? 'PASS' : 'FAIL', loggedIn ? 'seller autenticado' : 'no se pudo autenticar')
    await ss(page, '01-logged-in')
    if (!loggedIn) throw new Error('Login fallido')

    // ── Navigate to /marketplace ──
    console.log('2. Navigate to /marketplace...')
    await page.goto(`${appUrl}/marketplace`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(2000)
    await ss(page, '02-marketplace')

    // ── Open publish modal ──
    console.log('3. Open publish modal — click "Quiero Vender"...')
    const quieroVenderBtn = page.locator('button', { hasText: 'Quiero Vender' })
    await quieroVenderBtn.waitFor({ state: 'visible', timeout: 10000 })
    await quieroVenderBtn.click()
    await page.waitForTimeout(1500)

    // ── Select a category to advance to form step ──
    const anyCategory = page.locator('button', { hasText: /Instrumentos|Audio Pro|Consumibles|Alquiler/ }).first()
    if (await anyCategory.isVisible().catch(() => false)) {
      const catText = await anyCategory.textContent().catch(() => '')
      await anyCategory.click()
      await page.waitForTimeout(1500)
      log('category-select', 'PASS', `categoria seleccionada: ${catText?.trim() || 'categoria'}`)
    } else {
      const instrumentosBtn = page.locator('button', { hasText: 'Instrumentos Nuevos' }).first()
      if (await instrumentosBtn.isVisible().catch(() => false)) {
        await instrumentosBtn.click()
        await page.waitForTimeout(1500)
        log('category-select', 'PASS', 'categoria seleccionada: Instrumentos Nuevos')
      } else {
        log('category-select', 'FAIL', 'no se pudo seleccionar categoria — modal de categorias no visible')
      }
    }
    await ss(page, '03-publish-form')

    // ═══════════════════════════════════════════════════════════════════════════
    //  TEST 1: Verify image upload field exists and appears required
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('4. TEST 1 — Verify image upload field exists and is required...')

    const fotosLabel = page.locator('text=Fotos del equipo').first()
    const fotosLabelVisible = await fotosLabel.isVisible({ timeout: 5000 }).catch(() => false)
    if (fotosLabelVisible) {
      const labelText = await fotosLabel.textContent().catch(() => '')
      log('01-image-field-label', 'PASS', `label visible: "${labelText?.trim()}"`)
    } else {
      log('01-image-field-label', 'FAIL', 'label "Fotos del equipo" no visible en el formulario')
    }

    const placeholderUploadText = page.locator('text=Subir fotos del equipo').first()
    const placeholderVisible = await placeholderUploadText.isVisible({ timeout: 3000 }).catch(() => false)
    log('01-image-upload-empty-state', placeholderVisible ? 'PASS' : 'FAIL',
      placeholderVisible ? 'estado vacio con texto "Subir fotos del equipo"' : 'estado vacio no visible')

    const fileInput = page.locator('input[type="file"][aria-label="Subir fotos del equipo"]').first()
    const fileInputExists = await fileInput.count().then(c => c > 0).catch(() => false)
    log('01-file-input-present', fileInputExists ? 'PASS' : 'FAIL',
      fileInputExists ? 'input[type="file"] para imagenes presente' : 'input file no encontrado')

    const acceptAttr = fileInputExists ? await fileInput.getAttribute('accept').catch(() => null) : null
    const hasValidAccept = acceptAttr?.includes('image/')
    log('01-file-accept-images', hasValidAccept ? 'PASS' : 'FAIL',
      hasValidAccept ? `accept="${acceptAttr}"` : 'atributo accept no contiene image/')

    const isRequired = !hasValidAccept
      ? null
      : await fileInput.evaluate(el => el.required).catch(() => null)
    log('01-image-required', isRequired === true ? 'PASS' : (isRequired === false ? 'WARN' : '--'),
      isRequired === true ? 'input marcado como required' : 'required no esta seteado en la propiedad HTML')

    await ss(page, '04-test1-image-field')

    // ═══════════════════════════════════════════════════════════════════════════
    //  TEST 2: Try to publish without images → verify error message
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('5. TEST 2 — Try to publish without images...')

    const publishBtn = page.locator('button', { hasText: 'Publicar Producto' })
    if (await publishBtn.isVisible().catch(() => false)) {
      await publishBtn.click()
      await page.waitForTimeout(1500)

      const imageError = page.locator('text=Debes subir al menos 1 imagen del producto').first()
      const imageErrorVisible = await imageError.isVisible({ timeout: 5000 }).catch(() => false)
      log('02-publish-no-images-error', imageErrorVisible ? 'PASS' : 'FAIL',
        imageErrorVisible ? 'error "Debes subir al menos 1 imagen del producto" mostrado' : 'error de imagen no visible')

      if (!imageErrorVisible) {
        const bodyText = await page.locator('body').textContent().catch(() => '')
        log('02-body-check', '--', `contenido: "${bodyText?.slice(0, 120)}..."`)
      }
    } else {
      log('02-publish-no-images-error', 'FAIL', 'boton "Publicar Producto" no visible')
    }
    await ss(page, '05-test2-no-images-error')

    // ═══════════════════════════════════════════════════════════════════════════
    //  TEST 3: Upload 2 images → verify preview thumbnails appear
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('6. TEST 3 — Upload 2 images, verify preview thumbnails...')

    const img1Path = createTestImage(1)
    const img2Path = createTestImage(2)

    // Use the empty-state file input (aria-label="Subir fotos del equipo")
    const emptyStateInput = page.locator('input[aria-label="Subir fotos del equipo"]').first()
    if (await emptyStateInput.count().then(c => c > 0).catch(() => false)) {
      await emptyStateInput.setInputFiles([img1Path, img2Path])
      await page.waitForTimeout(2000)
      log('03-upload-images', 'PASS', '2 imagenes subidas via input file')
    } else {
      // Fallback: try the first visible file input
      const anyFileInput = page.locator('input[type="file"]').first()
      if (await anyFileInput.count().then(c => c > 0).catch(() => false)) {
        await anyFileInput.setInputFiles([img1Path, img2Path])
        await page.waitForTimeout(2000)
        log('03-upload-images', 'PASS', '2 imagenes subidas via fallback input')
      } else {
        log('03-upload-images', 'FAIL', 'no se encontro input file para subir imagenes')
      }
    }

    // Verify preview thumbnails: grid of aspect-square divs with img elements
    const previewGrid = page.locator('.grid-cols-4').first()
    const gridVisible = await previewGrid.isVisible({ timeout: 3000 }).catch(() => false)
    log('03-preview-grid-visible', gridVisible ? 'PASS' : 'FAIL',
      gridVisible ? 'grid de previsualizacion visible' : 'grid no visible')

    const previewImages = page.locator('.aspect-square img').first()
    const previewImgVisible = await previewImages.isVisible({ timeout: 3000 }).catch(() => false)
    log('03-preview-thumbnails', previewImgVisible ? 'PASS' : 'FAIL',
      previewImgVisible ? 'thumbnails de preview visibles' : 'thumbnails no visibles')

    // Count the uploaded image thumbnails
    const thumbCount = await page.locator('.aspect-square img').count().catch(() => 0)
    log('03-thumbnail-count', thumbCount >= 2 ? 'PASS' : (thumbCount > 0 ? 'WARN' : 'FAIL'),
      `${thumbCount} thumbnail(s) visibles (esperado >= 2)`)
    await ss(page, '06-test3-preview-thumbnails')

    // ── Cleanup: close the publish modal ──
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)

    // ═══════════════════════════════════════════════════════════════════════════
    //  TEST 4: Verify "Sin foto" placeholder on listings without images
    // ═══════════════════════════════════════════════════════════════════════════
    console.log('7. TEST 4 — Verify "Sin foto" placeholder on /marketplace...')

    await page.goto(`${appUrl}/marketplace`, { waitUntil: 'domcontentloaded', timeout: 30000 })
    await page.waitForTimeout(3000)
    await ss(page, '07-marketplace-full')

    const sinFotoEl = page.locator('text=Sin foto').first()
    const sinFotoVisible = await sinFotoEl.isVisible({ timeout: 5000 }).catch(() => false)

    if (sinFotoVisible) {
      log('04-sin-foto-placeholder', 'PASS', 'placeholder "Sin foto" visible en /marketplace')

      // Verify it's NOT a generic fallback image (check it's a text span, not an img src)
      const sinFotoText = await sinFotoEl.textContent().catch(() => '')
      const isTextPlaceholder = sinFotoText?.trim() === 'Sin foto'
      log('04-sin-foto-is-text', isTextPlaceholder ? 'PASS' : 'FAIL',
        isTextPlaceholder ? '"Sin foto" es texto, no una imagen generica' : 'el placeholder no coincide exactamente')

      // Verify the parent context includes the ImageIcon (to confirm it's the intended component)
      const hasImageIconNearby = await page.locator('text=Sin foto').locator('..').locator('svg').first().isVisible({ timeout: 2000 }).catch(() => false)
      log('04-sin-foto-with-icon', hasImageIconNearby ? 'PASS' : 'WARN',
        hasImageIconNearby ? 'icono ImageIcon acompania el texto "Sin foto"' : 'icono no detectado junto al placeholder')
    } else {
      log('04-sin-foto-placeholder', 'WARN', 'no se encontro "Sin foto" en /marketplace (posiblemente todos los listings tienen imagenes)')

      // Check for generic <img> fallback (should NOT be present)
      const genericImgs = page.locator('img[src*="placeholder"], img[src*="fallback"], img[src*="default"]')
      const genericCount = await genericImgs.count().catch(() => 0)
      if (genericCount > 0) {
        log('04-no-generic-fallback', 'FAIL', `${genericCount} imagenes placeholder genericas detectadas (deberian mostrar "Sin foto")`)
      } else {
        log('04-no-generic-fallback', 'PASS', 'no se detectaron imagenes placeholder genericas')
      }
    }
    await ss(page, '08-test4-sin-foto')

  } catch (error) {
    log('fatal', 'FAIL', error.message)
    console.error(error)
  } finally {
    await page.close().catch(() => {})
    await context.close().catch(() => {})
    await browser.close()

    const passCount = steps.filter(s => s.status === 'PASS').length
    const failCount = steps.filter(s => s.status === 'FAIL').length
    const warnCount = steps.filter(s => s.status === 'WARN').length
    const skipCount = steps.filter(s => s.status === 'SKIP').length

    const results = {
      sprint: 'S-MP-04',
      test: 'Marketplace Publish Images',
      appUrl,
      timestamp: new Date().toISOString(),
      steps,
      summary: { pass: passCount, fail: failCount, warn: warnCount, skip: skipCount, total: steps.length },
    }

    fs.writeFileSync(REPORT_FILE.replace('.md', '.json'), JSON.stringify(results, null, 2))

    const md = [
      '# S-MP-04 Marketplace Publish Images — Playwright Test',
      `**URL:** ${appUrl}`,
      `**Fecha:** ${new Date().toISOString()}`,
      '',
      '| Paso | Estado | Detalle |',
      '|------|--------|---------|',
      ...steps.map(s => `| ${s.step} | ${s.status} | ${s.detail} |`),
      '',
      `**Total:** ${passCount} PASS, ${failCount} FAIL, ${warnCount} WARN, ${skipCount} SKIP`,
    ].join('\n')
    fs.writeFileSync(REPORT_FILE, md)

    console.log('')
    console.log(`Report: ${passCount}/${results.summary.total} PASS`)
    console.log(`Screenshots: ${REPORT_DIR}/`)
    console.log(`Report file: ${REPORT_FILE}`)

    process.exit(failCount > 0 ? 1 : 0)
  }
}

main().catch((err) => {
  console.error('FATAL:', err)
  process.exit(2)
})
