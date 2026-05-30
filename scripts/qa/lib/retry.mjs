import { FailureCode, classifyError, formatFailure } from './failures.mjs'

const RETRY_LIMITS = {
  [FailureCode.ENV_MISSING]: 1,
  [FailureCode.APP_URL_NOT_200]: 2,
  [FailureCode.BROWSER_CDP_BLOCKED]: 2,
  [FailureCode.SELECTOR_MISSING]: 2,
  [FailureCode.LOGIN_FAILED]: 2,
  [FailureCode.LISTING_CREATE_FAILED]: 2,
  [FailureCode.LISTING_NOT_VISIBLE_HOME]: 3,
  [FailureCode.QUESTION_NOT_CREATED]: 2,
  [FailureCode.ANSWER_NOT_VISIBLE]: 3,
  [FailureCode.PURCHASE_NOT_CREATED]: 2,
  [FailureCode.PAYMENT_PROOF_UPLOAD_FAILED]: 2,
  [FailureCode.ADMIN_REVIEW_NOT_VISIBLE]: 2,
  [FailureCode.STATUS_TRANSITION_FAILED]: 1,
  [FailureCode.NOTIFICATION_MISSING]: 3,
  [FailureCode.DASHBOARD_BAD_STATE]: 2,
  [FailureCode.PROTECTED_PROOF_ACCESS_FAILED]: 1,
  [FailureCode.UNKNOWN]: 1,
}

export function getRetryLimit(failureCode) {
  return RETRY_LIMITS[failureCode] ?? 1
}

export async function withRetry(fn, { maxAttempts = null, failureCode = null, delayMs = 2000 } = {}) {
  let lastError
  const effectiveMax = maxAttempts ?? getRetryLimit(failureCode) ?? 2

  for (let attempt = 0; attempt < effectiveMax; attempt++) {
    try {
      const result = await fn()
      return { ok: true, result, attempts: attempt + 1 }
    } catch (error) {
      lastError = error
      const code = failureCode || classifyError(error)
      const limit = getRetryLimit(code)
      if (attempt + 1 >= limit) {
        return { ok: false, failure: formatFailure(code, error.message), attempts: attempt + 1 }
      }
      await new Promise((r) => setTimeout(r, delayMs))
    }
  }

  const code = failureCode || classifyError(lastError)
  return { ok: false, failure: formatFailure(code, lastError?.message), attempts: effectiveMax }
}
