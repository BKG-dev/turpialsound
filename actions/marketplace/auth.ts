'use server'

import crypto from 'crypto'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { Resend } from 'resend'
import type { ActionResult } from '@/lib/validations/marketplace'
import {
  getSession,
  setSessionCookie,
  clearSessionCookie,
} from '@/lib/marketplace/auth'

// Re-export so UI components have a single server-action import point
export { getSession as getMpSession }

// ─── Validation schemas ───────────────────────────────────────────────────────

const registerSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Mínimo 2 caracteres')
    .max(50, 'Máximo 50 caracteres'),
  email: z.string().email('Email inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  phone: z.string().optional(),
  whatsappConsent: z.boolean().default(false),
})

// identifier can be an email address or a displayName (username)
const loginSchema = z.object({
  identifier: z.string().min(1, 'Email o usuario requerido'),
  password: z.string().min(1, 'Contraseña requerida'),
})

// ─── DB client ────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getPrisma(): Promise<any> {
  const mod = await import('../../generated/prisma/client')
  const { PrismaPg } = await import('@prisma/adapter-pg')
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  return new mod.PrismaClient({ adapter })
}

// ─── REGISTER ─────────────────────────────────────────────────────────────────

export async function registerMpUser(
  raw: unknown,
): Promise<ActionResult<{ userId: string; displayName: string; role: string }>> {
  const parsed = registerSchema.safeParse(raw)
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors as Record<string, string[]>
    return { success: false, message: 'Datos inválidos', errors }
  }

  const { displayName, email, password, phone, whatsappConsent } = parsed.data
  const prisma = await getPrisma()

  try {
    const existing = await prisma.mpUser.findUnique({ where: { email } })
    if (existing) {
      return { success: false, message: 'Este email ya está registrado' }
    }

    const passwordHash = await bcrypt.hash(password, 12)

    const user = await prisma.mpUser.create({
      data: {
        displayName,
        email,
        passwordHash,
        isSeller: true,
        phone: phone ?? null,
        whatsappConsent: whatsappConsent ?? false,
        whatsappConsentAt: whatsappConsent ? new Date() : null,
      },
      select: { id: true, email: true, displayName: true, role: true },
    })

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      isSeller: true,
      role: user.role,
    })

    return {
      success: true,
      data: { userId: user.id, displayName: user.displayName, role: user.role },
      message: '¡Bienvenido a Turpial Sound!',
    }
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
// Accepts email address OR displayName (username) as identifier.

export async function loginMpUser(
  raw: unknown,
): Promise<ActionResult<{ userId: string; displayName: string; email: string; role: string }>> {
  const parsed = loginSchema.safeParse(raw)
  if (!parsed.success) {
    const errors = parsed.error.flatten().fieldErrors as Record<string, string[]>
    return { success: false, message: 'Datos inválidos', errors }
  }

  const { identifier, password } = parsed.data
  const prisma = await getPrisma()

  try {
    const user = await prisma.mpUser.findFirst({
      where: {
        OR: [{ email: identifier }, { displayName: identifier }],
      },
      select: {
        id: true,
        email: true,
        displayName: true,
        isSeller: true,
        role: true,
        passwordHash: true,
        isBanned: true,
      },
    })

    if (!user || !user.passwordHash) {
      return { success: false, message: 'Usuario o contraseña incorrectos' }
    }

    if (user.isBanned) {
      return { success: false, message: 'Cuenta suspendida. Contacta soporte.' }
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      return { success: false, message: 'Usuario o contraseña incorrectos' }
    }

    await setSessionCookie({
      userId: user.id,
      email: user.email,
      displayName: user.displayName,
      isSeller: user.isSeller,
      role: user.role,
    })

    return {
      success: true,
      data: { userId: user.id, displayName: user.displayName, email: user.email, role: user.role },
      message: `Bienvenido, ${user.displayName}`,
    }
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
}

// ─── LOGOUT ───────────────────────────────────────────────────────────────────

export async function logoutMpUser(): Promise<void> {
  await clearSessionCookie()
}

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────
// Always returns success to prevent email enumeration attacks.
// Token is SHA-256 hashed before storage; plain token is sent to user via email.

export async function requestPasswordReset(
  email: string,
): Promise<ActionResult<undefined>> {
  if (!email || !z.string().email().safeParse(email).success) {
    return { success: false, message: 'Email inválido' }
  }

  const prisma = await getPrisma()
  try {
    const user = await prisma.mpUser.findUnique({
      where: { email },
      select: { id: true, displayName: true, email: true },
    })

    if (!user) {
      return { success: true, data: undefined, message: 'Si el email existe, recibirás el enlace en minutos.' }
    }

    const plainToken = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(plainToken).digest('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    await prisma.mpUser.update({
      where: { id: user.id },
      data: {
        passwordResetToken: tokenHash,
        passwordResetTokenExpiresAt: expiresAt,
      },
    })

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://turpialsound.com'
    const resetUrl = `${appUrl}/marketplace/reset-password?token=${plainToken}`

    const resend = new Resend(process.env.RESEND_API_KEY)
    await resend.emails.send({
      from: 'Turpial Sound <noreply@turpialsound.com>',
      to: user.email,
      subject: 'Recupera tu contraseña — Turpial Sound Marketplace',
      html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:40px auto;">
    <tr><td style="background:#0d1117;border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:36px;">
      <p style="color:#5a5a5a;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 24px;">Turpial Sound Marketplace</p>
      <h1 style="color:#f2f2f2;font-size:20px;font-weight:700;margin:0 0 12px;">Recupera tu contraseña</h1>
      <p style="color:#8a8a8a;font-size:14px;line-height:1.6;margin:0 0 28px;">Hola <strong style="color:#f2f2f2;">${user.displayName}</strong>, recibimos una solicitud para restablecer tu contraseña. El enlace expira en <strong style="color:#f2f2f2;">1 hora</strong>.</p>
      <a href="${resetUrl}" style="display:inline-block;padding:14px 28px;background:rgba(0,174,239,0.9);color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:600;">Restablecer contraseña</a>
      <p style="color:#5a5a5a;font-size:12px;margin:28px 0 0;">Si no solicitaste este cambio, ignora este correo. Tu contraseña permanecerá igual.</p>
      <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:24px 0;">
      <p style="color:#3a3a3a;font-size:11px;margin:0;">© 2026 Turpial Sound · <a href="${appUrl}/marketplace" style="color:#3a3a3a;">turpialsound.com</a></p>
    </td></tr>
  </table>
</body>
</html>`,
    })

    return { success: true, data: undefined, message: 'Si el email existe, recibirás el enlace en minutos.' }
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
}

// ─── RESET PASSWORD ───────────────────────────────────────────────────────────
// Validates the hashed token, checks expiry, updates password, clears token.

export async function resetPassword(
  token: string,
  newPassword: string,
): Promise<ActionResult<undefined>> {
  if (!token || !newPassword || newPassword.length < 8) {
    return { success: false, message: 'La contraseña debe tener al menos 8 caracteres.' }
  }

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
  const prisma = await getPrisma()

  try {
    const user = await prisma.mpUser.findFirst({
      where: {
        passwordResetToken: tokenHash,
        passwordResetTokenExpiresAt: { gt: new Date() },
      },
      select: { id: true },
    })

    if (!user) {
      return { success: false, message: 'El enlace es inválido o ha expirado. Solicita uno nuevo.' }
    }

    const passwordHash = await bcrypt.hash(newPassword, 12)

    await prisma.mpUser.update({
      where: { id: user.id },
      data: {
        passwordHash,
        passwordResetToken: null,
        passwordResetTokenExpiresAt: null,
      },
    })

    return { success: true, data: undefined, message: 'Contraseña actualizada. Ya puedes iniciar sesión.' }
  } finally {
    await prisma.$disconnect().catch(() => {})
  }
}
