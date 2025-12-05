import { useEffect, useState } from 'react'

export function useDarkMode() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window === 'undefined') {
      return false
    }
    return document.documentElement.classList.contains('dark')
  })

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    const root = document.documentElement
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')

    const updateDarkMode = (matches?: boolean) => {
      const prefersDark = typeof matches === 'boolean' ? matches : mediaQuery.matches
      const hasDarkClass = root.classList.contains('dark')
      setIsDarkMode(hasDarkClass || prefersDark)
    }

    updateDarkMode()

    const observer = new MutationObserver(() => updateDarkMode())
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })

    const mediaListener = (event: MediaQueryListEvent) => updateDarkMode(event.matches)

    if (typeof mediaQuery.addEventListener === 'function') {
      mediaQuery.addEventListener('change', mediaListener)
    } else {
      mediaQuery.addListener(mediaListener)
    }

    return () => {
      observer.disconnect()
      if (typeof mediaQuery.removeEventListener === 'function') {
        mediaQuery.removeEventListener('change', mediaListener)
      } else {
        mediaQuery.removeListener(mediaListener)
      }
    }
  }, [])

  return isDarkMode
}







