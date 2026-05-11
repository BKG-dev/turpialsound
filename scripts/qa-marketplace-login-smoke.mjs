import { spawn, spawnSync } from 'node:child_process'
import http from 'node:http'
import { existsSync, readFileSync } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'

const APP_URL = process.env.APP_URL || 'http://localhost:3002'
const DEBUG_PORT = Number(process.env.DEBUG_PORT || String(9300 + Math.floor(Math.random() * 500)))
const DEBUG_HOST = '127.0.0.1'
const BROWSER_PATH_CANDIDATES = [
  process.env.QA_BROWSER_PATH,
  process.env.CHROME_PATH,
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
].filter(Boolean)

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

const USERS = [
  {
    label: 'buyer',
    identifier: requireEnv('QA_BUYER_IDENTIFIER'),
    password: requireEnv('QA_BUYER_PASSWORD'),
  },
  {
    label: 'seller',
    identifier: requireEnv('QA_SELLER_IDENTIFIER'),
    password: requireEnv('QA_SELLER_PASSWORD'),
  },
]

let ws
let msgId = 0
let chrome
let browserPid = null
let browserUserDataDir
let browserPathInUse = null
let browserStdoutPath = null
let browserStderrPath = null
const pending = new Map()
const pageSession = { id: null }
const browserDiagnostics = []

function normalize(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase()
}

function onMessage(raw) {
  const data = JSON.parse(String(raw))
  if (!data.id || !pending.has(data.id)) return
  const { resolve, reject } = pending.get(data.id)
  pending.delete(data.id)
  if (data.error) reject(new Error(data.error.message))
  else resolve(data.result)
}

function noteBrowserDiagnostic(line) {
  const text = String(line || '').trim()
  if (!text) return
  browserDiagnostics.push(text)
  if (browserDiagnostics.length > 12) browserDiagnostics.shift()
}

function getBrowserCandidates() {
  return [...new Set(BROWSER_PATH_CANDIDATES)].filter((candidate) => existsSync(candidate))
}

function escapePowerShell(value) {
  return String(value).replace(/'/g, "''")
}

function isBrowserAlive() {
  if (browserPid) {
    try {
      process.kill(browserPid, 0)
      return true
    } catch {
      return false
    }
  }

  return chrome?.exitCode === null || chrome?.exitCode === undefined
}

function collectBrowserDiagnostics() {
  const lines = [...browserDiagnostics]
  for (const logPath of [browserStdoutPath, browserStderrPath]) {
    if (!logPath || !existsSync(logPath)) continue
    const content = readFileSync(logPath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
    lines.push(...content)
  }
  return [...new Set(lines)].slice(-8)
}

function getDebuggerUrlFromDiagnostics() {
  const diagnostics = collectBrowserDiagnostics()
  for (const line of diagnostics) {
    const match = line.match(/DevTools listening on (ws:\/\/\S+)/)
    if (match) return match[1]
  }
  return null
}

async function cleanupBrowser() {
  try { ws?.close() } catch {}
  ws = null
  if (browserPid) {
    try { process.kill(browserPid) } catch {}
    browserPid = null
  }
  try { chrome?.kill() } catch {}
  chrome = null
  if (browserUserDataDir) {
    await fs.rm(browserUserDataDir, { recursive: true, force: true }).catch(() => {})
    browserUserDataDir = null
  }
  browserStdoutPath = null
  browserStderrPath = null
}

function readJson(url, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = ''
      res.setEncoding('utf8')
      res.on('data', (chunk) => {
        body += chunk
      })
      res.on('end', () => {
        if (res.statusCode !== 200) {
          reject(new Error(`CDP endpoint returned ${res.statusCode}`))
          return
        }

        try {
          resolve(JSON.parse(body))
        } catch (error) {
          reject(error)
        }
      })
    })

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`timeout after ${timeoutMs}ms`))
    })
    req.on('error', reject)
  })
}

function send(method, params = {}, sessionId = pageSession.id) {
  const id = ++msgId
  const payload = { id, method, params }
  if (sessionId) payload.sessionId = sessionId
  ws.send(JSON.stringify(payload))
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      pending.delete(id)
      reject(new Error(`CDP command timeout: ${method}`))
    }, 15000)
    pending.set(id, {
      resolve: (value) => {
        clearTimeout(timeout)
        resolve(value)
      },
      reject: (error) => {
        clearTimeout(timeout)
        reject(error)
      },
    })
  })
}

async function startBrowser(candidate) {
  browserDiagnostics.length = 0
  browserUserDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'turpial-login-smoke-'))
  browserPathInUse = candidate
  browserStdoutPath = path.join(browserUserDataDir, 'stdout.log')
  browserStderrPath = path.join(browserUserDataDir, 'stderr.log')
  const args = [
    `--remote-debugging-address=${DEBUG_HOST}`,
    `--remote-debugging-port=${DEBUG_PORT}`,
    '--headless',
    '--disable-gpu',
    '--in-process-gpu',
    '--no-first-run',
    '--no-default-browser-check',
    `--user-data-dir=${browserUserDataDir}`,
    'about:blank',
  ]

  if (process.platform === 'win32') {
    const quotedArgs = args.map((arg) => `'${escapePowerShell(arg)}'`).join(', ')
    const command = [
      `$p = Start-Process -FilePath '${escapePowerShell(candidate)}'`,
      `-ArgumentList @(${quotedArgs})`,
      '-WindowStyle Hidden',
      `-RedirectStandardOutput '${escapePowerShell(browserStdoutPath)}'`,
      `-RedirectStandardError '${escapePowerShell(browserStderrPath)}'`,
      '-PassThru',
      '; Write-Output $p.Id',
    ].join(' ')
    const result = spawnSync('powershell.exe', ['-NoProfile', '-Command', command], {
      encoding: 'utf8',
    })
    if (result.status !== 0) {
      throw new Error(`Start-Process failed for ${path.basename(candidate)}: ${(result.stderr || result.stdout || '').trim()}`)
    }
    browserPid = Number.parseInt(result.stdout.trim(), 10)
    if (!Number.isFinite(browserPid)) {
      throw new Error(`Unable to capture browser pid for ${path.basename(candidate)}`)
    }
  } else {
    chrome = spawn(candidate, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    chrome.stdout?.on('data', (chunk) => noteBrowserDiagnostic(chunk))
    chrome.stderr?.on('data', (chunk) => noteBrowserDiagnostic(chunk))
    chrome.on('error', (error) => noteBrowserDiagnostic(`spawn error: ${error.message}`))
    chrome.on('exit', (code, signal) => noteBrowserDiagnostic(`browser exit code=${code} signal=${signal}`))
  }

  await delay(1200)
}

async function initializeBrowser() {
  const browserCandidates = getBrowserCandidates()
  if (browserCandidates.length === 0) {
    throw new Error('No browser candidate found. Set QA_BROWSER_PATH or CHROME_PATH.')
  }

  const errors = []

  for (const candidate of browserCandidates) {
    try {
      await startBrowser(candidate)
      await connectBrowser()
      return
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error))
      await cleanupBrowser()
    }
  }

  throw new Error(errors.join(' | '))
}

async function connectBrowser() {
  let debuggerUrl = null
  let lastError
  for (let attempt = 0; attempt < 45; attempt += 1) {
    if (!isBrowserAlive()) {
      const diagnostics = collectBrowserDiagnostics().join(' | ') || 'no diagnostics'
      throw new Error(`Browser exited before CDP was ready (${path.basename(browserPathInUse || 'unknown')}): ${diagnostics}`)
    }

    try {
      debuggerUrl = getDebuggerUrlFromDiagnostics()
      if (debuggerUrl) break
      const version = await readJson(`http://${DEBUG_HOST}:${DEBUG_PORT}/json/version`, 2500)
      debuggerUrl = version.webSocketDebuggerUrl
      if (debuggerUrl) break
    } catch (error) {
      lastError = error
    }

    await delay(250 + attempt * 50)
  }
  if (!debuggerUrl) {
    const diagnostics = collectBrowserDiagnostics().join(' | ')
    const message = lastError instanceof Error ? lastError.message : String(lastError || 'unknown CDP error')
    throw new Error(`CDP unavailable for ${path.basename(browserPathInUse || 'unknown')}: ${message}${diagnostics ? ` | ${diagnostics}` : ''}`)
  }

  ws = new WebSocket(debuggerUrl)
  await new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('CDP websocket open timeout')), 15000)
    ws.addEventListener('open', () => {
      clearTimeout(timeout)
      resolve()
    }, { once: true })
    ws.addEventListener('error', (error) => {
      clearTimeout(timeout)
      reject(error)
    }, { once: true })
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
  await send('Page.navigate', { url })
  await waitFor(`() => document.readyState === 'complete'`, 15000)
  await delay(500)
}

async function clickLoginTrigger() {
  const clicked = await evalExpr(`
    (() => {
      const normalize = ${normalize.toString()}
      const triggers = ['entrar', 'iniciar sesion', 'iniciar']
      const nodes = Array.from(document.querySelectorAll('button, a, [role="button"], [role="tab"]'))
      const match = nodes.find((el) => {
        const text = normalize(el.innerText || el.textContent || '')
        return triggers.some((trigger) => text === trigger || text.includes(trigger))
      })
      if (!match) return false
      match.click()
      return true
    })()
  `)
  if (!clicked) throw new Error('No se pudo abrir el modal de login marketplace')
}

async function clickLogoutIfPresent() {
  const clicked = await evalExpr(`
    (() => {
      const normalize = ${normalize.toString()}
      const nodes = Array.from(document.querySelectorAll('button, a, [role="button"], [role="tab"]'))
      const match = nodes.find((el) => normalize(el.innerText || el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || '') === 'salir')
      if (!match) return false
      match.click()
      return true
    })()
  `)
  if (clicked) await delay(700)
  return clicked
}

async function setInput(hints, value, typeHint = null) {
  const ok = await evalExpr(`
    (() => {
      const normalize = ${normalize.toString()}
      const hints = ${JSON.stringify(hints.map(normalize))}
      const expectedType = ${JSON.stringify(typeHint)}
      const hasHint = (text) => hints.some((hint) => normalize(text).includes(hint))
      let field = Array.from(document.querySelectorAll('input')).find((el) => {
        const type = (el.getAttribute('type') || '').toLowerCase()
        const placeholder = el.getAttribute('placeholder') || ''
        const ariaLabel = el.getAttribute('aria-label') || ''
        const name = el.getAttribute('name') || ''
        return (!expectedType || type === expectedType) && (hasHint(placeholder) || hasHint(ariaLabel) || hasHint(name))
      }) || null
      if (!field) {
        const label = Array.from(document.querySelectorAll('label')).find((el) => hasHint(el.innerText || el.textContent || ''))
        field = label?.closest('div')?.querySelector('input') || label?.parentElement?.querySelector('input') || null
      }
      if (!field && expectedType) {
        field = Array.from(document.querySelectorAll('input')).find((el) => (el.getAttribute('type') || '').toLowerCase() === expectedType) || null
      }
      if (!field) return false
      const descriptor = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), 'value')
      if (descriptor?.set) descriptor.set.call(field, ${JSON.stringify(value)})
      else field.value = ${JSON.stringify(value)}
      field.dispatchEvent(new Event('input', { bubbles: true }))
      field.dispatchEvent(new Event('change', { bubbles: true }))
      return true
    })()
  `)
  if (!ok) throw new Error(`No se pudo llenar el campo: ${hints.join(', ')}`)
}

async function submitLogin() {
  const submitted = await evalExpr(`
    (() => {
      const normalize = ${normalize.toString()}
      const forms = Array.from(document.querySelectorAll('form'))
      const form = forms.find((candidate) => {
        const text = normalize(candidate.innerText || candidate.textContent || '')
        return text.includes('email') || text.includes('usuario') || text.includes('contrasena')
      }) || forms[0] || null
      const scope = form || document
      const button = Array.from(scope.querySelectorAll('button, input[type="submit"]')).find((el) => {
        const text = normalize(el.innerText || el.textContent || el.getAttribute('value') || '')
        const type = (el.getAttribute('type') || '').toLowerCase()
        return type === 'submit' || text.includes('iniciar sesion') || text === 'entrar'
      })
      if (!button) return false
      button.click()
      return true
    })()
  `)
  if (!submitted) throw new Error('No se pudo enviar el formulario de login')
}

async function getSnapshot() {
  return evalExpr(`
    (() => {
      const normalize = ${normalize.toString()}
      const body = normalize(document.body.innerText || '')
      const buttons = Array.from(document.querySelectorAll('button, a, [role="button"], [role="tab"]'))
        .map((el) => normalize(el.innerText || el.textContent || ''))
        .filter(Boolean)
      return {
        url: location.href,
        hasLogout: body.includes('salir') || buttons.some((text) => text.includes('salir')),
        hasLoginTrigger: buttons.some((text) => text === 'entrar' || text.includes('iniciar sesion')),
        hasLoginError: body.includes('usuario o contrasena incorrectos') || body.includes('incorrectos'),
        buttons: buttons.slice(0, 20),
        visibleSignals: body
          .split('\\n')
          .map((line) => line.trim())
          .filter((line) => line.includes('salir') || line.includes('buyeria') || line.includes('selleria') || line.includes('incorrectos'))
          .slice(0, 10),
      }
    })()
  `)
}

async function loginAs(user) {
  await send('Network.clearBrowserCookies')
  await send('Network.clearBrowserCache')
  await navigate(`${APP_URL}/marketplace?qaLogin=${encodeURIComponent(user.label)}-${Date.now()}`)
  await clickLogoutIfPresent()
  await waitFor(`() => {
    const normalize = ${normalize.toString()}
    const buttons = Array.from(document.querySelectorAll('button, a, [role="button"], [role="tab"]'))
      .map((el) => normalize(el.innerText || el.textContent || ''))
      .filter(Boolean)
    return buttons.some((text) => text === 'entrar' || text.includes('iniciar sesion'))
  }`, 15000)
  await clickLoginTrigger()
  await waitFor(`() => {
    const text = document.body.innerText || ''
    return text.includes('Email o usuario') || text.includes('Email') || text.includes('Usuario')
  }`, 10000)
  await setInput(['Email o usuario', 'Email', 'Correo', 'Usuario'], user.identifier)
  await setInput(['Contrasena', 'Password'], user.password, 'password')
  await submitLogin()
  await waitFor(`() => {
    const normalize = ${normalize.toString()}
    const text = document.body.innerText || ''
    const body = normalize(text)
    const buttons = Array.from(document.querySelectorAll('button, a, [role="button"], [role="tab"]'))
      .map((el) => normalize(el.innerText || el.textContent || el.getAttribute('aria-label') || el.getAttribute('title') || ''))
      .filter(Boolean)
    return buttons.some((button) => button.includes('salir'))
      || body.includes('usuario o contrasena incorrectos')
      || body.includes('incorrectos')
  }`, 15000)

  const snapshot = await getSnapshot()
  if (!snapshot.hasLogout || snapshot.hasLoginError) {
    throw new Error(`${user.label} no pudo iniciar sesion`)
  }

  return {
    label: user.label,
    identifier: user.identifier,
    loginOk: true,
    url: snapshot.url,
    authSignals: snapshot.buttons
      .filter((button) => ['mensajes', 'mi panel', 'salir'].some((signal) => button.includes(signal)))
      .slice(0, 10),
  }
}

async function main() {
  await initializeBrowser()

  const results = []
  for (const user of USERS) {
    results.push(await loginAs(user))
  }

  console.log(JSON.stringify({
    ok: true,
    appUrl: APP_URL,
    browser: path.basename(browserPathInUse || ''),
    users: results,
  }, null, 2))
}

main().catch(async (error) => {
  const snapshot = ws ? await getSnapshot().catch(() => null) : null
  console.error(JSON.stringify({
    ok: false,
    error: error.message,
    browser: browserPathInUse ? path.basename(browserPathInUse) : null,
    snapshot,
  }, null, 2))
  process.exitCode = 1
}).finally(() => {
  cleanupBrowser().catch(() => {})
})
