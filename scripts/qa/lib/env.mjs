import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

let loaded = false

export function loadEnv(cwd = process.cwd()) {
  if (loaded) return
  const files = [path.join(cwd, '.env.local'), path.join(cwd, '.env')]
  for (const file of files) {
    if (!existsSync(file)) continue
    const content = readFileSync(file, 'utf8')
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
  loaded = true
}

export function getEnv(name, fallback = null) {
  const value = process.env[name]?.trim()
  return value || fallback
}

export function maskSecret(value) {
  if (!value || value.length < 8) return '***'
  return value.slice(0, 2) + '***' + value.slice(-2)
}
