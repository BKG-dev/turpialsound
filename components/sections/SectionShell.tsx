import { cn } from '@/lib/utils'

interface SectionShellProps {
  children: React.ReactNode
  className?: string
  id?: string
  background?: 'default' | 'surface' | 'none'
  size?: 'default' | 'sm'
}

export function SectionShell({
  children,
  className,
  id,
  background = 'default',
  size = 'default',
}: SectionShellProps) {
  const bgClass = {
    default: 'bg-brand-bg',
    surface: 'bg-brand-surface',
    none: '',
  }[background]

  const paddingClass = size === 'sm' ? 'section-padding-sm' : 'section-padding'

  return (
    <section id={id} className={cn(bgClass, paddingClass, className)}>
      <div className="container-base">{children}</div>
    </section>
  )
}

interface SectionHeadingProps {
  eyebrow?: string
  heading: string
  subheading?: string
  align?: 'left' | 'center'
  className?: string
}

export function SectionHeading({
  eyebrow,
  heading,
  subheading,
  align = 'left',
  className,
}: SectionHeadingProps) {
  return (
    <div className={cn(align === 'center' && 'text-center', className)}>
      {eyebrow && (
        <div className={cn('mb-3 flex items-center gap-3', align === 'center' && 'justify-center')}>
          <span className="accent-line" aria-hidden="true" />
          <span className="text-sm font-medium uppercase tracking-widest text-accent-gold">
            {eyebrow}
          </span>
        </div>
      )}
      <h2 className="text-display-md font-display font-bold text-text-primary">{heading}</h2>
      {subheading && (
        <p className="mt-4 max-w-prose text-body-base text-text-secondary">{subheading}</p>
      )}
    </div>
  )
}
