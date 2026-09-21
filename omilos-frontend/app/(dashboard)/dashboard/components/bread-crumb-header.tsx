'use client'
import { usePathname } from 'next/navigation'
import { useHeaderActions } from './context/header-actions-context';
import { useSidebar } from './context/sidebar-context';
import { ChevronRight, Menu } from 'lucide-react';
import Link from 'next/link';

export function BreadCrumbHeader() {
  const pathname = usePathname()
  const actions = useHeaderActions()
  const { openMobileMenu } = useSidebar()
  const segments = pathname.split('/').filter(Boolean).slice(1)

  return (
    <header className="z-20 h-[var(--header-height)] bg-bg-primary border-b border-border-primary flex items-center justify-between px-4">
      <div className="flex items-center gap-4">
        <button
          className="md:hidden bg-bg-secondary border-1 border-border-primary rounded-lg p-1 text-text-primary hover:cursor-pointer"
          onClick={openMobileMenu}
          aria-label="Open navigation"
        >
          <Menu size={20} className="text-text-secondary" />
        </button>

        <nav className="flex gap-1 items-center text-sm text-text-secondary">
          {segments.map((seg, i) => (
            <div key={i} className='flex items-center'>
              {i > 0 && <ChevronRight size={16}/>} { i < segments.length - 1 ? <Link href={`/dashboard/${seg}`}>{seg}</Link> : <p>{seg}</p>}
            </div>
          ))}
        </nav>
      </div>

      <div className="flex items-center gap-2">{actions}</div>
    </header>
  )
}