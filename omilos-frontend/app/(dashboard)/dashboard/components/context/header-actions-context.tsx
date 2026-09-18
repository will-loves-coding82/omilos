// header-actions-context.tsx
'use client'
import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

const HeaderActionsValueContext = createContext<ReactNode>(null)
const HeaderActionsSetterContext = createContext<(node: ReactNode) => void>(() => {})

export function HeaderActionsProvider({ children }: { children: ReactNode }) {
  const [actions, setActions] = useState<ReactNode>(null)
  return (
    <HeaderActionsSetterContext.Provider value={setActions}>
      <HeaderActionsValueContext.Provider value={actions}>
        {children}
      </HeaderActionsValueContext.Provider>
    </HeaderActionsSetterContext.Provider>
  )
}

// Header reads this — re-renders when actions change (expected)
export function useHeaderActions() {
  return useContext(HeaderActionsValueContext)
}

// Pages call this — only touches the stable setter, never re-renders on actions changes
export function usePageActions(node: ReactNode) {
  const setActions = useContext(HeaderActionsSetterContext)
  useEffect(() => {
    setActions(node)
    return () => setActions(null)
  }, [node, setActions])
}