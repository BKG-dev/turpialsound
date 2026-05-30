import { chromium } from '@playwright/test'
import { loadEnv, getEnv, requireEnv } from '../lib/env.mjs'
import { screenshot } from './screenshot.mjs'

loadEnv()

const APP_URL = getEnv('APP_URL') || 'http://localhost:3002'

export async function loginViaMarketplaceModal(page, identifier, password) {
  await page.goto(`${APP_URL}/marketplace`, { waitUntil: 'networkidle' })

  const entrarBtn = page.locator('button:has-text("Entrar")').first()
  await entrarBtn.waitFor({ state: 'visible', timeout: 10000 })
  await entrarBtn.click()

  const loginForm = page.locator('form').filter({ hasText: 'Email o usuario' }).first()
  await loginForm.waitFor({ state: 'visible', timeout: 10000 })

  await page.waitForTimeout(500)

  const identifierInput = loginForm.locator('input[type="text"]').first()
  await identifierInput.fill(identifier)

  const passwordInput = loginForm.locator('input[type="password"]').first()
  await passwordInput.fill(password)

  const submitBtn = page.locator('button[type="submit"]:has-text("Iniciar sesión")')
  await submitBtn.click()

  await page.waitForTimeout(1500)

  const salirBtn = page.locator('[title="Salir"], [aria-label="Salir"]')
  await salirBtn.waitFor({ state: 'visible', timeout: 15000 })

  return { loggedIn: true }
}

export async function checkAuthBar(page, expectedDisplayName) {
  const authBar = page.locator(`text=${expectedDisplayName}`).first()
  await authBar.waitFor({ state: 'visible', timeout: 10000 })
  const text = await authBar.textContent()
  return {
    found: true,
    text: text?.trim() || '',
    expectedName: expectedDisplayName,
  }
}

export async function loginSmokeSequence(page, userConfig) {
  const { label, identifier, password, expectedName } = userConfig

  const beforeScreenshot = await screenshot(page, `${label.toLowerCase()}-01-before-login`)

  await loginViaMarketplaceModal(page, identifier, password)

  const afterScreenshot = await screenshot(page, `${label.toLowerCase()}-02-after-login`)

  let headerText = null
  try {
    const authBar = await checkAuthBar(page, expectedName)
    headerText = authBar.text
  } catch {
    headerText = null
  }

  return {
    label,
    identifier,
    expectedName,
    loggedIn: true,
    headerText,
    screenshots: [beforeScreenshot, afterScreenshot],
  }
}

export function getQACredentials() {
  return {
    buyer: {
      label: 'BUYER',
      identifier: requireEnv('QA_BUYER_IDENTIFIER'),
      email: getEnv('QA_BUYER_EMAIL'),
      password: requireEnv('QA_BUYER_PASSWORD'),
      expectedName: requireEnv('QA_BUYER_IDENTIFIER'),
    },
    seller: {
      label: 'SELLER',
      identifier: requireEnv('QA_SELLER_IDENTIFIER'),
      email: getEnv('QA_SELLER_EMAIL'),
      password: requireEnv('QA_SELLER_PASSWORD'),
      expectedName: requireEnv('QA_SELLER_IDENTIFIER'),
    },
    admin: {
      label: 'ADMIN',
      identifier: requireEnv('QA_ADMIN_IDENTIFIER'),
      password: requireEnv('QA_ADMIN_PASSWORD'),
      expectedName: requireEnv('QA_ADMIN_IDENTIFIER'),
    },
  }
}

export function buildResultsTable(results) {
  let html = `\n## Resultados Login Smoke\n\n`
  html += `| Usuario | Identificador | Esperado | Header | Estado |\n`
  html += `|---------|---------------|----------|--------|--------|\n`
  for (const r of results) {
    const status = r.loggedIn && r.headerText?.toLowerCase().includes(r.expectedName.toLowerCase()) ? 'PASS' : 'FAIL'
    html += `| ${r.label} | ${r.identifier} | ${r.expectedName} | ${r.headerText || 'N/A'} | ${status} |\n`
  }
  return html
}

export function buildResultSummary(results) {
  const passes = results.filter(r => r.loggedIn && r.headerText?.toLowerCase().includes(r.expectedName.toLowerCase()))
  const fails = results.filter(r => !passes.includes(r))
  return {
    total: results.length,
    passes: passes.length,
    fails: fails.length,
    passed: passes.length === results.length,
    results,
  }
}
