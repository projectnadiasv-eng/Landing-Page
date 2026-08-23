'use client'
import { useCallback, useSyncExternalStore } from 'react'

/**
 * getServerSnapshot returns false on purpose.
 *
 * legacy/index.html is authored for the wide, non-reduced case and narrows it
 * client-side after parse. Returning false therefore reproduces the served HTML
 * exactly, which is what the parity harness measures.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    },
    [query],
  )
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export const useReducedMotion = () =>
  useMediaQuery('(prefers-reduced-motion: reduce)')
