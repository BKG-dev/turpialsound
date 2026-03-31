import { readdirSync } from 'fs'
import { join } from 'path'

/**
 * Server-only: scans /public/{basePath} for files matching `{prefix}.jpg`
 * and `{prefix}{N}.jpg`, returns ordered array of public URL paths.
 *
 * Usage in Server Components only — never import in 'use client' files.
 */
export function getPublicImages(prefix: string, basePath = '/images'): string[] {
  try {
    const dir = join(process.cwd(), 'public', basePath.replace(/^\//, ''))
    const files = readdirSync(dir)
    const regex = new RegExp(`^${prefix}(\\d+)?\\.jpg$`, 'i')

    return files
      .filter((f) => regex.test(f))
      .sort((a, b) => {
        const numOf = (s: string) =>
          s === `${prefix}.jpg` ? -1 : parseInt(s.replace(prefix, '').replace('.jpg', ''), 10)
        return numOf(a) - numOf(b)
      })
      .map((f) => `${basePath}/${f}`)
  } catch {
    return []
  }
}
