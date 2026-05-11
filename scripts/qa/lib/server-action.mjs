export async function callServerAction(actionUrl, payload, opts = {}) {
  const url = actionUrl.startsWith('http') ? actionUrl : `${process.env.APP_URL || 'http://localhost:3002'}${actionUrl}`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
    body: JSON.stringify(payload),
    signal: opts.signal || undefined,
    redirect: 'follow',
  })

  let data
  try {
    data = await response.json()
  } catch {
    data = null
  }

  return {
    ok: response.ok,
    status: response.status,
    data,
  }
}

export function buildServerActionHeaders(sessionToken) {
  if (!sessionToken) return {}
  return {
    Cookie: `mp_session=${sessionToken}`,
  }
}
