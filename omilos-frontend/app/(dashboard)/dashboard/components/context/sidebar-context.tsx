// sidebar-context.tsx
'use client'
import { createContext, useContext, ReactNode } from 'react'

const SidebarContext = createContext<{ openMobileMenu: () => void }>({
  openMobileMenu: () => {},
})

export function SidebarProvider({ openMobileMenu, children }: { openMobileMenu: () => void, children: ReactNode }) {
  return (
    <SidebarContext.Provider value={{ openMobileMenu }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  return useContext(SidebarContext)
}
