import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { existsSync, readFileSync } from 'node:fs'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

const APP_URL = process.env.APP_URL || 'http://localhost:3002'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const DEBUG_PORT = Number(process.env.DEBUG_PORT || '9222')
const REUSE_BROWSER = process.env.REUSE_BROWSER === '1'

function loadEnvFile(filePath) {
  if (!existsSync(filePath)) return
  const content = readFileSync(filePath, 'utf8')
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  }
}

function requireEnv(name) {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} no disponible en .env.local/.env`)
  return value
}

loadEnvFile(path.join(process.cwd(), '.env.local'))
loadEnvFile(path.join(process.cwd(), '.env'))

const SELLER = {
  identifier: requireEnv('QA_SELLER_IDENTIFIER'),
  password: requireEnv('QA_SELLER_PASSWORD'),
}
const SELLER_SIGNAL = SELLER.identifier.toLowerCase()

let ws
let msgId = 0
const pending = new Map()
const pageSession = { id: null }
const consoleEvents = []
const pageErrors = []

function onMessage(raw) {
  const data = JSON.parse(String(raw))

  if (data.method === 'Runtime.consoleAPICalled') {
    const text = (data.params?.args || [])
      .map((arg) => arg.value ?? arg.description ?? '')
      .join(' ')
      .trim()
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
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.text ?? 'Runtime.evaluate failed')
  }
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
  await delay(1600)
}

async function clickByText(text, selector = 'button, a, [role="button"], [role="tab"]') {
  const ok = await evalExpr(`
    (() => {
      const target = ${JSON.stringify(text)}
      const nodes = Array.from(document.querySelectorAll(${JSON.stringify(selector)}))
      const match = nodes.find((el) => (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim() === target)
      if (!match) return false
      match.click()
      return true
    })()
  `)
  if (!ok) throw new Error(`Could not click text: ${text}`)
  console.log('CLICK', text)
  await delay(900)
}

async function clickByPartialText(text, selector = 'button, a, [role="button"], [role="tab"]') {
  const ok = await evalExpr(`
    (() => {
      const target = ${JSON.stringify(text)}
      const nodes = Array.from(document.querySelectorAll(${JSON.stringify(selector)}))
      const match = nodes.find((el) => (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim().includes(target))
      if (!match) return false
      match.click()
      return true
    })()
  `)
  if (!ok) throw new Error(`Could not click partial text: ${text}`)
  console.log('CLICK', text)
  await delay(900)
}

async function clickContainsText(text, selector = 'button, a, [role="button"]') {
  const ok = await evalExpr(`
    (() => {
      const target = ${JSON.stringify(text)}
      const nodes = Array.from(document.querySelectorAll(${JSON.stringify(selector)}))
      const match = nodes.find((el) => (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim().includes(target))
      if (!match) return false
      match.click()
      return true
    })()
  `)
  if (!ok) throw new Error(`Could not click text containing: ${text}`)
  console.log('CLICK', text)
  await delay(900)
}

async function setInputByLoginHint(hints, value, typeHint = null) {
  const ok = await evalExpr(`
    (() => {
      const hints = ${JSON.stringify(hints)}
      const expectedType = ${JSON.stringify(typeHint)}
      const normalize = (text) =>
        String(text || '')
          .normalize('NFD')
          .replace(/[\\u0300-\\u036f]/g, '')
          .trim()
          .toLowerCase()
      const hasHint = (text) => {
        const normalized = normalize(text)
        return hints.some((hint) => normalized.includes(normalize(hint)))
      }

      const label = Array.from(document.querySelectorAll('label')).find((el) => hasHint(el.innerText || el.textContent || ''))
      let input =
        label?.closest('div')?.querySelector('input, textarea, select') ||
        label?.parentElement?.querySelector('input, textarea, select')

      if (!input) {
        input = Array.from(document.querySelectorAll('input, textarea'))
          .find((el) => {
            const placeholder = el.getAttribute('placeholder') || ''
            const ariaLabel = el.getAttribute('aria-label') || ''
            const name = el.getAttribute('name') || ''
            const type = el.getAttribute('type') || ''
            const matchesHint = hasHint(placeholder) || hasHint(ariaLabel) || hasHint(name)
            const matchesType = !expectedType || type === expectedType
            return matchesHint && matchesType
          }) || null
      }

      if (!input && expectedType) {
        input = Array.from(document.querySelectorAll('input, textarea'))
          .find((el) => (el.getAttribute('type') || '') === expectedType) || null
      }

      if (!input) return false
      const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(input), 'value')
      if (descriptor?.set) descriptor.set.call(input, ${JSON.stringify(value)})
      else input.value = ${JSON.stringify(value)}
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('change', { bubbles: true }))
      return true
    })()
  `)
  if (!ok) throw new Error(`Could not set login input for hints: ${hints.join(', ')}`)
  await delay(250)
}

async function clearCookies() {
  await send('Network.clearBrowserCookies')
  await delay(350)
}

async function waitForLoginForm(timeoutMs = 5000) {
  return waitFor(`
    () => {
      const text = document.body.innerText || ''
      return text.includes('Email o usuario') || text.includes('Email') || text.includes('Usuario')
    }
  `, timeoutMs)
}

async function ensureLoginFormOpen() {
  const loginTriggers = ['Iniciar sesión', 'Entrar', 'Iniciar']
  for (let attempt = 0; attempt < 3; attempt += 1) {
    for (const triggerText of loginTriggers) {
      try {
        await clickContainsText(triggerText)
        await waitForLoginForm(4000)
        return true
      } catch {}
      await delay(400)
    }
  }

  await clickContainsText('Iniciar', 'button, a, [role=\"button\"], [role=\"tab\"]')
  await waitForLoginForm(5000)
  return true
}

async function getMarketplaceSessionState() {
  return evalExpr(`
    (() => {
      const normalize = (text) =>
        String(text || '')
          .normalize('NFD')
          .replace(/[\\u0300-\\u036f]/g, '')
          .replace(/\\s+/g, ' ')
          .trim()
          .toLowerCase()

      const texts = Array.from(document.querySelectorAll('a, button, span, div'))
        .map((el) => (el.innerText || el.textContent || '').replace(/\\s+/g, ' ').trim())
        .filter(Boolean)

      return {
        url: location.href,
        hasLogout: texts.some((text) => normalize(text).includes('salir')),
        hasSellerLabel: texts.some((text) => normalize(text).includes('vendedor')),
        hasDisplayName: texts.some((text) => normalize(text).includes(${JSON.stringify(SELLER_SIGNAL)})),
        hasAdminLabel: texts.some((text) => normalize(text).includes('admin')),
        visibleSignals: texts.filter((text) => {
          const value = normalize(text)
          return value.includes('salir') || value.includes(${JSON.stringify(SELLER_SIGNAL)}) || value.includes('vendedor') || value.includes('admin')
        }).slice(0, 12),
      }
    })()
  `)
}

async function getLoginSubmitDiagnostics() {
  return evalExpr(`
    (() => {
      const normalize = (text) =>
        String(text || '')
          .normalize('NFD')
          .replace(/[\\u0300-\\u036f]/g, '')
          .replace(/\\s+/g, ' ')
          .trim()

      const forms = Array.from(document.querySelectorAll('form'))
      const targetForm = forms.find((form) => {
        const text = normalize(form.innerText || form.textContent || '')
        return text.includes('Iniciar sesion') || text.includes('Email o usuario') || text.includes('Contrasena')
      }) || forms[0] || null

      const buttons = targetForm
        ? Array.from(targetForm.querySelectorAll('button, input[type="submit"]'))
        : []

      const submitButton = buttons.find((button) => {
        const text = normalize(button.innerText || button.textContent || button.getAttribute('value') || '')
        const type = (button.getAttribute('type') || '').toLowerCase()
        return text.includes('Iniciar sesion') || type === 'submit'
      }) || buttons[0] || null

      return {
        formFound: !!targetForm,
        buttonFound: !!submitButton,
        buttonText: submitButton ? normalize(submitButton.innerText || submitButton.textContent || submitButton.getAttribute('value') || '') : null,
        buttonType: submitButton ? submitButton.getAttribute('type') : null,
        buttonDisabled: submitButton ? !!submitButton.disabled : null,
      }
    })()
  `)
}

async function triggerLoginSubmit() {
  const ok = await evalExpr(`
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
  if (!ok) throw new Error('Could not trigger login submit')
  console.log('CLICK', 'Login submit')
  await delay(1200)
}

async function getDashboardSnapshot() {
  return evalExpr(`
    (() => {
      const normalize = (text) => String(text || '').replace(/\\s+/g, ' ').trim()
      const nodes = Array.from(document.querySelectorAll('h1, h2, h3, button, a, p, span, div'))
      const texts = nodes.map((el) => normalize(el.innerText || el.textContent || '')).filter(Boolean)
      const uniqueTexts = Array.from(new Set(texts))
      const bodyText = normalize(document.body.innerText || '')
      const tabControls = Array.from(document.querySelectorAll('button, a, [role="tab"]'))
        .map((el) => normalize(el.innerText || el.textContent || ''))
        .filter(Boolean)

      const visibleTab =
        tabControls.find((text) => text === 'Mis ventas') ||
        tabControls.find((text) => text === 'Cobros') ||
        tabControls.find((text) => text === 'Mis publicaciones') ||
        null

      return {
        url: location.href,
        title: document.title,
        headings: Array.from(document.querySelectorAll('h1, h2, h3')).map((el) => normalize(el.innerText || el.textContent || '')).filter(Boolean).slice(0, 12),
        keyTexts: uniqueTexts.slice(0, 80),
        bodyText,
        tabControls: Array.from(new Set(tabControls)).slice(0, 24),
        visibleTab,
        hasLoading: uniqueTexts.some((text) => /cargando|loading|actualizando/i.test(text)),
      }
    })()
  `)
}

async function getCobrosSnapshot() {
  return evalExpr(`
    (() => {
      const normalize = (text) => String(text || '').replace(/\\s+/g, ' ').trim()
      const bodyText = normalize(document.body.innerText || '')
      const methodState =
        bodyText.includes('Tus datos de cobro ya estan configurados')
          ? 'configured'
          : bodyText.includes('Aun no necesitas registrar datos de cobro')
            ? 'not-needed'
            : bodyText.includes('Sin datos de cobro')
              ? 'missing'
              : bodyText.includes('Completa tus datos de cobro para poder recibir la liberacion del escrow')
                ? 'needs-setup'
                : 'unknown'

      const blocks = [
        bodyText.includes('Datos de cobro del vendedor') ? 'Datos de cobro del vendedor' : null,
        bodyText.includes('Flujo manual temporal') ? 'Flujo manual temporal' : null,
        bodyText.includes('Resumen operativo') ? 'Resumen operativo' : null,
        bodyText.includes('Metodos registrados') ? 'Metodos registrados' : null,
        bodyText.includes('Total de ventas') ? 'Total de ventas' : null,
        bodyText.includes('Neto a recibir') ? 'Neto a recibir' : null,
        bodyText.includes('Pendiente por pagar') ? 'Pendiente por pagar' : null,
        bodyText.includes('Validaciones pendientes') ? 'Validaciones pendientes' : null,
        bodyText.includes('Escrow activo') ? 'Escrow activo' : null,
        bodyText.includes('Payouts listos') ? 'Payouts listos' : null,
        bodyText.includes('Sin datos de cobro') ? 'Sin datos de cobro' : null,
      ].filter(Boolean)

      const summary = {
        pendingValidations: /Validaciones pendientes\\s+(\\d+)/i.exec(bodyText)?.[1] || null,
        escrowActive: /Escrow activo\\s+(\\d+)/i.exec(bodyText)?.[1] || null,
        payoutsReady: /Payouts listos\\s+(\\d+)/i.exec(bodyText)?.[1] || null,
        totalToReceive: /Total a recibir\\s+([^\\n]+)/i.exec(bodyText)?.[1] || null,
      }
      const pick = (label) => {
        const idx = bodyText.toUpperCase().indexOf(label.toUpperCase())
        if (idx < 0) return null
        return bodyText.slice(idx, idx + 90)
      }

      const messages = [
        bodyText.includes('Este flujo se activa solo cuando ya existe escrow activo o payout pendiente.')
          ? 'Este flujo se activa solo cuando ya existe escrow activo o payout pendiente.'
          : null,
        bodyText.includes('Completa tus datos de cobro para poder recibir la liberacion del escrow')
          ? 'Completa tus datos de cobro para poder recibir la liberacion del escrow'
          : null,
        bodyText.includes('Ya tienes transacciones en escrow o payout pendiente. Sin este paso no se puede completar el pago al vendedor.')
          ? 'Ya tienes transacciones en escrow o payout pendiente. Sin este paso no se puede completar el pago al vendedor.'
          : null,
        bodyText.includes('Aun no necesitas registrar datos de cobro.')
          ? 'Aun no necesitas registrar datos de cobro.'
          : null,
        bodyText.includes('Tus datos de cobro ya estan configurados.')
          ? 'Tus datos de cobro ya estan configurados.'
          : null,
      ].filter(Boolean)

      return {
        heading:
          Array.from(document.querySelectorAll('h1, h2, h3'))
            .map((el) => normalize(el.innerText || el.textContent || ''))
            .find((text) => text.includes('Datos de cobro del vendedor') || text.includes('Resumen operativo')) || null,
        blocks: Array.from(new Set(blocks)).slice(0, 6),
        kpis: {
          totalVentas: pick('TOTAL DE VENTAS'),
          comision: pick('COMISION PLATAFORMA') || pick('COMISION 5%'),
          feeBancario: pick('FEE BANCARIO 0.03%'),
          neto: pick('NETO A RECIBIR'),
          pendiente: pick('PENDIENTE POR PAGAR'),
        },
        summary,
        methodState,
        messages,
        hasListOrCards: bodyText.includes('Metodos registrados') || bodyText.includes('Sin datos de cobro') || bodyText.includes('Predeterminado'),
      }
    })()
  `)
}

async function run() {
  if (!REUSE_BROWSER) {
    const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'turpial-qa-seller-'))
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
  await clearCookies()

  const report = {
    route: `${APP_URL}/marketplace`,
    sellerUser: SELLER.identifier,
    finalUrl: null,
    visibleTitle: null,
    initialSection: null,
    initialElements: [],
    interaction: null,
    interactionResult: null,
    loginSubmit: null,
    consoleErrors: [],
    pageErrors: [],
  }

  await navigate(report.route)
  report.loginState = await getMarketplaceSessionState()
  if (!report.loginState?.hasLogout) {
    await ensureLoginFormOpen()
    await setInputByLoginHint(['Email o usuario', 'Email', 'Correo', 'Usuario'], SELLER.identifier)
    await setInputByLoginHint(['Contraseña', 'Contrasena', 'Password'], SELLER.password, 'password')
    report.loginSubmit = await getLoginSubmitDiagnostics()
    await triggerLoginSubmit()

    await waitFor(`
      () => {
        const normalize = (v) => String(v || '').normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').replace(/\\s+/g, ' ').trim().toLowerCase()
        const body = normalize(document.body.innerText || '')
        const buttons = Array.from(document.querySelectorAll('button, a, [role="button"], [role="tab"]'))
          .map((el) => normalize(el.innerText || el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || ''))
          .filter(Boolean)
        return body.includes('salir')
          || body.includes('mi panel')
          || buttons.some((text) => text.includes('salir') || text.includes('mi panel'))
      }
    `, 15000)

    report.loginState = await getMarketplaceSessionState()
  }

  await navigate(`${APP_URL}/marketplace/dashboard?tab=sales`)
  await waitFor(`
    () => {
      return location.pathname.includes('/marketplace/dashboard')
    }
  `, 15000)
  await delay(3000)

  const initialSnapshot = await getDashboardSnapshot()
  report.finalUrl = initialSnapshot.url
  report.visibleTitle = initialSnapshot.headings[0] || initialSnapshot.title
  report.initialSection =
    (initialSnapshot.bodyText.includes('Mis ventas') && 'Mis ventas') ||
    initialSnapshot.visibleTab ||
    'sales'
  report.initialElements = [
    initialSnapshot.bodyText.includes('Market Command Center') ? 'Market Command Center' : null,
    initialSnapshot.bodyText.includes('Mis ventas') ? 'Mis ventas' : null,
    initialSnapshot.bodyText.includes('Cobros') ? 'Cobros' : null,
    initialSnapshot.bodyText.includes('Mis compras') ? 'Mis compras' : null,
    initialSnapshot.bodyText.includes('Mensajes') ? 'Mensajes' : null,
    initialSnapshot.bodyText.includes('Completa tus datos de cobro para poder recibir la liberacion del escrow') ? 'Completa tus datos de cobro para poder recibir la liberacion del escrow' : null,
    initialSnapshot.bodyText.includes('Sin transacciones activas') ? 'Sin transacciones activas' : null,
    initialSnapshot.bodyText.includes('QA manual temporal user') ? 'QA manual temporal user' : null,
    initialSnapshot.bodyText.includes('prueva de venta fluijo completo') ? 'prueva de venta fluijo completo' : null,
  ].filter(Boolean).slice(0, 6)
  report.initialTabControls = initialSnapshot.tabControls

  report.interaction = 'Cobros'
  const interactionUrlBefore = await evalExpr('location.href')
  if (!initialSnapshot.tabControls.some((text) => text.includes('Cobros'))) {
    throw new Error(`Cobros tab not visible. Tabs: ${initialSnapshot.tabControls.join(' | ')}`)
  }
  await clickByPartialText('Cobros')
  await waitFor(`
    () => {
      const text = document.body.innerText || ''
      return text.includes('Datos de cobro del vendedor') ||
        text.includes('Metodos registrados') ||
        text.includes('Aun no necesitas registrar datos de cobro') ||
        text.includes('Tus datos de cobro ya estan configurados')
    }
  `, 15000)
  await delay(1200)

  const cobrosSnapshot = await getCobrosSnapshot()
  const payoutSnapshot = await getDashboardSnapshot()
  report.interactionResult = {
    urlBefore: interactionUrlBefore,
    urlAfter: payoutSnapshot.url,
    heading: cobrosSnapshot.heading || payoutSnapshot.headings[0] || null,
    elements: cobrosSnapshot.blocks,
    kpis: cobrosSnapshot.kpis,
    summary: cobrosSnapshot.summary,
    methodState: cobrosSnapshot.methodState,
    messages: cobrosSnapshot.messages,
    hasListOrCards: cobrosSnapshot.hasListOrCards,
    hasLoading: payoutSnapshot.hasLoading,
  }

  report.consoleErrors = consoleEvents.filter((entry) => entry.type === 'error')
  report.pageErrors = pageErrors

  console.log(JSON.stringify(report, null, 2))
  ws.close()
}

run().catch(async (error) => {
  const snapshot = ws ? await getDashboardSnapshot().catch(() => null) : null
  console.error(JSON.stringify({
    error: error.message,
    finalUrl: snapshot?.url || null,
    visibleTitle: snapshot?.headings?.[0] || snapshot?.title || null,
    keyElements: snapshot?.keyTexts?.slice(0, 20) || [],
    tabControls: snapshot?.tabControls || [],
    bodyExcerpt: snapshot?.bodyText?.slice(0, 1200) || '',
    consoleErrors: consoleEvents.filter((entry) => entry.type === 'error'),
    pageErrors,
  }, null, 2))
  process.exitCode = 1
})
