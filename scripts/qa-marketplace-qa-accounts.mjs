import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { loadEnvConfig } from '@next/env'

loadEnvConfig(process.cwd())

const APP_URL = process.env.APP_URL || 'http://localhost:3002'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const DEBUG_PORT = Number(process.env.DEBUG_PORT || '9222')
const REUSE_BROWSER = process.env.REUSE_BROWSER === '1'
const QA_OUTPUT = process.env.QA_OUTPUT || ''

function requiredEnv(name) {
  const value = process.env[name]
  if (!value || !String(value).trim()) {
    throw new Error(`Missing required env var: ${name}`)
  }
  return String(value).trim()
}

const BUYER = {
  identifier: requiredEnv('QA_BUYER_IDENTIFIER'),
  password: requiredEnv('QA_BUYER_PASSWORD'),
  email: requiredEnv('QA_BUYER_EMAIL'),
}

const SELLER = {
  identifier: requiredEnv('QA_SELLER_IDENTIFIER'),
  password: requiredEnv('QA_SELLER_PASSWORD'),
  email: requiredEnv('QA_SELLER_EMAIL'),
}

const ADMIN = {
  identifier: requiredEnv('QA_ADMIN_IDENTIFIER'),
  password: requiredEnv('QA_ADMIN_PASSWORD'),
}

const LISTING = {
  slug: 'selleria-qa-e2e-persistente',
  title: 'sellerIA QA e2e persistente',
}

let ws
let msgId = 0
const pending = new Map()
const pageSession = { id: null }
const consoleEvents = []
const pageErrors = []

function onMessage(raw) {
  const data = JSON.parse(String(raw))

  if (data.method === 'Runtime.consoleAPICalled') {
    const text = (data.params?.args || []).map((arg) => arg.value ?? arg.description ?? '').join(' ').trim()
    consoleEvents.push({ type: data.params?.type || 'log', text })
    return
  }

  if (data.method === 'Runtime.exceptionThrown') {
    const details = data.params?.exceptionDetails
    pageErrors.push({
      text: details?.text || 'Runtime exception',
      url: details?.url || '',
      lineNumber: details?.lineNumber ?? null,
      columnNumber: details?.columnNumber ?? null,
    })
    return
  }

  if (data.id && pending.has(data.id)) {
    const { resolve, reject } = pending.get(data.id)
    pending.delete(data.id)
    if (data.error) reject(new Error(data.error.message))
    else resolve(data.result)
  }
}

function send(method, params = {}, sessionId = pageSession.id) {
  const id = ++msgId
  const payload = { id, method, params }
  if (sessionId) payload.sessionId = sessionId
  ws.send(JSON.stringify(payload))
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }))
}

async function connectBrowser() {
  let version
  let lastError
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      version = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`).then((r) => r.json())
      break
    } catch (error) {
      lastError = error
      await delay(500)
    }
  }
  if (!version) throw lastError

  ws = new WebSocket(version.webSocketDebuggerUrl)
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true })
    ws.addEventListener('error', reject, { once: true })
  })
  ws.addEventListener('message', (event) => onMessage(event.data))

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' }, undefined)
  const attached = await send('Target.attachToTarget', { targetId, flatten: true }, undefined)
  pageSession.id = attached.sessionId

  await send('Page.enable')
  await send('Runtime.enable')
  await send('DOM.enable')
  await send('Network.enable')
}

async function evalExpr(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  })
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text ?? 'Runtime.evaluate failed')
  return result.result?.value
}

async function waitFor(fnSource, timeoutMs = 15000) {
  const started = Date.now()
  while (Date.now() - started < timeoutMs) {
    const value = await evalExpr(`(${fnSource})()`)
    if (value) return value
    await delay(250)
  }
  throw new Error(`Timeout waiting for condition: ${fnSource}`)
}

async function navigate(url) {
  console.log('NAVIGATE', url)
  await send('Page.navigate', { url })
  await delay(1500)
}

async function clearCookies() {
  await send('Network.clearBrowserCookies')
  await delay(300)
}

async function clickContainsText(text, selector = 'button, a, [role="button"], [role="tab"]') {
  const ok = await evalExpr(`
    (() => {
      const target = ${JSON.stringify(text)}
      const normalize = (v) => String(v || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/\\s+/g, ' ').trim()
      const nodes = Array.from(document.querySelectorAll(${JSON.stringify(selector)}))
      const match = nodes.find((el) => normalize(el.innerText || el.textContent || '').includes(normalize(target)))
      if (!match) return false
      match.click()
      return true
    })()
  `)
  if (!ok) throw new Error(`Could not click text containing: ${text}`)
  console.log('CLICK', text)
  await delay(800)
}

async function clickExactText(text, selector = 'button, a, [role="button"], [role="tab"]') {
  const ok = await evalExpr(`
    (() => {
      const target = ${JSON.stringify(text)}
      const normalize = (v) => String(v || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/\\s+/g, ' ').trim()
      const nodes = Array.from(document.querySelectorAll(${JSON.stringify(selector)}))
      const match = nodes.find((el) => normalize(el.innerText || el.textContent || '') === normalize(target))
      if (!match) return false
      match.click()
      return true
    })()
  `)
  if (!ok) throw new Error(`Could not click exact text: ${text}`)
  console.log('CLICK', text)
  await delay(800)
}

async function setInputByHints(hints, value, typeHint = null, selector = 'input, textarea, select') {
  const ok = await evalExpr(`
    (() => {
      const hints = ${JSON.stringify(hints)}
      const expectedType = ${JSON.stringify(typeHint)}
      const selector = ${JSON.stringify(selector)}
      const normalize = (text) => String(text || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/\\s+/g, ' ').trim().toLowerCase()
      const hasHint = (text) => hints.some((hint) => normalize(text).includes(normalize(hint)))
      let field = Array.from(document.querySelectorAll(selector)).find((el) => {
        const placeholder = el.getAttribute('placeholder') || ''
        const ariaLabel = el.getAttribute('aria-label') || ''
        const name = el.getAttribute('name') || ''
        const type = el.getAttribute('type') || ''
        return (hasHint(placeholder) || hasHint(ariaLabel) || hasHint(name)) && (!expectedType || type === expectedType)
      }) || null
      if (!field) {
        const label = Array.from(document.querySelectorAll('label')).find((el) => hasHint(el.innerText || el.textContent || ''))
        field = label?.closest('div')?.querySelector(selector) || label?.parentElement?.querySelector(selector) || null
      }
      if (!field && expectedType) {
        field = Array.from(document.querySelectorAll(selector)).find((el) => (el.getAttribute('type') || '') === expectedType) || null
      }
      if (!field) return false
      const tag = field.tagName.toLowerCase()
      if (tag === 'select') {
        const option = Array.from(field.options).find((opt) => hasHint(opt.value) || hasHint(opt.textContent || '') || (opt.value === ${JSON.stringify(value)}))
        field.value = option ? option.value : ${JSON.stringify(value)}
      } else {
        const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), 'value')
        if (descriptor?.set) descriptor.set.call(field, ${JSON.stringify(value)})
        else field.value = ${JSON.stringify(value)}
      }
      field.dispatchEvent(new Event('input', { bubbles: true }))
      field.dispatchEvent(new Event('change', { bubbles: true }))
      return true
    })()
  `)
  if (!ok) throw new Error(`Could not set input with hints: ${hints.join(', ')}`)
  await delay(250)
}

async function getSessionSignals() {
  return evalExpr(`
    (() => {
      const normalize = (v) => String(v || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/\\s+/g, ' ').trim().toLowerCase()
      const texts = Array.from(document.querySelectorAll('a, button, span, div'))
        .map((el) => el.innerText || el.textContent || '')
        .map(normalize)
        .filter(Boolean)
      return {
        url: location.href,
        hasLogout: texts.some((t) => t.includes('salir')),
        hasAdmin: texts.some((t) => t === 'admin' || t.includes('admin ')),
        hasBuyerIA: texts.some((t) => t.includes('buyeria')),
        hasSellerIA: texts.some((t) => t.includes('selleria')),
        visibleSignals: texts.filter((t) => t.includes('salir') || t.includes('admin') || t.includes('buyeria') || t.includes('selleria')).slice(0, 12),
      }
    })()
  `)
}

async function ensureLogin(identifier, password) {
  const state = await getSessionSignals()
  if (state.hasLogout) return state
  await clickContainsText('Iniciar sesión')
  await waitFor(`
    () => {
      const text = document.body.innerText || ''
      return text.includes('Email o usuario') || text.includes('Email') || text.includes('Usuario')
    }
  `, 15000)
  await setInputByHints(['Email o usuario', 'Email', 'Correo', 'Usuario'], identifier)
  await setInputByHints(['Contraseña', 'Contrasena', 'Password'], password, 'password')
  const submitted = await evalExpr(`
    (() => {
      const forms = Array.from(document.querySelectorAll('form'))
      const targetForm = forms.find((form) => {
        const text = (form.innerText || form.textContent || '')
        return text.includes('Iniciar sesi') || text.includes('Email o usuario') || text.includes('Contrase')
      }) || forms[0] || null
      const submitButton = targetForm
        ? Array.from(targetForm.querySelectorAll('button, input[type="submit"]')).find((button) => {
            const text = (button.innerText || button.textContent || button.getAttribute('value') || '').trim()
            const type = (button.getAttribute('type') || '').toLowerCase()
            return text.includes('Iniciar') || type === 'submit'
          }) || null
        : null
      if (!submitButton) return false
      submitButton.click()
      return true
    })()
  `)
  if (!submitted) throw new Error('Could not trigger login submit')
  console.log('CLICK', 'Login submit')
  await delay(1200)
  await waitFor(`
    () => {
      const text = document.body.innerText || ''
      return text.includes('Salir')
    }
  `, 15000)
  return getSessionSignals()
}

async function getListingSnapshot() {
  return evalExpr(`
    (() => {
      const normalize = (v) => String(v || '').replace(/\\s+/g, ' ').trim()
      const body = normalize(document.body.innerText || '')
      const headings = Array.from(document.querySelectorAll('h1, h2, h3')).map((el) => normalize(el.innerText || el.textContent || '')).filter(Boolean)
      return {
        url: location.href,
        title: document.title,
        headings,
        bodyExcerpt: body.slice(0, 1500),
        canBuy: body.includes('Comprar Ahora'),
        canChat: body.includes('Contactar Vendedor'),
        hasSellerNotice: body.includes('Este es tu listing.'),
      }
    })()
  `)
}

async function openChatAndSend(message) {
  await clickContainsText('Contactar')
  await waitFor(`
    () => {
      const body = document.body.innerText || ''
      return !!document.querySelector('textarea[placeholder*="Escribe"]') && !body.includes('Fender Stratocaster')
    }
  `, 15000)
  await setInputByHints(['Escribe un mensaje'], message, null, 'textarea')
  const sent = await evalExpr(`
    (() => {
      const textarea = document.querySelector('textarea[placeholder*="Escribe"]')
      if (!textarea) return false
      const buttons = Array.from(textarea.closest('div')?.parentElement?.querySelectorAll('button') || document.querySelectorAll('button'))
      const submit = buttons.reverse().find((btn) => !btn.disabled)
      if (!submit) return false
      submit.click()
      return true
    })()
  `)
  if (!sent) throw new Error('Could not send chat message')
  await delay(1500)
  return evalExpr(`
    (() => {
      const body = (document.body.innerText || '').replace(/\\s+/g, ' ').trim()
      return {
        chatOpen: !!document.querySelector('textarea[placeholder*="Escribe"]'),
        bodyHasMessage: body.includes(${JSON.stringify(message)}),
        excerpt: body.slice(-1200),
      }
    })()
  `)
}

async function checkoutPurchase(reference) {
  await clickContainsText('Comprar Ahora')
  await waitFor(`() => (document.body.innerText || '').includes('Completar compra')`, 15000)
  await clickExactText('Pago movil')
  await setInputByHints(['Numero de operacion'], reference, 'text')
  await setInputByHints(['Banco emisor'], '0105 - Banco Mercantil, C.A. Banco Universal', null, 'select')
  const confirmState = await evalExpr(`
    (() => {
      const body = (document.body.innerText || '').replace(/\\s+/g, ' ').trim()
      const btn = Array.from(document.querySelectorAll('button')).find((el) => (el.innerText || el.textContent || '').includes('Confirmar pago'))
      return {
        hasModal: body.includes('Completar compra'),
        hasConfirm: !!btn,
        buttonDisabled: btn ? !!btn.disabled : null,
      }
    })()
  `)
  await clickContainsText('Confirmar pago')
  await waitFor(`() => (document.body.innerText || '').includes('Pago procesado')`, 30000)
  const success = await evalExpr(`
    (() => {
      const body = (document.body.innerText || '').replace(/\\s+/g, ' ').trim()
      return {
        title: body.includes('Pago procesado') ? 'Pago procesado' : null,
        summary: body.includes('Tu pago esta siendo validado') ? 'Tu pago esta siendo validado.' : null,
        detailExcerpt: body.slice(0, 1200),
      }
    })()
  `)
  await clickContainsText('Volver al marketplace')
  return { confirmState, success }
}

async function openDashboardTab(tab) {
  await navigate(`${APP_URL}/marketplace/dashboard?tab=${tab}`)
  await waitFor(`() => location.pathname.includes('/marketplace/dashboard')`, 15000)
  await delay(1200)
}

async function getDashboardSalesSnapshot(listingTitle) {
  return evalExpr(`
    (() => {
      const body = (document.body.innerText || '').replace(/\\s+/g, ' ').trim()
      return {
        url: location.href,
        hasListing: body.includes(${JSON.stringify(listingTitle)}),
        hasPaymentReceived: body.includes('Pago Recibido'),
        hasPendingPayment: body.includes('Pago Pendiente'),
        hasEscrow: body.includes('En Escrow'),
        excerpt: body.slice(0, 2200),
      }
    })()
  `)
}

async function getDashboardMessagesSnapshot(listingTitle, expectedMessage) {
  const body = await evalExpr(`(document.body.innerText || '').replace(/\\s+/g, ' ').trim()`)
  const threadVisible = body.includes(listingTitle)
  if (threadVisible) {
    try {
      await clickContainsText(listingTitle)
      await waitFor(`() => !!document.querySelector('textarea[placeholder*="Escribe"]')`, 15000)
      const detail = await evalExpr(`
        (() => {
          const body = (document.body.innerText || '').replace(/\\s+/g, ' ').trim()
          return {
            hasListing: body.includes(${JSON.stringify(listingTitle)}),
            hasBuyerMessage: body.includes(${JSON.stringify(expectedMessage)}),
            excerpt: body.slice(-1400),
          }
        })()
      `)
      return { threadVisible, ...detail }
    } catch (error) {
      return { threadVisible, openError: error.message }
    }
  }
  return { threadVisible, excerpt: body.slice(0, 1400) }
}

async function getDashboardPayoutSnapshot() {
  return evalExpr(`
    (() => {
      const body = (document.body.innerText || '').replace(/\\s+/g, ' ').trim()
      return {
        url: location.href,
        heading: body.includes('Datos de cobro del vendedor') ? 'Datos de cobro del vendedor' : null,
        hasConfiguredMethod: body.includes('Cobro QA sellerIA'),
        hasPagoMovil: body.includes('Pago movil'),
        hasPendingValidationCount: /Validaciones pendientes\\s+1/i.test(body) || body.includes('Validaciones pendientes'),
        hasNoAdmin: !body.includes('Turpial Sound — Admin'),
        excerpt: body.slice(0, 2200),
      }
    })()
  `)
}

async function getSellerCreationFlowSnapshot() {
  await navigate(`${APP_URL}/marketplace`)
  await clickContainsText('Quiero Vender')
  await delay(1500)
  return evalExpr(`
    (() => {
      const body = (document.body.innerText || '').replace(/\\s+/g, ' ').trim()
      return {
        url: location.href,
        hasFlow: body.includes('Quiero Vender') || body.includes('Publica tu producto en el marketplace'),
        hasPublishAction: body.includes('Publicar Producto'),
        excerpt: body.slice(0, 1800),
      }
    })()
  `)
}

async function clickAdminLink() {
  const ok = await evalExpr(`
    (() => {
      const link = document.querySelector('a[href="/marketplace/admin"]')
      if (!link) return false
      link.click()
      return true
    })()
  `)
  if (!ok) throw new Error('Could not click admin link')
  console.log('CLICK', 'Admin link')
  await delay(1000)
}

async function getAdminSurfaceSnapshot(listingTitle, buyerName, operationNumber) {
  return evalExpr(`
    (() => {
      const normalize = (v) => String(v || '').replace(/\\s+/g, ' ').trim()
      const body = normalize(document.body.innerText || '')
      const title = ${JSON.stringify(listingTitle)}
      const buyer = ${JSON.stringify(buyerName)}
      const op = ${JSON.stringify(operationNumber)}
      const excerptFor = (needle) => {
        const idx = body.indexOf(needle)
        if (idx < 0) return null
        return body.slice(Math.max(0, idx - 180), Math.min(body.length, idx + 480))
      }
      return {
        url: location.href,
        heading: body.includes('Validaciones pendientes') ? 'Validaciones pendientes' : (body.includes('Resumen operativo') ? 'Resumen operativo' : null),
        description: body.includes('Pagos reportados por compradores pendientes de validacion manual.')
          ? 'Pagos reportados por compradores pendientes de validacion manual.'
          : null,
        hasListing: body.includes(title),
        hasBuyer: body.includes(buyer),
        hasSeller: body.includes('sellerIA'),
        hasPaymentReceived: body.includes('Pago recibido'),
        hasOperation: body.includes(op),
        hasAmount125: body.includes('$125.00') || body.includes('$125 USD'),
        hasBankMercantil: body.includes('Mercantil'),
        excerptByListing: excerptFor(title),
        excerptByOperation: excerptFor(op),
      }
    })()
  `)
}

async function run() {
  if (!REUSE_BROWSER) {
    const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'turpial-qa-accounts-'))
    const chrome = spawn(CHROME, [
      `--remote-debugging-port=${DEBUG_PORT}`,
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      `--user-data-dir=${userDataDir}`,
      'about:blank',
    ], { stdio: 'ignore', detached: true })
    chrome.unref()
    await delay(1500)
  }

  await connectBrowser()

  const report = {
    listing: LISTING,
    buyer: {},
    seller: {},
    admin: {},
    consoleErrors: [],
    pageErrors: [],
  }

  const buyerMessage = `QA buyerIA -> sellerIA ${Date.now()}`
  const operationNumber = `QA${Date.now()}`

  await clearCookies()
  await navigate(`${APP_URL}/marketplace`)
  const buyerLogin = await ensureLogin(BUYER.identifier, BUYER.password)
  await navigate(`${APP_URL}/marketplace/${LISTING.slug}`)
  const buyerListingBefore = await getListingSnapshot()
  const buyerListingAfterLogin = await getListingSnapshot()
  const buyerChat = await openChatAndSend(buyerMessage)
  const buyerCheckout = await checkoutPurchase(operationNumber)
  await openDashboardTab('purchases')
  const buyerPurchases = await getDashboardSalesSnapshot(LISTING.title)
  report.buyer = {
    login: buyerLogin,
    listingBefore: buyerListingBefore,
    listingAfterLogin: buyerListingAfterLogin,
    chat: buyerChat,
    checkout: buyerCheckout,
    purchases: buyerPurchases,
  }

  await clearCookies()
  await navigate(`${APP_URL}/marketplace`)
  const sellerLogin = await ensureLogin(SELLER.identifier, SELLER.password)
  const sellerCreationFlow = await getSellerCreationFlowSnapshot()
  await openDashboardTab('sales')
  const sellerSales = await getDashboardSalesSnapshot(LISTING.title)
  await openDashboardTab('messages')
  const sellerMessages = await getDashboardMessagesSnapshot(LISTING.title, buyerMessage)
  await openDashboardTab('payouts')
  const sellerPayouts = await getDashboardPayoutSnapshot()
  report.seller = {
    login: sellerLogin,
    creationFlow: sellerCreationFlow,
    sales: sellerSales,
    messages: sellerMessages,
    payouts: sellerPayouts,
  }

  await clearCookies()
  await navigate(`${APP_URL}/marketplace`)
  const adminLogin = await ensureLogin(ADMIN.identifier, ADMIN.password)
  const adminSignalsBefore = await getSessionSignals()
  await clickAdminLink()
  await waitFor(`() => location.pathname.includes('/marketplace/admin')`, 15000)
  await delay(1500)
  await clickExactText('Validaciones')
  await waitFor(`
    () => {
      const text = document.body.innerText || ''
      return text.includes('Validaciones pendientes') || text.includes('Pagos reportados por compradores pendientes de validacion manual.')
    }
  `, 15000)
  const adminValidations = await getAdminSurfaceSnapshot(LISTING.title, BUYER.identifier, operationNumber)
  report.admin = {
    login: adminLogin,
    signalsBeforePanel: adminSignalsBefore,
    expectedSurface: 'Validaciones',
    validations: adminValidations,
  }

  report.consoleErrors = consoleEvents.filter((entry) => entry.type === 'error')
  report.pageErrors = pageErrors

  if (QA_OUTPUT) {
    await fs.writeFile(QA_OUTPUT, JSON.stringify(report, null, 2), 'utf8')
  }
  console.log(JSON.stringify(report, null, 2))
  ws.close()
}

run().catch(async (error) => {
  const snapshot = ws ? await evalExpr(`({
    url: location.href,
    body: (document.body.innerText || '').replace(/\\s+/g, ' ').trim().slice(0, 2000)
  })`).catch(() => null) : null
  console.error(JSON.stringify({
    error: error.message,
    snapshot,
    consoleErrors: consoleEvents.filter((entry) => entry.type === 'error'),
    pageErrors,
  }, null, 2))
  process.exitCode = 1
})
