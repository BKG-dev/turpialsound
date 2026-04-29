import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

const APP_URL = process.env.APP_URL || 'http://localhost:3002'
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const DEBUG_PORT = Number(process.env.DEBUG_PORT || '9222')
const REUSE_BROWSER = process.env.REUSE_BROWSER === '1'

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
  for (let attempt = 0; attempt < 20; attempt += 1) {
    try {
      version = await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/version`).then((r) => r.json())
      break
    } catch {
      await delay(500)
    }
  }
  if (!version) throw new Error('Could not connect to browser')

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
  await send('Page.navigate', { url })
  await delay(2000)
}

async function clickByAriaLabel(label) {
  const ok = await evalExpr(`
    (() => {
      const label = ${JSON.stringify(label)}
      const el = Array.from(document.querySelectorAll('[aria-label]'))
        .find(e => e.getAttribute('aria-label') === label)
      if (!el) return false
      el.click()
      return true
    })()
  `)
  if (!ok) throw new Error(`Could not click element with aria-label: ${label}`)
  await delay(1000)
}

async function setAssistantInput(value) {
  const ok = await evalExpr(`
    (() => {
      const input = document.querySelector('input[placeholder*="Pregunta"]')
      if (!input) return false
      input.value = ${JSON.stringify(value)}
      input.dispatchEvent(new Event('input', { bubbles: true }))
      return true
    })()
  `)
  if (!ok) throw new Error('Could not set assistant input')
  await delay(500)
}

async function submitAssistant() {
  const ok = await evalExpr(`
    (() => {
      const btn = document.querySelector('button[aria-label="Enviar pregunta"]')
      if (!btn || btn.disabled) return false
      btn.click()
      return true
    })()
  `)
  if (!ok) throw new Error('Could not submit assistant')
  await delay(2000)
}

async function run() {
  if (!REUSE_BROWSER) {
    const userDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'turpial-qa-assistant-'))
    const chrome = spawn(CHROME, [
      `--remote-debugging-port=${DEBUG_PORT}`,
      '--headless=new',
      '--user-data-dir=${userDataDir}',
      'about:blank',
    ], { stdio: 'ignore', detached: true })
    chrome.unref()
    await delay(1500)
  }

  await connectBrowser()
  await navigate(`${APP_URL}/marketplace`)

  // Ensure FAB is visible
  await waitFor('() => !!document.querySelector("[aria-label*=\'Abrir Asistente\']")')
  await clickByAriaLabel('Abrir Asistente Turpial. Informacion publica sobre compras, ventas y uso del marketplace')

  // Interact with Assistant
  await waitFor('() => !!document.querySelector("input[placeholder*=\'Pregunta\']")')
  await setAssistantInput('Como compro?')
  await submitAssistant()

  // Verify response
  const responseReceived = await waitFor(`
    () => {
      const messages = document.body.innerText
      return messages.includes('Para comprar') || messages.includes('Puedes')
    }
  `, 10000)

  if (!responseReceived) throw new Error('Assistant did not return a response')

  console.log('Smoke test passed')
  ws.close()
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
