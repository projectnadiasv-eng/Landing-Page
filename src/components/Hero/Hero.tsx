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

import { useEffect, useRef, useState, type RefObject } from 'react'
import styles from './Hero.module.css'

/* legacy:437,444 — was a relative "videos/signal-pro.mp4". Both the full-bleed
   backdrop and the centre card play the SAME file; two <video> elements, one
   asset. */
const HERO_VIDEO_SRC = '/videos/signal-pro.mp4'

/* legacy:436,443 — was the same ~40KB base64 JPEG inlined twice. Extracted by
   scripts/extract-assets.mjs; manifest.json records both occurrences. */
const HERO_POSTER_SRC = '/img/hero-poster.jpg'

/* NOT legacy — a deliberate product change.

   The film opens on a wide approach shot and only reaches the composition the
   page should open on (the US flag hanging on the left, CIPRIANI banner above,
   Trinity spire centred) at ~3s.

   This is applied at runtime rather than by trimming the file. The video's
   keyframes sit at 0s and 5.005s, so cutting at 3s cannot be done by stream
   copy — it would force a full re-encode, losing the bit-identical quality the
   asset currently has and writing a second ~84MB blob into git history.
   Seeking costs nothing and keeps the start point tunable: change this number.

   Because of the offset the native `loop` attribute is gone. It would wrap to
   0 and replay the approach shot, so the loop is closed by hand below. */
const HERO_START_SECONDS = 3

/* NOT legacy — covering a burned-in watermark.

   The film carries a production badge in its bottom-left: a 131x131 light-grey
   (#D2D2D2) rounded square at (9, 942) in the 1920x1080 frame, present from
   ~9s to the end of the 202s runtime. It is in the pixels, so it can be
   covered but not removed.

   SIZE. The badge's corner radius measures ~24 of 131; the Signal Pro square's
   is 22.5%. Drawn at the same size the logo's ROUNDER corners would sit inside
   the badge's and leave four light slivers, so the square is scaled until its
   rounded rect contains the badge's. For a rounded square of side a and radius
   r the farthest point along the diagonal is (a/2 - r)*sqrt(2) + r from centre:
     badge (131, r) -> (65.5 - r) * sqrt(2) + r
     logo  (S, 0.225S) -> (0.275S) * sqrt(2) + 0.225S = 0.61391 S

   The badge radius is MEASURED, not known, and a brightness threshold reads an
   antialiased corner as tighter than it is — so the true radius is, if
   anything, smaller than 24, and a smaller radius needs a LARGER cover:
     r=24 -> 82.69   r=22 -> 83.52   r=20 -> 84.35   r=18 -> 85.18
   S=135 gives 82.88 and clears r=24 by 0.19px — inside the measurement error,
   so it is not a margin at all. S=140 gives 85.95 and covers every radius down
   to 18, which is well past anything the corner profile supports. That is
   4.5px of bleed per edge in frame pixels, about 3px on screen at this scale.
   Centred on the badge: x = 9 + (131 - 140)/2 = 4.5, y = 942 - 4.5 = 937.5. */
const WATERMARK = { x: 4.5, y: 937.5, size: 140, videoW: 1920, videoH: 1080 }

/* The badge sits 9px from the frame's LEFT edge, and object-fit:cover crops the
   sides whenever the viewport is narrower than 16:9 — ~48px a side at 1306x789.
   So the badge is itself half off-screen at those sizes, and a cover pinned to
   it goes off-screen with it, which reads as a logo chopped by the edge.

   Plate and glyph are therefore separate elements. The PLATE stays pinned to
   the badge, because that is the only thing that keeps the cover exact. The
   GLYPH slides to sit centred in whatever part of the plate the viewport can
   actually see, so the mark reads as a deliberate corner badge rather than a
   half-cropped logo. When nothing is cropped the shift is zero and the two are
   concentric, exactly as the brand mark is drawn. */
function SignalMark({ glyphRef }: { glyphRef: RefObject<SVGSVGElement | null> }) {
  return (
    <>
      <svg viewBox="0 0 100 100" fill="none" aria-hidden="true">
        <rect width="100" height="100" rx="22.5" fill="#0A0D12" />
      </svg>
      <svg viewBox="0 0 100 100" fill="none" aria-hidden="true" ref={glyphRef}>
        <path
          d="M44.8 22.9H55.2V44.8H76.7V55.2A21.7 21.7 0 0 0 55.2 76.9H44.8V55.2H23.2V44.8A21.7 21.7 0 0 0 44.8 22.9Z"
          fill="#ffffff"
        />
      </svg>
    </>
  )
}

/* The glyph spans 23.2..76.7 of the 100 box — 53.5% of the plate. */
const GLYPH_EXTENT = 0.535
/* Share of the VISIBLE slice the glyph should occupy once the plate is cropped.
   Sliding alone is not enough: at 1306x789 the slice is 57px against a glyph
   54.7px wide, so a centred glyph still grazes both edges. Shrinking it to 62%
   of the slice gives it room to read as centred. Capped at its natural size, so
   an uncropped plate is the brand mark drawn exactly as it is. */
const GLYPH_FIT = 0.62
/* Padding kept between the glyph and the plate's edge when the slide is clamped. */
const GLYPH_PAD = 0.03
/* Below this drawn width the glyph is hidden rather than shrunk further. When
   the plate is nearly all cropped — the card early in its expansion shows 1.5px
   of it, and a viewport far wider than 16:9 pushes the badge below the fold —
   fitting the glyph to the slice would render a 1-2px speck that reads as a
   defect. The PLATE still covers whatever sliver of badge is showing; only the
   mark inside it goes. */
const GLYPH_MIN_PX = 16

/* object-fit:cover scales the frame by the LARGER of the two ratios and centres
   the overflow, so where the badge lands depends on the container's aspect.
   Both videos are cover, so the same maths places both covers; it just has to
   re-run whenever a box changes size. */
function placeMark(
  host: HTMLElement | null,
  mark: HTMLElement | null,
  glyph: SVGSVGElement | null,
) {
  if (!host || !mark) return
  const w = host.clientWidth
  const h = host.clientHeight
  if (!w || !h) return
  const s = Math.max(w / WATERMARK.videoW, h / WATERMARK.videoH)
  const left = (w - WATERMARK.videoW * s) / 2 + WATERMARK.x * s
  const top = (h - WATERMARK.videoH * s) / 2 + WATERMARK.y * s
  const size = WATERMARK.size * s
  mark.style.left = left.toFixed(2) + 'px'
  mark.style.top = top.toFixed(2) + 'px'
  mark.style.width = size.toFixed(2) + 'px'
  mark.style.height = size.toFixed(2) + 'px'

  if (!glyph) return
  /* The visible slice of the plate, in host coordinates. Both axes matter: a
     viewport WIDER than 16:9 crops vertically instead, and the badge sits 7px
     off the frame's bottom, so it is the bottom that goes then. */
  const seenL = Math.max(0, left)
  const seenR = Math.min(w, left + size)
  const seenT = Math.max(0, top)
  const seenB = Math.min(h, top + size)
  const seenMin = Math.min(seenR - seenL, seenB - seenT)
  if (seenMin <= 0) {
    glyph.style.opacity = '0'
    return
  }

  /* Shrink to fit the slice, then slide to its centre. Both are no-ops when
     nothing is cropped: the scale caps at 1 and the offsets come out 0. */
  const scale = Math.min(1, (GLYPH_FIT * seenMin) / (GLYPH_EXTENT * size))
  const half = (GLYPH_EXTENT / 2) * scale * size
  const limit = Math.max(0, size / 2 - half - GLYPH_PAD * size)
  const clampTo = (v: number) => Math.max(-limit, Math.min(limit, v))
  const dx = clampTo((seenL + seenR) / 2 - left - size / 2)
  const dy = clampTo((seenT + seenB) / 2 - top - size / 2)
  glyph.style.transform =
    'translate(' + dx.toFixed(2) + 'px,' + dy.toFixed(2) + 'px) scale(' + scale.toFixed(4) + ')'
  glyph.style.opacity = GLYPH_EXTENT * scale * size >= GLYPH_MIN_PX ? '1' : '0'
}

/* legacy:604-608 — deeplink targets that are NOT ids in the ported tree, with
   the selector list the legacy script falls back to for each. */
/* NOTE: 'sppricing-root' IS reachable again — the nav's third item ("Become
   Pro") points at it, and it is a real id on the Pricing block, so findById()
   resolves it on the first lookup and this fallback never runs. It is kept as
   a belt-and-braces entry for the same reason the map exists at all.
   'spfeatures-root' remains a no-op: the id does not exist, none of its four
   selectors match the ported markup, and no heading contains both "social" and
   "intelligence". Features was repointed at #spphones-root, a real id. */
const FALLBACKS: Record<string, string[]> = {
  'spfeatures-root': ['.teaser', '.shell__title', '#colX', '#xfeed'],
  'splive-root': ['.c-grid'],
  'sppricing-root': ['.p-grid'],
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
  const wmBgRef = useRef<HTMLSpanElement | null>(null)
  const wmMediaRef = useRef<HTMLSpanElement | null>(null)
  const wmBgGlyphRef = useRef<SVGSVGElement | null>(null)
  const wmMediaGlyphRef = useRef<SVGSVGElement | null>(null)

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

    /* ---- start offset + hand-rolled loop (see HERO_START_SECONDS) ----------
       Only ever seeks FORWARD to the start mark, so it cannot yank playback
       backwards once the film is running past it. */
    const videoCleanups: Array<() => void> = []
    for (const v of vids) {
      const ensureStart = () => {
        try {
          if (v.currentTime < HERO_START_SECONDS - 0.05) v.currentTime = HERO_START_SECONDS
        } catch {
          /* seeking before metadata lands throws in some browsers */
        }
      }
      const onEnded = () => {
        try {
          v.currentTime = HERO_START_SECONDS
        } catch {
          /* ignore */
        }
        const pr = v.play()
        if (pr && pr.catch) pr.catch(() => {})
      }
      /* readyState >= HAVE_METADATA means duration is known and seeking is safe;
         if the metadata already arrived the event will not fire again. */
      if (v.readyState >= 1) ensureStart()
      v.addEventListener('loadedmetadata', ensureStart)
      v.addEventListener('ended', onEnded)
      videoCleanups.push(() => {
        v.removeEventListener('loadedmetadata', ensureStart)
        v.removeEventListener('ended', onEnded)
      })
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

      /* The card is resized above on every tick, and the backdrop tracks the
         viewport, so both covers are re-placed here rather than on their own
         listeners. apply() also runs on resize (see `render`). */
      placeMark(media, wmMediaRef.current, wmMediaGlyphRef.current)
      placeMark(bg, wmBgRef.current, wmBgGlyphRef.current)
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

      teardown.push(() => {
        window.removeEventListener('wheel', onWheel)
        window.removeEventListener('touchstart', onTouchStart)
        window.removeEventListener('touchmove', onTouchMove)
        window.removeEventListener('touchend', onTouchEnd)
        window.removeEventListener('scroll', lockTop)
      })
    }

    /* Resize is handled for BOTH branches. It used to live inside the else,
       which was harmless while apply() only drove the scroll animation — the
       reduced-motion path runs apply(1) once and was done. It is not harmless
       now: apply() also places the watermark covers, and where they belong
       depends on the container's aspect ratio. Without this a reduced-motion
       user who resized would watch the cover slide off the badge. */
    window.addEventListener('resize', render, { passive: true })
    teardown.push(() => window.removeEventListener('resize', render))

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
      if (id === 'spfeatures-root') {
        const h = findByHeading(['social', 'intelligence'])
        if (h) return h
      }
      return null
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
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
          <div className={styles['sehx2-bg']} ref={bgRef} aria-hidden="true">
            <video
              autoPlay
              muted
              playsInline
              preload="auto"
              disablePictureInPicture
              poster={HERO_POSTER_SRC}
            >
              <source src={HERO_VIDEO_SRC} type="video/mp4" />
            </video>
            <span className={styles['sehx2-wm']} ref={wmBgRef}>
              <SignalMark glyphRef={wmBgGlyphRef} />
            </span>
          </div>

          <div className={styles['sehx2-media']} ref={mediaRef}>
            <video
              autoPlay
              muted
              playsInline
              preload="auto"
              disablePictureInPicture
              poster={HERO_POSTER_SRC}
            >
              <source src={HERO_VIDEO_SRC} type="video/mp4" />
            </video>
            <span className={styles['sehx2-wm']} ref={wmMediaRef}>
              <SignalMark glyphRef={wmMediaGlyphRef} />
            </span>
            <div className={styles['sehx2-media-veil']} ref={veilRef} aria-hidden="true" />
            <div className={styles['sehx2-scrim']} ref={scrimRef} aria-hidden="true" />
          </div>

          <div className={styles['sehx2-title']} ref={titleRef} aria-hidden="true">
            <span
              className={`${styles['sehx2-word']} ${styles['sehx2-word-l']}`}
              ref={wlRef}
            >
              Join the
            </span>
            <span
              className={`${styles['sehx2-word']} ${styles['sehx2-word-r']}`}
              ref={wrRef}
            >
              <em>inner circle</em>
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
              <a href="#spphones-root" data-sxid="spphones-root">
                Features
              </a>
              {/* data-sxid, not a bare href: the effect above binds every
                  [data-sxid] in this root to go(), which is what gives the
                  nav its smooth scroll. A plain anchor would jump. */}
              <a href="#sppricing-root" data-sxid="sppricing-root">
                Become Pro
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
            <a href="#spphones-root" data-sxid="spphones-root">
              Features
            </a>
            <a href="#sppricing-root" data-sxid="sppricing-root">
              Become Pro
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
              Get access to
              <br />
              <em className={styles['sx-grad']}>professional-grade market research</em>
            </h2>
            <h2 className={`${styles['sehx2-rev-h']} ${styles['sehx2-rev-mobile']}`}>
              <span className={styles['sehx2-stz']}>Get access to</span>
              <span className={styles['sehx2-stz']}>
                <em className={styles['sx-grad']}>professional-grade market research</em>
              </span>
            </h2>
          </div>
        </div>
      </div>
    </div>
  )
}
