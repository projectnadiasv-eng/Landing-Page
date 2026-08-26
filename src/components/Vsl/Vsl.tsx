'use client'

/* ============================================================================
   Block 04 — the short-film player.  legacy/index.html 1003-1299.
   Root id is #spvsl-root (hero nav deeplink); element ids are vslsec-* (the
   script's targets).  BOTH spellings are legacy and both are preserved.
   ========================================================================= */

import { useEffect, useRef } from 'react'
import styles from './Vsl.module.css'

/* The poster's palette.
 *
 * This is the ONE surface in the repo that the navy recolour cannot reach from
 * theme-navy.css. The poster is a data-URI SVG: it is its own document, so the
 * page's custom properties do not cascade into it and there is no selector that
 * can retint it. The ladder therefore lives here, in the only place that can
 * paint it, and mirrors the --navy-* ladder value for value.
 *
 * CONSEQUENCE, stated plainly: deleting theme-navy.css reverts every other
 * block to cream and leaves THIS ONE navy. The cream original of each value is
 * kept in the comment beside it so that revert is a mechanical swap, not an
 * archaeology exercise. */
const POSTER = {
  baseTop:  '#16203A', // was #241A14  — card face, top of the vertical fade
  baseBot:  '#0A1020', // was #12100E  — bottom; the page's own colour
  glow:     '#8FA3C9', // was #D8B89C  — the soft centre bloom
  grid:     '#F2F5FA', // was #FAF0E9  — 40px graticule, 0.07 alpha
  lineLo:   '#8FA3C9', // was #D8B89C  — chart line, dimmest (left) stop
  lineMid:  '#BAC6DB', // was #E0D5B7  — chart line, middle stop
  lineHi:   '#F2F5FA', // was #FAF0E9  — chart line, brightest (right) stop
  lineHalo: '#BAC6DB', // was #E0D5B7  — the wide soft pass under the line
  ink:      '#F2F5FA', // was #FAF0E9  — "The Short Film", dots
  eyebrow:  '#BAC6DB', // was #EFD7C8  — "SIGNAL PRO"
  rule:     '#8FA3C9', // was #D8B89C  — the short rule under the title
} as const

/* legacy:1174-1259 — vslsecPoster().  Takes no input and always produces the
   same string, so it is hoisted to module scope and evaluated once.  The defs
   ids (vsBase, vsGlow, vsFade, vsMask, vsGrid, vsLine) are scoped inside the
   svg and are unchanged.  The concatenation is the legacy one with its colour
   literals lifted into POSTER above; its geometry is untouched.
   It is kept as a data URI rather than inlined as JSX because the <video>
   poster= attribute needs a URL anyway, and because background-size:cover on a
   content box that is not exactly 16/9 (the card has a 3px border) crops
   differently from an inline <svg>. */
const VS_POSTER_URI = (() => {
  const line =
    'M0 742 L110 730 L220 748 L330 700 L440 716 L550 664 L660 688 ' +
    'L770 626 L880 648 L990 580 L1100 606 L1210 528 L1320 556 ' +
    'L1430 470 L1540 496 L1600 452'
  const mono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
  const sans =
    '-apple-system, BlinkMacSystemFont, Helvetica Neue, Helvetica, Arial, sans-serif'

  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" width="1600" height="900">' +
    '<defs>' +
    '<linearGradient id="vsBase" x1="0" y1="0" x2="0" y2="1">' +
    `<stop offset="0" stop-color="${POSTER.baseTop}"/><stop offset="1" stop-color="${POSTER.baseBot}"/>` +
    '</linearGradient>' +
    '<radialGradient id="vsGlow" cx="0.5" cy="0.32" r="0.72">' +
    `<stop offset="0" stop-color="${POSTER.glow}" stop-opacity="0.26"/>` +
    `<stop offset="0.62" stop-color="${POSTER.glow}" stop-opacity="0"/>` +
    '</radialGradient>' +
    '<radialGradient id="vsFade" cx="0.5" cy="0.45" r="0.62">' +
    '<stop offset="0" stop-color="#ffffff" stop-opacity="1"/>' +
    '<stop offset="0.78" stop-color="#ffffff" stop-opacity="0"/>' +
    '</radialGradient>' +
    '<mask id="vsMask"><rect width="1600" height="900" fill="url(#vsFade)"/></mask>' +
    '<pattern id="vsGrid" width="64" height="64" patternUnits="userSpaceOnUse">' +
    `<path d="M64 0H0v64" fill="none" stroke="${POSTER.grid}" stroke-opacity="0.07" stroke-width="1"/>` +
    '</pattern>' +
    '<linearGradient id="vsLine" x1="0" y1="0" x2="1" y2="0">' +
    `<stop offset="0" stop-color="${POSTER.lineLo}" stop-opacity="0.12"/>` +
    `<stop offset="0.55" stop-color="${POSTER.lineMid}" stop-opacity="0.55"/>` +
    `<stop offset="1" stop-color="${POSTER.lineHi}" stop-opacity="0.92"/>` +
    '</linearGradient>' +
    '</defs>' +
    '<rect width="1600" height="900" fill="url(#vsBase)"/>' +
    '<rect width="1600" height="900" fill="url(#vsGrid)" mask="url(#vsMask)"/>' +
    '<rect width="1600" height="900" fill="url(#vsGlow)"/>' +
    '<path d="' + line + `" fill="none" stroke="${POSTER.lineHalo}" stroke-opacity="0.14" ` +
    'stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path d="' + line + '" fill="none" stroke="url(#vsLine)" ' +
    'stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>' +
    `<circle cx="1600" cy="452" r="9" fill="${POSTER.ink}"/>` +
    `<circle cx="98" cy="94" r="7" fill="${POSTER.ink}" fill-opacity="0.92"/>` +
    `<circle cx="98" cy="94" r="13" fill="none" stroke="${POSTER.ink}" stroke-opacity="0.22" stroke-width="2"/>` +
    '<text x="128" y="102" font-family="' + mono + '" font-size="25" font-weight="600" ' +
    `letter-spacing="7" fill="${POSTER.eyebrow}" fill-opacity="0.88">SIGNAL PRO</text>` +
    '<text x="96" y="806" font-family="' + sans + '" font-size="58" font-weight="700" ' +
    `letter-spacing="-1.4" fill="${POSTER.ink}">The Short Film</text>` +
    `<rect x="96" y="836" width="86" height="4" rx="2" fill="${POSTER.rule}"/>` +
    '</svg>'

  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
})()

/* legacy:1161 — was a HighLevel CDN URL on data-src.  Still lazy: preload="none",
   the URL lives on data-src and is only copied onto src on the play click. */
const VS_VIDEO_SRC = '/videos/short-film.mp4'

export default function Vsl() {
  const rootRef = useRef<HTMLElement | null>(null)
  const playRef = useRef<HTMLButtonElement | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)

  /* legacy:1261-1268 — vslsecReveal(), bound to scroll and resize, both passive.
     Viewport-dependent, so it must not run during render: the served HTML ships
     without .vs-in exactly as the legacy HTML does. */
  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    const vslsecReveal = () => {
      const r = root.getBoundingClientRect()
      if (r.top < (window.innerHeight || document.documentElement.clientHeight) * 0.85) {
        root.classList.add(styles['vs-in'])
      }
    }

    vslsecReveal()
    window.addEventListener('scroll', vslsecReveal, { passive: true })
    window.addEventListener('resize', vslsecReveal, { passive: true })

    return () => {
      window.removeEventListener('scroll', vslsecReveal)
      window.removeEventListener('resize', vslsecReveal)
    }
  }, [])

  /* legacy:1269-1298 — the player.  window.vslsecPlay is kept (legacy:1287);
     the window.top assignment on 1288 is deleted dead HighLevel code. */
  useEffect(() => {
    const play = playRef.current
    const video = videoRef.current

    const vslsecPlay = () => {
      if (!video) return
      if (!video.getAttribute('src')) {
        const src = video.getAttribute('data-src')
        if (src) video.setAttribute('src', src)
        video.load()
      }
      video.classList.add(styles['vs-on'])
      if (play) play.style.display = 'none'
      const p = video.play()
      if (p && typeof p.catch === 'function') {
        p.catch(function () {
          if (play) play.style.display = 'flex'
        })
      }
    }

    const onEnded = () => {
      if (!video) return
      video.classList.remove(styles['vs-on'])
      video.currentTime = 0
      if (play) play.style.display = 'flex'
    }

    window.vslsecPlay = vslsecPlay
    if (play && video) play.addEventListener('click', vslsecPlay)
    if (video) video.addEventListener('ended', onEnded)

    return () => {
      if (play && video) play.removeEventListener('click', vslsecPlay)
      if (video) video.removeEventListener('ended', onEnded)
      if (window.vslsecPlay === vslsecPlay) delete window.vslsecPlay
    }
  }, [])

  return (
    /* .vs-poster-on (legacy:1265) is applied at render, not in an effect: the
       poster URI is a constant, so there is no hydration hazard and no flash of
       the ::after grid that the class suppresses. */
    <section
      id="spvsl-root"
      ref={rootRef}
      className={styles['vs-poster-on']}
    >
      <div className={styles['vs-inner']}>
        <span className={styles['vs-eyebrow']}>Watch Our Short Film</span>
        <h2 className={styles['vs-h']}>
          Wall Street intelligence,{' '}
          <span className={styles['vs-accent']}>without the Wall Street price tag.</span>
        </h2>

        <div className={styles['vs-card']}>
          <div
            className={styles['vs-poster']}
            aria-hidden="true"
            style={{ backgroundImage: `url("${VS_POSTER_URI}")` }}
          />
          <button
            className={styles['vs-play']}
            id="vslsec-play"
            type="button"
            aria-label="Play the film"
            ref={playRef}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
          <video
            className={styles['vs-video']}
            id="vslsec-video"
            ref={videoRef}
            data-src={VS_VIDEO_SRC}
            poster={VS_POSTER_URI}
            preload="none"
            playsInline
            webkit-playsinline=""
            controls
            controlsList="nodownload"
          />
        </div>
      </div>
    </section>
  )
}
