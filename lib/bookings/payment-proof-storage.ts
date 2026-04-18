const ALLOWED_PAYMENT_PROOF_MIME_TYPES = new Set(['image/jpeg', 'image/jpg'])

export const PAYMENT_PROOF_MAX_SIZE_BYTES = 5 * 1024 * 1024

export interface StorePaymentProofInput {
  file: File
}

export interface StoredPaymentProof {
  proofUrl: string
  mimeType: 'image/jpeg'
  sizeBytes: number
}

function normalizeMimeType(value: string): string {
  return value.trim().toLowerCase()
}

export function isAllowedPaymentProofMimeType(value: string): boolean {
  return ALLOWED_PAYMENT_PROOF_MIME_TYPES.has(normalizeMimeType(value))
}

export async function storePaymentProof(
  input: StorePaymentProofInput,
): Promise<StoredPaymentProof> {
  const fileBuffer = Buffer.from(await input.file.arrayBuffer())
  const base64 = fileBuffer.toString('base64')

  return {
    proofUrl: `data:image/jpeg;base64,${base64}`,
    mimeType: 'image/jpeg',
    sizeBytes: fileBuffer.byteLength,
  }
}
