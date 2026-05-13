import Image from 'next/image'
import Link from 'next/link'

export function AnimatedLogo() {
  return (
    <Link href="/" aria-label="Turpial Sound — Inicio" className="flex min-w-0 items-center gap-1.5 sm:gap-2">
      <Image
        src="/images/logo-navbar.png"
        alt="Logo Turpial Sound"
        width={44}
        height={38}
        priority
        className="h-[38px] w-[44px] shrink-0 object-contain"
      />
      <span
        aria-hidden="true"
        className="font-display min-w-0 select-none overflow-hidden whitespace-nowrap text-[0.7rem] tracking-[0.08em] text-gradient-animated sm:text-lg sm:tracking-widest"
      >
        TURPIAL SOUND
      </span>
    </Link>
  )
}
