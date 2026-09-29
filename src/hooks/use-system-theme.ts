import { useEffect } from 'react'

/**
 * shadcn's default theme only toggles via a manual `.dark` class. This repo
 * has no theme switcher, so instead mirror the OS/browser preference
 * automatically, the same way the previous vanilla build did with
 * `prefers-color-scheme`.
 */
export function useSystemTheme() {
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)')

    const apply = () => {
      document.documentElement.classList.toggle('dark', media.matches)
    }

    apply()
    media.addEventListener('change', apply)
    return () => media.removeEventListener('change', apply)
  }, [])
}
