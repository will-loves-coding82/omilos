'use client'
import { usePathname } from 'next/navigation'
import { useHeaderActions } from './context/header-actions-context';
import { ChevronRight } from 'lucide-react';
import Link from 'next/link';

export function BreadCrumbHeader() {
  const pathname = usePathname()
  const actions = useHeaderActions()
  const segments = pathname.split('/').filter(Boolean).slice(1)

  return (
    <header className="z-20 h-[var(--header-height)] bg-bg-primary border-b border-border-primary flex items-center justify-between px-4">
      <nav className="flex gap-1 items-center text-sm text-text-secondary">
        {segments.map((seg, i) => (
          <div key={i} className='flex items-center'>
            {i > 0 && <ChevronRight size={16}/>} { i < segments.length - 1 ? <Link href={`/dashboard/${seg}`}>{seg}</Link> : <p>{seg}</p>}
          </div>
        ))}
      </nav>
      
      <div className="flex items-center gap-2">{actions}</div>
    </header>
  )
}