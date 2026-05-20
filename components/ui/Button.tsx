import type { Route } from 'next'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'whatsapp' | 'glow-cyan'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonBaseProps {
  variant?: ButtonVariant
  size?: ButtonSize
  className?: string
  children: React.ReactNode
}

interface ButtonAsButton extends ButtonBaseProps {
  as?: 'button'
  href?: never
  onClick?: React.MouseEventHandler<HTMLButtonElement>
  type?: 'button' | 'submit' | 'reset'
  disabled?: boolean
}

interface ButtonAsLink extends ButtonBaseProps {
  as: 'link'
  href: Route
  onClick?: never
  type?: never
  disabled?: never
}

type ButtonProps = ButtonAsButton | ButtonAsLink

const variantClasses: Record<ButtonVariant, string> = {
  primary: [
    'btn-silky-primary font-semibold',
    'transition-all duration-250',
    'hover:brightness-110',
  ].join(' '),
  secondary: [
    'btn-gradient-border text-text-primary',
    'transition-all duration-250',
    'hover:text-accent-gold',
  ].join(' '),
  ghost: [
    'text-text-secondary',
    'transition-colors duration-250',
    'hover:text-text-primary',
  ].join(' '),
  whatsapp: [
    'bg-[#25D366] text-white font-semibold',
    'transition-all duration-250',
    'hover:bg-[#1ebe5e]',
  ].join(' '),
  'glow-cyan': [
    'btn-gradient-outline text-accent-cyan',
    'transition-all duration-250',
  ].join(' '),
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm rounded',
  md: 'px-6 py-3 text-base rounded',
  lg: 'px-8 py-4 text-base rounded-xl',
}

export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(
    'inline-flex items-center justify-center gap-2 font-medium leading-none',
    variantClasses[variant],
    sizeClasses[size],
    className,
  )

  if (props.as === 'link') {
    return (
      <Link href={props.href} className={classes}>
        {children}
      </Link>
    )
  }

  return (
    <button
      className={classes}
      type={props.type ?? 'button'}
      onClick={props.onClick}
      disabled={props.disabled}
    >
      {children}
    </button>
  )
}
