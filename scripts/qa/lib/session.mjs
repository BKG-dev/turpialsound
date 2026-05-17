import bcrypt from 'bcryptjs'
import { findUserByIdentifier } from './db-read.mjs'

export async function validateUserCredentials(identifier, password) {
  if (!identifier || !password) {
    return {
      ok: false,
      code: 'QA_USER_MISSING',
      detail: 'identifier or password empty',
      user: null,
    }
  }

  let user
  try {
    user = await findUserByIdentifier(identifier)
  } catch (error) {
    return {
      ok: false,
      code: 'DB_QUERY_ERROR',
      detail: error.message,
      user: null,
    }
  }

  if (!user) {
    return {
      ok: false,
      code: 'QA_USER_MISSING',
      detail: `No user found for identifier: ${identifier.slice(0, 3)}***`,
      user: null,
    }
  }

  if (!user.passwordHash) {
    return {
      ok: false,
      code: 'NO_PASSWORD_HASH',
      detail: `User ${identifier.slice(0, 3)}*** has no passwordHash`,
      user,
    }
  }

  if (user.isBanned) {
    return {
      ok: false,
      code: 'USER_BANNED',
      detail: `User ${identifier.slice(0, 3)}*** is banned`,
      user,
    }
  }

  let valid
  try {
    valid = await bcrypt.compare(password, user.passwordHash)
  } catch (error) {
    return {
      ok: false,
      code: 'BCRYPT_ERROR',
      detail: error.message,
      user,
    }
  }

  if (!valid) {
    return {
      ok: false,
      code: 'QA_PASSWORD_MISMATCH',
      detail: `Password mismatch for ${identifier.slice(0, 3)}***`,
      user,
    }
  }

  return {
    ok: true,
    code: 'AUTH_DATA_PASS',
    detail: 'Credentials validated (password hash match)',
    user,
  }
}

export async function validateUserProfile(result, expected) {
  const issues = []

  if (!result.ok || !result.user) {
    return { ok: false, issues: ['user_not_validated'], details: {} }
  }

  const u = result.user

  const details = {
    id: u.id,
    email: u.email,
    displayName: u.displayName,
    isSeller: u.isSeller,
    role: u.role,
    isBanned: u.isBanned,
  }

  if (typeof expected.isSeller === 'boolean' && u.isSeller !== expected.isSeller) {
    issues.push(`isSeller: expected ${expected.isSeller}, got ${u.isSeller}`)
  }

  if (expected.role && u.role !== expected.role) {
    issues.push(`role: expected ${expected.role}, got ${u.role}`)
  }

  if (u.isBanned) {
    issues.push('isBanned: user is banned')
  }

  return { ok: issues.length === 0, issues, details }
}
