'use client'

/* ============================================================================
   Block 02 — the scroll-expand hero.  legacy/index.html 176-692.
   Root id is #sehx2-root; the nav logo deeplinks to it, so the id is literal
   (see the :global() note in Hero.module.css).

   Two things in the legacy block are deliberately NOT ported:

   1. legacy:502-517 — the "surface scrubber" IIFE that walks up from #sehx2-root
      transparent-ing every ancestor background, then pins html/body to #ffffff.
      That existed to punch through HighLevel's funnel wrappers, which do not
      exist here. globals.css rule 2 already owns html/body background and
      documents this exact trace: block 02 writes #ffffff at parse, blocks
      04/05/08 overwrite it with #FAF0E9, and #FAF0E9 is the settled value for
      the whole visible life of the page. Porting the scrubber would reintroduce
      a white flash that the legacy page only shows for one frame.

   2. legacy:625-632 — the window.top / iframe-traversal arms of findById().
      Also HighLevel funnel-preview machinery. In Next there is one document and
      window.top === window, so those branches can only ever re-find what
      getElementById already returned. The FALLBACKS map and the heading search
      ARE real behaviour and are ported below.
   ========================================================================= */

import { useEffect, useRef, useState } from 'react'
import styles from './Hero.module.css'

/* legacy:437,444 — was a relative "videos/signal-pro.mp4". Both the full-bleed
   backdrop and the centre card play the SAME file; two <video> elements, one
   asset. */
const HERO_VIDEO_SRC = '/videos/signal-pro.mp4'

/* legacy:436,443 — was the same ~40KB base64 JPEG inlined twice. Extracted by
   scripts/extract-assets.mjs; manifest.json records both occurrences. */
const HERO_POSTER_SRC = '/img/hero-poster.jpg'

/* The production watermark burned into the bottom-left of the source video.
   Measured off the file rather than guessed: sampling five frames from
   different scenes and intersecting the bright pixels leaves exactly one
   static region — a 130x130 rounded square at (9, 942) in the 1920x1080
   frame. Expressed as fractions so the cover tracks any render size. */
const WATERMARK = { x: 9 / 1920, y: 942 / 1080, size: 130 / 1920 }

/* The hero opens on frame 0, and that is now the whole of the policy.

   It used to seek to HERO_START_SECONDS = 3 on load, on the reasoning that the
   film "opens on a wide approach shot" and only reaches the flag composition at
   ~3s. That was overruled: the page is meant to start at the very beginning.
   Frame 0 already has the US flag hanging on the left — it is simply the wider
   read of the same shot, before the drone closes on the CIPRIANI banner.

   Two things went with the offset, and both had to go WITH it rather than after:

     - `hero-poster.jpg` was regenerated from frame 0. It was the 3s frame, so
       leaving it would have painted the close composition and then jumped back
       to the wide approach the moment the video started — worse than either
       start on its own. public/img/manifest.json records the new hash.
     - The native `loop` attribute is back on both <video> elements, and the
       hand-rolled seek/`ended` loop that stood in for it is gone. That loop
       existed only to wrap to 3s instead of 0; wrapping to 0 is what `loop`
       already does, and doing it by hand left a gap at the wrap while the
       seek resolved.

   If a start offset is ever wanted again, it is in git — do not reintroduce it
   without regenerating the poster to match. */

/* legacy:604-608 — deeplink targets that are NOT ids in the ported tree, with
   the selector list the legacy script falls back to for each. */
/*
 * legacy:604-608 — deeplink targets that are NOT ids in the ported tree, with the
 * selector list the legacy script falls back to for each.
 *
 * A WARNING ABOUT THIS MAP, because it looks like a safety net and is not one:
 * every selector in it is a legacy CLASS name, and this tree styles through CSS
 * Modules, which hashes class names at build time. `.c-grid` and `.p-grid` cannot
 * match anything the React tree renders. The two entries below survive only
 * because their ids DO resolve at step 1, so the fallback never runs.
 *
 * "Features" was the one that did not. It pointed at #spfeatures-root, which no
 * component renders; the four fallbacks could not match; and the last resort looks
 * for an h1/h2 containing both "social" and "intelligence", which no heading on
 * the page has — the section's h2 is "See what investors are actually saying." and
 * "Social intelligence" appears only in a <p> eyebrow. So findById returned null,
 * go() returned BEFORE its preventDefault(), and the browser was left to follow a
 * href pointing at nothing. The nav item did nothing at all.
 *
 * It now points at #si-root, the actual root of the social intelligence section,
 * which is server-rendered and always present. Pointing the href there as well as
 * the data-sxid means the jump also works with JavaScript off, which the old value
 * never did.
 */
const FALLBACKS: Record<string, string[]> = {
  'splive-root': ['.c-grid'],
}

export default function Hero() {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const bgRef = useRef<HTMLDivElement | null>(null)
  const mediaRef = useRef<HTMLDivElement | null>(null)
  const veilRef = useRef<HTMLDivElement | null>(null)
  const scrimRef = useRef<HTMLDivElement | null>(null)
  const titleRef = useRef<HTMLDivElement | null>(null)
  const wlRef = useRef<HTMLSpanElement | null>(null)
  const wrRef = useRef<HTMLSpanElement | null>(null)
  const hintRef = useRef<HTMLDivElement | null>(null)
  const revealRef = useRef<HTMLDivElement | null>(null)

  /* legacy:659-666 — was root.classList.toggle('sehx2-open'). */
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const root = rootRef.current
    const stage = stageRef.current
    const bg = bgRef.current
    const media = mediaRef.current
    const veil = veilRef.current
    const scrim = scrimRef.current
    const titleWrap = titleRef.current
    const wl = wlRef.current
    const wr = wrRef.current
    const hint = hintRef.current
    const reveal = revealRef.current
    if (!root || !stage || !bg || !media || !titleWrap || !wl || !wr || !reveal) return

    /* ---- legacy:519-534 — autoplay insistence ------------------------------
       muted+playsinline are already attributes; this re-asserts them because
       some mobile browsers strip them on a bfcache restore, and retries play()
       on the first user gesture when the autoplay policy refused the first. */
    /* Place each logo cover over the watermark.

       The videos are `object-fit: cover`, so the frame is scaled to fill and
       the overflow is cropped equally on both sides — the watermark is NOT at
       a fixed offset from the container's corner, and anchoring it there drifts
       as soon as the viewport aspect changes. Recomputing the rendered content
       box is what keeps the cover on the mark at every size.

       A cover that ends up outside the visible area is hidden rather than
       clamped to the edge: the centre card crops the watermark away entirely,
       and a logo pinned to its corner would be a mark floating over nothing. */
    const cleanups: Array<() => void> = []
    const placeCovers = () => {
      for (const box of Array.from(
        root.querySelectorAll<HTMLElement>('[data-wm-box]'),
      )) {
        const cover = box.querySelector<HTMLElement>('[data-wm-cover]')
        if (!cover) continue
        const { width: cw, height: ch } = box.getBoundingClientRect()
        if (!cw || !ch) continue

        const scale = Math.max(cw / 1920, ch / 1080)
        const renderedW = 1920 * scale
        const renderedH = 1080 * scale
        const offsetX = (cw - renderedW) / 2
        const offsetY = (ch - renderedH) / 2

        const size = WATERMARK.size * renderedW
        const left = offsetX + WATERMARK.x * renderedW
        const top = offsetY + WATERMARK.y * renderedH

        const visible = left + size > 0 && top + size > 0 && left < cw && top < ch
        cover.style.display = visible ? 'block' : 'none'
        // A hair of bleed so no anti-aliased edge of the watermark survives.
        cover.style.left = `${left - 1}px`
        cover.style.top = `${top - 1}px`
        cover.style.width = `${size + 2}px`
        cover.style.height = `${size + 2}px`
      }
    }
    placeCovers()
    const wmObserver = new ResizeObserver(placeCovers)
    wmObserver.observe(root)
    for (const box of Array.from(root.querySelectorAll('[data-wm-box]'))) {
      wmObserver.observe(box)
    }
    cleanups.push(() => wmObserver.disconnect())

    const vids = Array.from(root.querySelectorAll('video'))
    function forcePlay() {
      for (const v of vids) {
        try {
          v.muted = true
          v.defaultMuted = true
          v.playsInline = true
          v.setAttribute('playsinline', '')
          v.setAttribute('webkit-playsinline', '')
          v.removeAttribute('controls')
          const pr = v.play()
          if (pr && pr.catch) pr.catch(() => {})
        } catch {
          /* legacy swallows this */
        }
      }
    }
    forcePlay()
    const gestures = ['touchstart', 'pointerdown', 'click', 'keydown'] as const
    for (const ev of gestures) {
      window.addEventListener(ev, forcePlay, { once: true, passive: true })
    }

    /* ---- rewind to the top ------------------------------------------------
       A bfcache restore hands the element back mid-film, and `autoplay` does
       not re-run on a restored page — it would resume wherever it was parked,
       which is the one way this hero can still open on the wrong shot. Nothing
       else here touches currentTime: a fresh load is already at 0 and the wrap
       is the native `loop`. */
    const videoCleanups: Array<() => void> = []
    for (const v of vids) {
      const rewind = () => {
        try {
          if (v.currentTime > 0) v.currentTime = 0
        } catch {
          /* seeking before metadata lands throws in some browsers */
        }
      }
      const onPageShow = (e: PageTransitionEvent) => {
        if (e.persisted) rewind()
      }
      window.addEventListener('pageshow', onPageShow)
      videoCleanups.push(() => window.removeEventListener('pageshow', onPageShow))
    }

    /* ---- legacy:537-538 ---------------------------------------------------- */
    const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v))
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t

    /* ---- legacy:540-570 — the whole animation, as a pure function of e ------
       e is 0 (card) .. 1 (full bleed). Every number here is legacy. */
    function apply(e: number) {
      const vw = stage!.clientWidth || window.innerWidth
      const vh = stage!.clientHeight || window.innerHeight
      const isMobile = vw < 768

      const startW = isMobile ? Math.min(306, vw * 0.78) : Math.min(410, vw * 0.41)
      const startH = isMobile ? Math.min(336, vh * 0.45) : Math.min(402, vh * 0.5)

      media!.style.width = lerp(startW, vw, e) + 'px'
      media!.style.height = lerp(startH, vh, e) + 'px'
      media!.style.borderRadius = lerp(22, 0, e) + 'px'
      media!.style.boxShadow = e > 0.985 ? 'none' : '0 30px 80px rgba(0,0,0,0.55)'

      /* Both are pinned to 0 in the legacy CSS and never move off it. The two
         writes are kept because the elements are kept. */
      if (veil) veil.style.opacity = '0'
      if (scrim) scrim.style.opacity = '0'

      bg!.style.opacity = clamp(1 - e * 1.1, 0, 1).toFixed(3)

      const tx = e * (isMobile ? 38 : 26)
      wl!.style.transform = 'translateX(-' + tx + 'vw)'
      wr!.style.transform = 'translateX(' + tx + 'vw)'
      titleWrap!.style.opacity = clamp(1 - e * 1.5, 0, 1).toFixed(3)

      if (hint) hint.style.opacity = clamp(1 - e * 3.5, 0, 1).toFixed(3)

      /* The reveal headline only exists in the last 14% of the travel. */
      const rp = clamp((e - 0.86) / 0.14, 0, 1)
      root!.style.setProperty('--sehx2-glow', (0.15 + rp * 0.6).toFixed(3))
      reveal!.style.opacity = rp.toFixed(3)
      reveal!.style.transform =
        'translate(-50%,calc(-50% + ' + lerp(16, 0, rp).toFixed(1) + 'px))'
      reveal!.style.pointerEvents = rp > 0.5 ? 'auto' : 'none'
    }

    /* ---- legacy:572-604 — the scroll hijack -------------------------------
       Read straight from matchMedia rather than through useReducedMotion: no
       markup depends on it, so there is nothing to keep stable across hydration,
       and this matches the legacy read exactly. */
    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    let progress = 0
    let fullyExpanded = false
    let touchStartY = 0
    const render = () => apply(progress)

    /* Collected so the teardown removes exactly what this branch added. */
    const teardown: Array<() => void> = []

    if (reduce) {
      progress = 1
      fullyExpanded = true
      apply(1)
    } else {
      apply(0)

      const onWheel = (e: WheelEvent) => {
        if (fullyExpanded && e.deltaY < 0 && window.scrollY <= 5) {
          fullyExpanded = false
          e.preventDefault()
        } else if (!fullyExpanded) {
          e.preventDefault()
          progress = clamp(progress + e.deltaY * 0.0009, 0, 1)
          if (progress >= 1) fullyExpanded = true
          render()
        }
      }
      const onTouchStart = (e: TouchEvent) => {
        touchStartY = e.touches[0].clientY
      }
      const onTouchMove = (e: TouchEvent) => {
        if (!touchStartY) return
        const ty = e.touches[0].clientY
        const dy = touchStartY - ty
        if (fullyExpanded && dy < -20 && window.scrollY <= 5) {
          fullyExpanded = false
          e.preventDefault()
        } else if (!fullyExpanded) {
          e.preventDefault()
          progress = clamp(progress + dy * 0.0045, 0, 1)
          if (progress >= 1) fullyExpanded = true
          touchStartY = ty
          render()
        }
      }
      const onTouchEnd = () => {
        touchStartY = 0
      }
      /* Holds the page at the top until the card has finished expanding. */
      const lockTop = () => {
        if (!fullyExpanded) window.scrollTo(0, 0)
      }

      window.addEventListener('wheel', onWheel, { passive: false })
      window.addEventListener('touchstart', onTouchStart, { passive: false })
      window.addEventListener('touchmove', onTouchMove, { passive: false })
      window.addEventListener('touchend', onTouchEnd, { passive: true })
      window.addEventListener('scroll', lockTop, { passive: true })
      window.addEventListener('resize', render, { passive: true })

      teardown.push(() => {
        window.removeEventListener('wheel', onWheel)
        window.removeEventListener('touchstart', onTouchStart)
        window.removeEventListener('touchmove', onTouchMove)
        window.removeEventListener('touchend', onTouchEnd)
        window.removeEventListener('scroll', lockTop)
        window.removeEventListener('resize', render)
      })
    }

    /* ---- legacy:610-641 — deeplink resolution ------------------------------ */
    function findByHeading(words: string[]) {
      const hs = document.querySelectorAll('h1,h2')
      for (const h of Array.from(hs)) {
        const t = (h.textContent || '').toLowerCase()
        if (words.every((w) => t.indexOf(w) !== -1)) return h
      }
      return null
    }

    function findById(id: string): Element | null {
      const d = document.getElementById(id)
      if (d) return d
      for (const sel of FALLBACKS[id] || []) {
        try {
          const el = document.querySelector(sel)
          if (el) return el
        } catch {
          /* legacy swallows an invalid selector and keeps going */
        }
      }
      /* Last resort for the social section. The words are the ones actually in its
         h2 — the old pair, "social"+"intelligence", matched no heading on the page
         and so never fired. Reachable only if #si-root itself is ever renamed. */
      if (id === 'si-root') {
        const h = findByHeading(['investors', 'saying'])
        if (h) return h
      }
      return null
    }

    /*
     * A deep-link scroll that survives the page growing under it.
     *
     * A plain scrollIntoView({behavior:'smooth'}) does NOT land on the section: the
     * browser commits to a target offset when the scroll begins, and the document
     * keeps changing height while it runs — go() itself snaps the hero open one
     * line earlier, and sections between here and the target are still settling.
     * By the time the scroll arrives the target has moved. Measured on a cold load
     * of "Features": it stopped 309px short and stayed there, and a second
     * scrollIntoView against the settled layout landed exactly on 0.
     *
     * So: scroll, wait for it to actually stop, then close whatever gap is left in
     * one instant hop. Any real input from the reader cancels the correction —
     * arriving 309px off is better than yanking the page out from under someone who
     * has started scrolling themselves.
     */
    let alignStop: (() => void) | null = null
    teardown.push(() => alignStop?.())

    function scrollToStart(el: Element) {
      alignStop?.()
      window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY, behavior: 'smooth' })

      let last = -1
      let still = 0
      let ticks = 0
      const timer = window.setInterval(() => {
        const y = Math.round(window.scrollY)
        still = y === last ? still + 1 : 0
        last = y
        /* Two identical readings means the smooth scroll has finished. The tick cap
           is the backstop for a scroll that never settles. */
        if (still < 2 && ++ticks < 30) return
        const gap = el.getBoundingClientRect().top
        if (Math.abs(gap) > 2) window.scrollBy({ top: gap, behavior: 'auto' })
        cancel()
      }, 100)

      function cancel() {
        clearInterval(timer)
        window.removeEventListener('wheel', cancel)
        window.removeEventListener('touchstart', cancel)
        window.removeEventListener('keydown', cancel)
        if (alignStop === cancel) alignStop = null
      }
      alignStop = cancel
      window.addEventListener('wheel', cancel, { passive: true })
      window.addEventListener('touchstart', cancel, { passive: true })
      window.addEventListener('keydown', cancel)
    }

    /* Jumping past the hero snaps the expansion to its end state first,
       otherwise the sticky stage would still be mid-animation behind you. */
    function go(id: string, e?: Event) {
      const el = findById(id)
      if (!el) return
      if (e) e.preventDefault()
      fullyExpanded = true
      if (progress < 1) {
        progress = 1
        apply(1)
      }
      scrollToStart(el)
    }

    /* ---- legacy:668-675 — nav + CTA click wiring --------------------------- */
    const linkEls = Array.from(root.querySelectorAll<HTMLElement>('[data-sxid]'))
    const linkHandlers = linkEls.map((a) => {
      const h = (e: Event) => {
        go(a.getAttribute('data-sxid') || '', e)
        setMenuOpen(false)
      }
      a.addEventListener('click', h)
      return [a, h] as const
    })

    const bookEls = Array.from(root.querySelectorAll<HTMLElement>('[data-sx-book]'))
    const bookHandlers = bookEls.map((b) => {
      const h = (e: Event) => go('spvsl-root', e)
      b.addEventListener('click', h)
      return [b, h] as const
    })

    return () => {
      for (const ev of gestures) window.removeEventListener(ev, forcePlay)
      for (const fn of videoCleanups) fn()
      for (const fn of cleanups) fn()
      for (const fn of teardown) fn()
      for (const [a, h] of linkHandlers) a.removeEventListener('click', h)
      for (const [b, h] of bookHandlers) b.removeEventListener('click', h)
    }
  }, [])

  return (
    <div
      id="sehx2-root"
      ref={rootRef}
      className={menuOpen ? styles['sehx2-open'] : undefined}
    >
      <div className={styles['sehx2-track']}>
        <div className={styles['sehx2-sticky']} ref={stageRef}>
          <div
            className={styles['sehx2-bg']}
            ref={bgRef}
            aria-hidden="true"
            data-wm-box
          >
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              disablePictureInPicture
              poster={HERO_POSTER_SRC}
            >
              <source src={HERO_VIDEO_SRC} type="video/mp4" />
            </video>
              <span className={styles['sehx2-wm']} data-wm-cover aria-hidden="true">
                <svg viewBox="0 0 100 100" fill="none">
                  <rect width="100" height="100" rx="22.5" fill="#0A0D12" />
                  <path
                    d="M44.8 22.9H55.2V44.8H76.7V55.2A21.7 21.7 0 0 0 55.2 76.9H44.8V55.2H23.2V44.8A21.7 21.7 0 0 0 44.8 22.9Z"
                    fill="#ffffff"
                  />
                </svg>
              </span>
          </div>

          <div className={styles['sehx2-media']} ref={mediaRef} data-wm-box>
            <video
              autoPlay
              muted
              loop
              playsInline
              preload="auto"
              disablePictureInPicture
              poster={HERO_POSTER_SRC}
            >
              <source src={HERO_VIDEO_SRC} type="video/mp4" />
            </video>
              <span className={styles['sehx2-wm']} data-wm-cover aria-hidden="true">
                <svg viewBox="0 0 100 100" fill="none">
                  <rect width="100" height="100" rx="22.5" fill="#0A0D12" />
                  <path
                    d="M44.8 22.9H55.2V44.8H76.7V55.2A21.7 21.7 0 0 0 55.2 76.9H44.8V55.2H23.2V44.8A21.7 21.7 0 0 0 44.8 22.9Z"
                    fill="#ffffff"
                  />
                </svg>
              </span>
            <div className={styles['sehx2-media-veil']} ref={veilRef} aria-hidden="true" />
            <div className={styles['sehx2-scrim']} ref={scrimRef} aria-hidden="true" />
          </div>

          <div className={styles['sehx2-title']} ref={titleRef} aria-hidden="true">
            <span
              className={`${styles['sehx2-word']} ${styles['sehx2-word-l']}`}
              ref={wlRef}
            >
              Wall Street Intelligence
            </span>
            <span
              className={`${styles['sehx2-word']} ${styles['sehx2-word-r']}`}
              ref={wrRef}
            >
              <em>Built for Everyday Investors.</em>
            </span>
          </div>

          <nav className={styles['sehx2-nav']}>
            <a className={styles['sehx2-nav-logo']} href="#sehx2-root" aria-label="Signal Pro">
              <svg viewBox="0 0 100 100" fill="none" aria-hidden="true">
                <rect width="100" height="100" rx="22.5" fill="#ffffff" />
                <path
                  d="M44.8 22.9H55.2V44.8H76.7V55.2A21.7 21.7 0 0 0 55.2 76.9H44.8V55.2H23.2V44.8A21.7 21.7 0 0 0 44.8 22.9Z"
                  fill="#0A0D12"
                />
              </svg>
              <span>
                <b>Signal</b>
                <i>Pro</i>
              </span>
            </a>

            <div className={styles['sehx2-nav-links']}>
              <a href="#splive-root" data-sxid="splive-root">
                Live Activity
              </a>
              <a href="#si-root" data-sxid="si-root">
                Features
              </a>
            </div>

            <a
              className={styles['sehx2-btn']}
              id="sehx2-book"
              data-sx-book="1"
              href="#spvsl-root"
              aria-label="Watch our short film now"
            >
              <span className={styles.glow} aria-hidden="true" />
              <span className={styles.body}>
                Watch our short film now
                <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </a>

            <button
              className={styles['sehx2-burger']}
              type="button"
              aria-label="Menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <span />
              <span />
              <span />
            </button>
          </nav>

          <div className={styles['sehx2-mobile-menu']}>
            <a href="#splive-root" data-sxid="splive-root">
              Live Activity
            </a>
            <a href="#si-root" data-sxid="si-root">
              Features
            </a>
            <a href="#sppricing-root" data-sxid="sppricing-root">
              Pricing
            </a>
          </div>

          <div className={styles['sehx2-hint']} ref={hintRef} aria-hidden="true">
            Scroll to expand
            <svg
              viewBox="0 0 24 24"
              fill="none"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>

          <div className={styles['sehx2-reveal']} ref={revealRef}>
            <h2 className={`${styles['sehx2-rev-h']} ${styles['sehx2-rev-desktop']}`}>
              The Research
              <br />
              <em className={styles['sx-grad']}>Behind the Returns.</em>
            </h2>
            <h2 className={`${styles['sehx2-rev-h']} ${styles['sehx2-rev-mobile']}`}>
              <span className={styles['sehx2-stz']}>The Research</span>
              <span className={styles['sehx2-stz']}>
                <em className={styles['sx-grad']}>Behind the Returns.</em>
              </span>
            </h2>
          </div>
        </div>
      </div>
    </div>
  )
}
