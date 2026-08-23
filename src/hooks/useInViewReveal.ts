'use client'
import { useEffect, useRef } from 'react'

/**
 * The reveal-on-scroll pattern shared by blocks 05, 08, 09 and 10.
 * Ported from legacy/index.html:1663, 4477, 4807, 5067 — all four are identical
 * apart from the class they add.
 *
 * Faithfulness notes:
 * - threshold 0.12 and rootMargin '0px 0px -40px 0px' are the legacy values.
 * - The staggered transitionDelay (i * 70ms) is a legacy inline-style write.
 * - The 2000ms fallback is REAL BEHAVIOUR, not defensive cruft. It reveals
 *   anything already in the viewport. Dropping it changes what is visible on a
 *   fast scroll. Do not remove it.
 *
 * `revealClass` must be the CSS-Modules-hashed token, e.g. styles['p-in'].
 */
export function useInViewReveal<T extends HTMLElement = HTMLElement>(
  revealClass: string,
  selector: string,
  opts: { stagger?: number; threshold?: number; rootMargin?: string; fallbackMs?: number } = {},
) {
  const rootRef = useRef<T | null>(null)
  const {
    stagger = 70,
    threshold = 0.12,
    rootMargin = '0px 0px -40px 0px',
    fallbackMs = 2000,
  } = opts

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const items = Array.from(root.querySelectorAll<HTMLElement>(selector))
    if (!items.length) return

    items.forEach((el, i) => {
      el.style.transitionDelay = `${i * stagger}ms`
    })

    // Legacy no-IntersectionObserver path: reveal everything immediately.
    if (typeof IntersectionObserver === 'undefined') {
      items.forEach((el) => el.classList.add(revealClass))
      return
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add(revealClass)
            io.unobserve(entry.target)
          }
        })
      },
      { threshold, rootMargin },
    )
    items.forEach((el) => io.observe(el))

    const fallback = window.setTimeout(() => {
      items.forEach((el) => {
        const r = el.getBoundingClientRect()
        if (r.top < window.innerHeight && r.bottom > 0) el.classList.add(revealClass)
      })
    }, fallbackMs)

    return () => {
      io.disconnect()
      window.clearTimeout(fallback)
    }
  }, [revealClass, selector, stagger, threshold, rootMargin, fallbackMs])

  return rootRef
}
