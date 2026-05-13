import { cn } from '@/lib/utils'

interface StackingSectionProps {
  children: React.ReactNode
  index: number
  background?: 'default' | 'surface'
  className?: string
  waves?: boolean
}

export function StackingSection({
  children,
  index,
  background = 'default',
  className,
}: StackingSectionProps) {
  const bg = background === 'surface' ? 'bg-brand-surface' : 'bg-brand-bg'

  return (
    <div
      className={cn(
        'relative flex min-h-[100dvh] snap-start snap-always flex-col justify-center rounded-t-3xl -mt-px pt-24 pb-12',
        bg,
        className,
      )}
      style={{ zIndex: index + 1 }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06) 50%, transparent)',
        }}
        aria-hidden="true"
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}
