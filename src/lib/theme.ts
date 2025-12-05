export type ThemePreference = 'light' | 'dark' | 'auto'

function canUseDOM() {
  return typeof document !== 'undefined'
}

let removeAutoListener: (() => void) | null = null

function resolveTheme(theme: ThemePreference) {
  if (theme === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }

  return theme
}

function syncAutoTheme() {
  const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
  const handler = (event: MediaQueryListEvent) => {
    const root = document.documentElement
    const resolved = event.matches ? 'dark' : 'light'
    root.dataset.resolvedTheme = resolved
    root.classList.toggle('dark', resolved === 'dark')
  }

  mediaQuery.addEventListener('change', handler)
  removeAutoListener = () => mediaQuery.removeEventListener('change', handler)
}

export function applyTheme(theme: ThemePreference) {
  if (!canUseDOM()) return

  const root = document.documentElement
  const resolvedTheme = resolveTheme(theme)

  root.dataset.theme = theme
  root.dataset.resolvedTheme = resolvedTheme
  root.classList.toggle('dark', resolvedTheme === 'dark')

  // Clean up previous listeners to avoid stacking
  if (removeAutoListener) {
    removeAutoListener()
    removeAutoListener = null
  }

  if (theme === 'auto') {
    syncAutoTheme()
  }
}

export function resetTheme() {
  if (!canUseDOM()) return

  if (removeAutoListener) {
    removeAutoListener()
    removeAutoListener = null
  }

  const root = document.documentElement
  root.classList.remove('dark')
  root.removeAttribute('data-theme')
  root.removeAttribute('data-resolved-theme')
}
