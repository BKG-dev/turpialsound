import type { Route } from 'next'
import Link from 'next/link'
import { cn } from '@/lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'whatsapp'
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
  primary:
    'bg-accent-gold text-brand-bg font-semibold hover:bg-accent-gold-light transition-colors duration-250',
  secondary:
    'border border-brand-border text-text-primary hover:border-accent-gold hover:text-accent-gold transition-colors duration-250',
  ghost:
    'text-text-secondary hover:text-text-primary transition-colors duration-250',
  whatsapp:
    'bg-[#25D366] text-white font-semibold hover:bg-[#1ebe5e] transition-colors duration-250',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'px-4 py-2 text-sm rounded',
  md: 'px-6 py-3 text-base rounded',
  lg: 'px-8 py-4 text-base rounded-lg',
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
