export const FailureCode = Object.freeze({
  ENV_MISSING: 'ENV_MISSING',
  PREVIEW_NOT_BKG: 'PREVIEW_NOT_BKG',
  APP_URL_NOT_200: 'APP_URL_NOT_200',
  DB_MISSING_TABLE: 'DB_MISSING_TABLE',
  QA_USER_MISSING: 'QA_USER_MISSING',
  QA_PASSWORD_MISMATCH: 'QA_PASSWORD_MISMATCH',
  BROWSER_CDP_BLOCKED: 'BROWSER_CDP_BLOCKED',
  BROWSER_ENGINE_MISSING: 'BROWSER_ENGINE_MISSING',
  SELECTOR_MISSING: 'SELECTOR_MISSING',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LISTING_CREATE_FAILED: 'LISTING_CREATE_FAILED',
  LISTING_NOT_VISIBLE_HOME: 'LISTING_NOT_VISIBLE_HOME',
  QUESTION_NOT_CREATED: 'QUESTION_NOT_CREATED',
  ANSWER_NOT_VISIBLE: 'ANSWER_NOT_VISIBLE',
  PURCHASE_NOT_CREATED: 'PURCHASE_NOT_CREATED',
  PAYMENT_PROOF_UPLOAD_FAILED: 'PAYMENT_PROOF_UPLOAD_FAILED',
  ADMIN_REVIEW_NOT_VISIBLE: 'ADMIN_REVIEW_NOT_VISIBLE',
  STATUS_TRANSITION_FAILED: 'STATUS_TRANSITION_FAILED',
  NOTIFICATION_MISSING: 'NOTIFICATION_MISSING',
  DASHBOARD_BAD_STATE: 'DASHBOARD_BAD_STATE',
  PROTECTED_PROOF_ACCESS_FAILED: 'PROTECTED_PROOF_ACCESS_FAILED',
  ASSET_MISSING: 'ASSET_MISSING',
  UNKNOWN: 'UNKNOWN',
})

export function classifyError(error) {
  const message = error?.message || String(error)

  if (message.includes('ENV_MISSING')) return FailureCode.ENV_MISSING
  if (message.includes('APP_URL_NOT_200')) return FailureCode.APP_URL_NOT_200
  if (message.includes('DB_MISSING_TABLE')) return FailureCode.DB_MISSING_TABLE
  if (message.includes('QA_USER_MISSING')) return FailureCode.QA_USER_MISSING
  if (message.includes('QA_PASSWORD_MISMATCH')) return FailureCode.QA_PASSWORD_MISMATCH
  if (message.includes('BROWSER_CDP_BLOCKED')) return FailureCode.BROWSER_CDP_BLOCKED
  if (message.includes('BROWSER_ENGINE_MISSING')) return FailureCode.BROWSER_ENGINE_MISSING
  if (message.includes('SELECTOR_MISSING')) return FailureCode.SELECTOR_MISSING
  if (message.includes('LOGIN_FAILED') || message.includes('iniciar sesion')) return FailureCode.LOGIN_FAILED
  if (message.includes('LISTING_CREATE_FAILED')) return FailureCode.LISTING_CREATE_FAILED
  if (message.includes('LISTING_NOT_VISIBLE_HOME')) return FailureCode.LISTING_NOT_VISIBLE_HOME
  if (message.includes('QUESTION_NOT_CREATED')) return FailureCode.QUESTION_NOT_CREATED
  if (message.includes('ANSWER_NOT_VISIBLE')) return FailureCode.ANSWER_NOT_VISIBLE
  if (message.includes('PURCHASE_NOT_CREATED')) return FailureCode.PURCHASE_NOT_CREATED
  if (message.includes('PAYMENT_PROOF_UPLOAD_FAILED')) return FailureCode.PAYMENT_PROOF_UPLOAD_FAILED
  if (message.includes('ADMIN_REVIEW_NOT_VISIBLE')) return FailureCode.ADMIN_REVIEW_NOT_VISIBLE
  if (message.includes('STATUS_TRANSITION_FAILED')) return FailureCode.STATUS_TRANSITION_FAILED
  if (message.includes('NOTIFICATION_MISSING')) return FailureCode.NOTIFICATION_MISSING
  if (message.includes('DASHBOARD_BAD_STATE')) return FailureCode.DASHBOARD_BAD_STATE
  if (message.includes('PROTECTED_PROOF_ACCESS_FAILED')) return FailureCode.PROTECTED_PROOF_ACCESS_FAILED
  if (message.includes('ASSET_MISSING') || message.includes('no disponible')) return FailureCode.ASSET_MISSING

  return FailureCode.UNKNOWN
}

export function formatFailure(code, detail = null) {
  return { code, detail: detail || null }
}
