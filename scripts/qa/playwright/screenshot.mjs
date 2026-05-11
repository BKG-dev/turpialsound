import path from 'node:path'
import fs from 'node:fs'

const SCREENSHOT_DIR = path.resolve(process.cwd(), 'var', 'qa-results', 's11-login-report')

export function ensureScreenshotDir() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true })
  }
  return SCREENSHOT_DIR
}

export async function screenshot(page, name) {
  const dir = ensureScreenshotDir()
  const filePath = path.join(dir, `${name}.png`)
  await page.screenshot({ path: filePath, fullPage: true })
  return filePath
}

export async function screenshotViewport(page, name) {
  const dir = ensureScreenshotDir()
  const filePath = path.join(dir, `${name}.png`)
  await page.screenshot({ path: filePath, fullPage: false })
  return filePath
}
