'use client'
import { usePathname } from 'next/navigation'
import { useHeaderActions } from './context/header-actions-context';

export function Header() {
  const pathname = usePathname()
  const actions = useHeaderActions()
  const segments = pathname.split('/').filter(Boolean)

  return (
    <div className="flex items-center justify-between border-b border-border-primary px-4 h-14">
      <nav className="text-sm text-muted-foreground">
        {segments.map((seg, i) => (
          <span key={i}>{i > 0 && ' / '}{seg}</span>
        ))}
      </nav>
      <div className="flex items-center gap-2">{actions}</div>
    </div>
  )
}