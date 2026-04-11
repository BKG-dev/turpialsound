'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { FAQItem } from '@/types'
import { cn } from '@/lib/utils'

interface FAQListProps {
  items: FAQItem[]
  className?: string
}

export function FAQList({ items, className }: FAQListProps) {
  const [openId, setOpenId] = useState<string | null>(null)

  return (
    <ul className={cn('divide-y divide-brand-border', className)} role="list">
      {items.map((item) => {
        const isOpen = openId === item.id

        return (
          <li key={item.id}>
            <button
              onClick={() => setOpenId(isOpen ? null : item.id)}
              className="flex w-full items-start justify-between gap-4 py-5 text-left"
              aria-expanded={isOpen}
            >
              <span className="text-base font-medium text-text-primary">{item.question}</span>
              <Plus
                size={16}
                className={cn(
                  'mt-0.5 shrink-0 text-text-muted transition-transform duration-base',
                  isOpen && 'rotate-45',
                )}
                aria-hidden="true"
              />
            </button>
            {isOpen && (
              <div className="pb-5 pr-8">
                <p className="text-body-base text-text-secondary">{item.answer}</p>
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
