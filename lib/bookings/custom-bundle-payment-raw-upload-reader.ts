export interface ReadCustomBundlePaymentRawUploadBodyInput {
  body: ReadableStream<Uint8Array> | null
  declaredContentLength: number | null
  maxUploadBytes: number
  maxRequestBytes: number
}

export interface CustomBundlePaymentRawUploadReaderSuccess {
  ok: true
  bytes: Uint8Array
  bytesRead: number
  readerCancelled: boolean
}

export interface CustomBundlePaymentRawUploadReaderFailure {
  ok: false
  code:
    | 'BODY_MISSING'
    | 'BODY_READ_FAILED'
    | 'BODY_CHUNK_INVALID'
    | 'BODY_EMPTY'
    | 'BODY_TOO_LARGE'
    | 'BODY_SIZE_MISMATCH'
  message: string
  bytesRead: number
  readerCancelled: boolean
}

export type CustomBundlePaymentRawUploadReaderResult =
  | CustomBundlePaymentRawUploadReaderSuccess
  | CustomBundlePaymentRawUploadReaderFailure

function makeFailure(
  code: CustomBundlePaymentRawUploadReaderFailure['code'],
  message: string,
  bytesRead: number,
  readerCancelled: boolean,
): CustomBundlePaymentRawUploadReaderFailure {
  return { ok: false, code, message, bytesRead, readerCancelled }
}

async function cancelReader(
  reader: ReadableStreamDefaultReader<Uint8Array>,
): Promise<void> {
  try {
    await reader.cancel()
  } catch {
    // best-effort cancellation
  }
}

function concatChunks(chunks: readonly Uint8Array[], size: number): Uint8Array {
  const output = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    output.set(chunk, offset)
    offset += chunk.byteLength
  }
  return output
}

export async function readCustomBundlePaymentRawUploadBody(
  input: ReadCustomBundlePaymentRawUploadBodyInput,
): Promise<CustomBundlePaymentRawUploadReaderResult> {
  if (input.body === null) {
    return makeFailure('BODY_MISSING', 'El cuerpo binario no esta disponible.', 0, false)
  }

  if (
    input.declaredContentLength !== null &&
    (!Number.isInteger(input.declaredContentLength) || input.declaredContentLength < 0)
  ) {
    return makeFailure('BODY_READ_FAILED', 'La longitud declarada del cuerpo no es valida.', 0, false)
  }

  if (
    input.declaredContentLength !== null &&
    input.declaredContentLength > input.maxRequestBytes
  ) {
    return makeFailure('BODY_TOO_LARGE', 'El cuerpo binario supera el maximo permitido.', 0, false)
  }

  if (
    input.declaredContentLength !== null &&
    input.declaredContentLength > input.maxUploadBytes
  ) {
    return makeFailure('BODY_TOO_LARGE', 'El cuerpo binario supera el maximo permitido.', 0, false)
  }

  const reader = input.body.getReader()
  const chunks: Uint8Array[] = []
  let bytesRead = 0
  let readerCancelled = false

  try {
    while (true) {
      let step: ReadableStreamReadResult<Uint8Array>
      try {
        step = await reader.read()
      } catch {
        readerCancelled = true
        await cancelReader(reader)
        return makeFailure('BODY_READ_FAILED', 'No se pudo leer el cuerpo binario.', bytesRead, true)
      }

      if (step.done) {
        break
      }

      const chunk = step.value
      if (!(chunk instanceof Uint8Array)) {
        readerCancelled = true
        await cancelReader(reader)
        return makeFailure('BODY_CHUNK_INVALID', 'El cuerpo binario contiene un fragmento invalido.', bytesRead, true)
      }

      const nextBytesRead = bytesRead + chunk.byteLength
      if (nextBytesRead > input.maxUploadBytes || nextBytesRead > input.maxRequestBytes) {
        readerCancelled = true
        await cancelReader(reader)
        return makeFailure('BODY_TOO_LARGE', 'El cuerpo binario supera el maximo permitido.', bytesRead, true)
      }

      if (input.declaredContentLength !== null && nextBytesRead > input.declaredContentLength) {
        readerCancelled = true
        await cancelReader(reader)
        return makeFailure('BODY_SIZE_MISMATCH', 'El tamano real del cuerpo no coincide con lo declarado.', bytesRead, true)
      }

      chunks.push(new Uint8Array(chunk))
      bytesRead = nextBytesRead
    }
  } finally {
    reader.releaseLock()
  }

  if (bytesRead === 0) {
    return makeFailure('BODY_EMPTY', 'El cuerpo binario esta vacio.', 0, readerCancelled)
  }

  if (input.declaredContentLength !== null && bytesRead !== input.declaredContentLength) {
    return makeFailure('BODY_SIZE_MISMATCH', 'El tamano real del cuerpo no coincide con lo declarado.', bytesRead, readerCancelled)
  }

  return {
    ok: true,
    bytes: concatChunks(chunks, bytesRead),
    bytesRead,
    readerCancelled,
  }
}
