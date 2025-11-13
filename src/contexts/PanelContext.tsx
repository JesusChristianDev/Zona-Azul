"use client"

import { createContext, useContext, useState, ReactNode } from 'react'

interface PanelContextType {
  isNotificationsOpen: boolean
  setIsNotificationsOpen: (open: boolean) => void
  isMessagesOpen: boolean
  setIsMessagesOpen: (open: boolean) => void
  isSettingsOpen: boolean
  setIsSettingsOpen: (open: boolean) => void
}

const PanelContext = createContext<PanelContextType | undefined>(undefined)

export function PanelProvider({ children }: { children: ReactNode }) {
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [isMessagesOpen, setIsMessagesOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <PanelContext.Provider
      value={{
        isNotificationsOpen,
        setIsNotificationsOpen,
        isMessagesOpen,
        setIsMessagesOpen,
        isSettingsOpen,
        setIsSettingsOpen,
      }}
    >
      {children}
    </PanelContext.Provider>
  )
}

export function usePanel() {
  const context = useContext(PanelContext)
  if (!context) {
    throw new Error('usePanel must be used within a PanelProvider')
  }
  return context
}

