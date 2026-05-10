import crypto from 'node:crypto'

function safeEqualHex(aHex: string, bHex: string): boolean {
  const a = Buffer.from(aHex, 'hex')
  const b = Buffer.from(bHex, 'hex')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export function verifyMetaSignature(input: {
  appSecret: string
  rawBody: string
  signatureHeader: string | null
}): boolean {
  const { appSecret, rawBody, signatureHeader } = input
  if (!signatureHeader) return false

  const [prefix, receivedHex] = signatureHeader.split('=')
  if (prefix !== 'sha256' || !receivedHex) return false

  const expectedHex = crypto.createHmac('sha256', appSecret).update(rawBody).digest('hex')
  return safeEqualHex(expectedHex, receivedHex)
}
