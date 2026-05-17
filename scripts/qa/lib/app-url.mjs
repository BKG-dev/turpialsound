import { getEnv } from './env.mjs'

export async function checkAppUrl(appUrl = null) {
  const url = appUrl || getEnv('APP_URL', 'http://localhost:3002')
  let lastError

  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)
      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        redirect: 'follow',
      })
      clearTimeout(timeout)
      if (response.ok) return { ok: true, url, status: response.status }
      lastError = new Error(`HTTP ${response.status} from ${url}`)
    } catch (error) {
      lastError = error
      if (attempt < 1) await new Promise((r) => setTimeout(r, 5000))
    }
  }

  return {
    ok: false,
    url,
    error: lastError?.message || 'APP_URL_NOT_200',
    failureCode: 'APP_URL_NOT_200',
  }
}

export async function waitForAppUrl(appUrl = null, maxWaitMs = 30000) {
  const url = appUrl || getEnv('APP_URL', 'http://localhost:3002')
  const started = Date.now()
  while (Date.now() - started < maxWaitMs) {
    const result = await checkAppUrl(url)
    if (result.ok) return result
    await new Promise((r) => setTimeout(r, 2000))
  }
  return { ok: false, url, error: 'APP_URL_NOT_200 after max wait', failureCode: 'APP_URL_NOT_200' }
}
