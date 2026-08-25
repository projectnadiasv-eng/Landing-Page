'use client'

/* ============================================================================
   Block 07 — the social intelligence preview.  legacy/index.html 2774-3979.
   Root id is #si-root, and the hero's "Features" nav item now targets it directly.
   It used to aim at #spfeatures-root and resolve "through the FALLBACKS map in
   Hero.tsx" — it did not: no element carries that id, every fallback selector is a
   legacy class name that CSS Modules has hashed away, and the heading search looked
   for words this section's h2 does not contain. The link was dead. Renaming this id
   breaks the nav item, so change both together.

   The legacy script builds EVERYTHING below the search box as HTML strings and
   assigns them with innerHTML: the sentiment band, both feeds, the skeletons,
   even the highlight <mark> tags. docs/OWNERSHIP.md forbids
   dangerouslySetInnerHTML, so all of it is React nodes here. Two consequences
   worth naming:

   - esc() disappears. It existed only because the strings were concatenated;
     React escapes text by construction. Removing it cannot change output — it
     was applied to every interpolation.
   - highlight() returned a string with <mark> in it. It is now
     highlightNodes(), which returns a ReactNode[] and splits on the SAME regex,
     so the same substrings get marked.

   Behaviour deliberately preserved, including the quirks:
   - arrival() inserts a post at the TOP of the X stream without re-sorting the
     list. Reproduced with a separate `arrivals` array rendered above the sorted
     feed and cleared on the next real render, which is exactly what the DOM did.
   - The 16-post cap, the 360ms fake query latency, and the '$NVDA' initial
     search are all legacy.
   ========================================================================= */

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import styles from './SocialIntel.module.css'
import {
  ALIAS, ARRIVALS, CHIPS, DATA, RD_HOT, RD_NEW, RD_TOP, generic,
  type Ai, type Dataset, type RdPost, type XPost,
} from './SocialIntel.data'

/* ---- legacy:3588-3597 — highlight, as nodes instead of a string ---------- */
const rxEsc = (s: string) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function highlightNodes(text: string, terms: string[] | undefined): ReactNode {
  const parts = (terms || []).filter(Boolean).slice().sort((a, b) => b.length - a.length).map(rxEsc)
  if (!parts.length) return text
  /* Same expression as legacy: a term only matches when it is not glued to a
     word character on either side. The leading group is captured so it can be
     re-emitted unmarked. */
  const rx = new RegExp('(^|[^A-Za-z0-9_$])(' + parts.join('|') + ')(?![A-Za-z0-9_])', 'gi')
  const out: ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = rx.exec(text))) {
    out.push(text.slice(last, m.index + m[1].length))
    out.push(<mark key={k++}>{m[2]}</mark>)
    last = m.index + m[0].length
  }
  out.push(text.slice(last))
  return out
}

/* ---- legacy:3601-3622 — formatting helpers, unchanged -------------------- */
function parseTime(t: string) {
  const m = String(t).match(/^(\d+)\s*([mhdy])$/)
  if (!m) return 0
  const n = parseInt(m[1], 10)
  return m[2] === 'm' ? n : m[2] === 'h' ? n * 60 : m[2] === 'd' ? n * 1440 : n * 525600
}
function fmtTime(min: number) {
  if (min < 1) return 'now'
  if (min < 60) return Math.round(min) + 'm'
  if (min < 1440) return Math.floor(min / 60) + 'h'
  if (min < 525600) return Math.floor(min / 1440) + 'd'
  return Math.floor(min / 525600) + 'y'
}
function fmtNum(n: number) {
  if (n >= 1000000) return (n / 1000000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}
const initials = (name: string) =>
  name.split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase()

function sentimentColor(score: number) {
  if (score >= 60) return { arc: 'var(--s-bull)', ink: 'var(--s-bull-ink)' }
  if (score >= 45) return { arc: 'var(--s-neu)', ink: 'var(--s-neu-ink)' }
  return { arc: 'var(--s-bear)', ink: 'var(--s-bear-ink)' }
}

const ARC_LEN = 201.06

/* Five marks around the dial at 0/25/50/75/100. The arc is a true semicircle of
   r=64 about (84,88), so a tick at fraction t sits on the ray a = pi*(1-t) —
   t=0 lands on (20,88), t=1 on (148,88), t=.5 on the top. Drawn from r=74 to
   r=79, clear of the 12px stroke (which spans r=58..70) with daylight between,
   because a tick touching the arc reads as a defect in the arc. */
const DIAL_TICKS = [0, 0.25, 0.5, 0.75, 1].map((t) => {
  const a = Math.PI * (1 - t)
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  return {
    t,
    x1: 84 + 74 * cos, y1: 88 - 74 * sin,
    x2: 84 + 79 * cos, y2: 88 - 79 * sin,
  }
})

/* ---- legacy:3724-3733 — the action icons -------------------------------- */
const Ic = {
  reply: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.4 8.4 0 0 1-3.8-.9L3 21l2-4.9A8.4 8.4 0 1 1 21 11.5z" />
    </svg>
  ),
  rt: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17 2l4 4-4 4" /><path d="M3 12V9a3 3 0 0 1 3-3h15" />
      <path d="M7 22l-4-4 4-4" /><path d="M21 12v3a3 3 0 0 1-3 3H3" />
    </svg>
  ),
  like: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1l8.8 8.8 8.8-8.8a5 5 0 0 0 0-7.1z" />
    </svg>
  ),
  views: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 20V10" /><path d="M10 20V4" /><path d="M16 20v-6" /><path d="M22 20V8" />
    </svg>
  ),
  ver: (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <path d="M17 9l-6.2 6.2L7 11.4" fill="none" stroke="#000" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  up: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 4l8 9h-5v7H9v-7H4z" />
    </svg>
  ),
  cmt: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.4 8.4 0 0 1-3.8-.9L3 21l2-4.9A8.4 8.4 0 1 1 21 11.5z" />
    </svg>
  ),
}

/* legacy:3739-3745 — 26 random bars behind a chart-style attachment. Seeded per
   post id so a re-render does not reshuffle the bars. */
function useSpark(seed: string) {
  const cache = useRef<Map<string, number[]>>(new Map())
  if (!cache.current.has(seed)) {
    const bars: number[] = []
    for (let i = 0; i < 26; i++) bars.push(18 + Math.round(Math.random() * 80))
    cache.current.set(seed, bars)
  }
  return cache.current.get(seed)!
}

/* ---- legacy:3748-3775 — an X post --------------------------------------- */
function XPostView({ p, terms, isNew }: { p: XPost; terms: string[]; isNew: boolean }) {
  const bars = useSpark(p._id || p.handle)
  return (
    <article className={isNew ? `${styles['x-post']} ${styles['is-new']}` : styles['x-post']} data-id={p._id}>
      <div className={styles['x-av']} style={{ background: p.av }}>{initials(p.name)}</div>
      <div className={styles['x-body']}>
        <div className={styles['x-line1']}>
          <span className={styles['x-name']}>{p.name}</span>
          {p.v ? <span className={styles['x-ver']}>{Ic.ver}</span> : null}
          <span className={styles['x-handle']}>@{p.handle}</span>
          <span className={styles['x-dot']}>·</span>
          <span className={styles['x-time']}>{fmtTime(p._m || 0)}</span>
        </div>
        <p className={styles['x-text']}>{highlightNodes(p.text, terms)}</p>
        {p.media ? (
          <div className={styles['x-media']}>
            <div className={styles['x-media-in']}>
              <div className={styles['x-spark']}>
                {bars.map((h, i) => <i key={i} style={{ height: h + '%' }} />)}
              </div>
              <div className={styles['x-media-cap']}>{p.media.cap}</div>
              <div className={styles['x-media-sub']}>{p.media.sub}</div>
            </div>
          </div>
        ) : null}
        <div className={styles['x-actions']}>
          <span className={`${styles['x-act']} ${styles['is-r']}`}>{Ic.reply}{fmtNum(p.r)}</span>
          <span className={`${styles['x-act']} ${styles['is-rt']}`}>{Ic.rt}{fmtNum(p.rt)}</span>
          <span className={`${styles['x-act']} ${styles['is-l']}`}>{Ic.like}<b style={{ fontWeight: 500 }}>{fmtNum(p.l)}</b></span>
          <span className={styles['x-act']}>{Ic.views}<b style={{ fontWeight: 500 }}>{fmtNum(p.vw)}</b></span>
        </div>
      </div>
    </article>
  )
}

/* ---- legacy:3777-3799 — a Reddit thread --------------------------------- */
function RdPostView({ p, terms, bump }: { p: RdPost; terms: string[]; bump: string | null }) {
  return (
    <article className={styles['rd-post']} data-id={p._id}>
      <div className={styles['rd-meta']}>
        <span className={styles['rd-sub']}>
          <span className={styles['rd-cdot']} style={{ ['--c' as string]: p.c }} />
          {p.sub}
        </span>
        <span>·</span><span>{p.author}</span>
        <span>·</span><span>{fmtTime(p._m || 0)}</span>
      </div>
      <h3 className={styles['rd-title']}>{highlightNodes(p.title, terms)}</h3>
      {p.flair ? <span className={styles['rd-flair']}>{p.flair}</span> : null}
      <p className={styles['rd-body']}>{highlightNodes(p.body, terms)}</p>
      <div className={styles['rd-foot']}>
        <span className={styles['rd-pill']}>
          <span className={styles['rd-up']}>{Ic.up}</span>
          <b className={bump === p._id ? `${styles['rd-score']} ${styles['is-bump']}` : styles['rd-score']}>
            {fmtNum(p.score)}
          </b>
        </span>
        <span className={styles['rd-pill']}>{Ic.cmt}{fmtNum(p.comments)}</span>
      </div>
      {p.top && p.top.length ? (
        <div className={styles['rd-top']}>
          {p.top.map((c, i) => (
            <div className={styles['rd-c']} key={i}>
              <span className={styles['rd-cbar']} />
              <div className={styles['rd-cbody']}>
                <div className={styles['rd-cauthor']}>{c.a}</div>
                <p className={styles['rd-ctext']}>{highlightNodes(c.t, terms)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </article>
  )
}

/* ---- legacy:3801-3815 — loading skeletons ------------------------------- */
function Skeletons({ kind, n }: { kind: 'x' | 'rd'; n: number }) {
  const widths = useRef<number[][] | null>(null)
  if (!widths.current) {
    widths.current = Array.from({ length: n }, () => [
      38 + Math.round(Math.random() * 22),
      62 + Math.round(Math.random() * 28),
    ])
  }
  return (
    <>
      {widths.current.map(([w1, w2], i) => (
        <div className={styles.sk} key={i}>
          {kind === 'x' ? <div className={`${styles['sk-c']} ${styles['sk-av']}`} /> : null}
          <div className={styles['sk-lines']}>
            <div className={styles['sk-c']} style={{ height: '12px', width: w1 + '%' }} />
            <div className={styles['sk-c']} style={{ height: '11px', width: '96%' }} />
            <div className={styles['sk-c']} style={{ height: '11px', width: w2 + '%' }} />
            <div className={styles['sk-c']} style={{ height: '11px', width: '44%' }} />
          </div>
        </div>
      ))}
    </>
  )
}

const EmptyState = ({ title, body }: { title: string; body: string }) => (
  <div className={styles['si-empty']}><b>{title}</b><span>{body}</span></div>
)

/* ---- legacy:3701-3721 — sort orders ------------------------------------- */
function xView(posts: XPost[], tab: string) {
  const list = posts.slice()
  if (tab === 'latest') return list.sort((a, b) => (a._m || 0) - (b._m || 0))
  if (tab === 'media') return list.filter((p) => !!p.media).sort((a, b) => (a._m || 0) - (b._m || 0))
  return list.sort((a, b) => {
    const wa = a.l + a.rt * 2 + a.r * 3 + a.vw / 1000
    const wb = b.l + b.rt * 2 + b.r * 3 + b.vw / 1000
    return wb - wa
  })
}
function rdView(d: Dataset, sort: string): RdPost[] {
  if (sort === 'new') return d.reddit.concat(d._new || []).sort((a, b) => (a._m || 0) - (b._m || 0))
  if (sort === 'top') return d.reddit.concat(d._top || []).sort((a, b) => b.score - a.score)
  if (sort === 'hot') {
    const hot = (p: RdPost) => Math.log10(Math.max(p.score, 1)) - (p._m || 0) / 60 / 12
    return d.reddit.concat(d._hot || []).sort((a, b) => hot(b) - hot(a))
  }
  return d.reddit.slice()
}

let UID = 0

/* legacy:3630-3641 — stamp ids and ages, and pre-build the alternate sorts. */
function normalize(d: Dataset): Dataset {
  d.posts.forEach((p) => { p._m = parseTime(p.time); p._id = 'x' + ++UID })
  d.reddit.forEach((p) => { p._m = parseTime(p.time); p._id = 'r' + ++UID })
  const key = d.short || d.display
  d._new = RD_NEW(key).map((p) => { p._m = parseTime(p.time); p._id = 'r' + ++UID; return p })
  d._hot = RD_HOT(key).map((p) => { p._m = parseTime(p.time); p._id = 'r' + ++UID; return p })
  d._top = RD_TOP(key).map((p) => { p._m = parseTime(p.time); p._id = 'r' + ++UID; return p })
  d._arrivals = ARRIVALS(key).map((p) => { p._m = 0; return p })
  d._ai = 0
  return d
}

/* legacy:3570-3576 — the fake data source, 360ms of latency and a deep copy. */
async function query(raw: string): Promise<Dataset> {
  const key = ALIAS[String(raw || '').trim().toLowerCase()]
  await new Promise((r) => setTimeout(r, 360))
  const base = key ? DATA[key] : generic(raw)
  return JSON.parse(JSON.stringify(base)) as Dataset
}

export default function SocialIntel() {
  const rootRef = useRef<HTMLElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const xStreamRef = useRef<HTMLDivElement | null>(null)
  const rdStreamRef = useRef<HTMLDivElement | null>(null)
  const dialRef = useRef<SVGPathElement | null>(null)
  const capRef = useRef<SVGGElement | null>(null)

  const dataRef = useRef<Dataset | null>(null)
  const [, forceRender] = useState(0)
  const [bump, setBump] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState<string | null>(null)
  const [xTab, setXTab] = useState<'top' | 'latest' | 'media'>('top')
  const [rdSort, setRdSort] = useState<'rel' | 'hot' | 'new' | 'top'>('rel')
  const [feed, setFeed] = useState<'x' | 'rd'>('x')
  const [expanded, setExpanded] = useState(false)
  const [activeChip, setActiveChip] = useState<string | null>(null)
  const [arrivals, setArrivals] = useState<XPost[]>([])
  const [stacked, setStacked] = useState(false)

  /* legacy serves <div id="siX"></div> EMPTY and fills it from script, so the
     skeletons must not exist in the server output. Rendering them during SSR
     also desynced Math.random() between server and client — a real hydration
     mismatch. Gating on mount fixes both at once. */
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const repaint = useCallback(() => forceRender((n) => n + 1), [])

  /* legacy:3941-3952 — run(). */
  const run = useCallback(async (raw: string) => {
    const q = String(raw || '').trim()
    if (!q) return
    setExpanded(false)
    setLoading(true)
    setArrivals([])
    setActiveChip(q.toLowerCase())
    /* Name the pending query straight away, in the bar and in the band's label.
       Legacy only wrote the input AFTER the await, so a chip click left the bar
       reading the OLD ticker for the whole 360ms — the bar, the read and the
       feeds each naming a different thing at the same moment. */
    setPending(q)
    if (inputRef.current) inputRef.current.value = q
    const d = normalize(await query(q))
    dataRef.current = d
    if (inputRef.current) inputRef.current.value = d.display
    setPending(null)
    setLoading(false)
    repaint()
  }, [repaint])

  /* legacy:3976 — the page opens on $NVDA. */
  useEffect(() => { run('$NVDA') }, [run])

  /* legacy:3652-3660 — the dial is animated imperatively so the arc eases in. */
  useEffect(() => {
    const d = dataRef.current
    const fill = dialRef.current
    if (!d || !fill) return
    const cap = capRef.current
    const raf = requestAnimationFrame(() => {
      const c = sentimentColor(d.ai.score)
      fill.setAttribute('stroke', c.arc)
      fill.style.strokeDasharray = String(ARC_LEN)
      fill.style.strokeDashoffset = String(ARC_LEN - ARC_LEN * (d.ai.score / 100))
      /* The cap rides the end of the arc. Driven from the same frame so the two
         share one easing and the dot cannot lag the stroke it terminates.
         style.transform, not the transform ATTRIBUTE: only the CSS property
         transitions reliably, and the CSS transform-origin in the stylesheet is
         what puts the rotation on the dial's centre rather than the viewBox's. */
      if (cap) {
        cap.style.transform = 'rotate(' + d.ai.score * 1.8 + 'deg)'
        cap.style.color = c.arc
      }
    })
    return () => cancelAnimationFrame(raf)
  })

  /* legacy:3966-3971 — the three background timers. */
  useEffect(() => {
    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    /* legacy:3833-3841 — every visible timestamp ages one minute. */
    const age = window.setInterval(() => {
      const d = dataRef.current
      if (!d) return
      ;[...d.posts, ...d.reddit, ...(d._new || []), ...(d._hot || []), ...(d._top || [])]
        .forEach((p) => { p._m = (p._m || 0) + 1 })
      repaint()
    }, 60000)

    if (REDUCED) return () => window.clearInterval(age)

    /* legacy:3843-3860 — one Reddit score and one X post drift. */
    const drift = window.setInterval(() => {
      const d = dataRef.current
      if (!d) return
      const rp = d.reddit[Math.floor(Math.random() * d.reddit.length)]
      if (rp) {
        rp.score += Math.floor(Math.random() * 7) - 1
        setBump(rp._id || null)
        window.setTimeout(() => setBump(null), 600)
      }
      const xp = d.posts[Math.floor(Math.random() * d.posts.length)]
      if (xp) {
        xp.l += Math.floor(Math.random() * 9)
        xp.vw += Math.floor(Math.random() * 900)
      }
      repaint()
    }, 6000)

    /* legacy:3862-3877 — a new post lands at the top of the X stream. */
    const arrive = window.setInterval(() => {
      const d = dataRef.current
      if (!d || !d._arrivals?.length) return
      if (xTab === 'media') return
      const src = d._arrivals[(d._ai || 0) % d._arrivals.length]
      d._ai = (d._ai || 0) + 1
      const p: XPost = JSON.parse(JSON.stringify(src))
      p._m = 0
      p._id = 'x' + ++UID
      d.posts.unshift(p)
      if (d.posts.length > 16) d.posts.pop()
      const host = xStreamRef.current
      /* legacy only shows it when the reader is at the top of the stream. */
      if (xTab === 'latest' || (host && host.scrollTop < 40)) {
        setArrivals((a) => [p, ...a])
      }
      repaint()
    }, 11000)

    return () => {
      window.clearInterval(age)
      window.clearInterval(drift)
      window.clearInterval(arrive)
    }
  }, [repaint, xTab])

  /* legacy:3924-3930 — Cmd/Ctrl-K focuses the search. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  /* legacy:3955-3963 — below 860px the two feeds collapse into one tabbed pane. */
  useEffect(() => {
    const mq = window.matchMedia('(max-width:860px)')
    const apply = () => setStacked(mq.matches)
    apply()
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [])

  /* legacy:3965-3974 — reveal-on-scroll for the .si-ani elements. */
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const els = Array.from(root.querySelectorAll<HTMLElement>('.' + styles['si-ani']))
    const REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (REDUCED || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add(styles['is-in']))
      return
    }
    const io = new IntersectionObserver(
      (entries) => entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add(styles['is-in'])
          io.unobserve(en.target)
        }
      }),
      { threshold: 0.12 },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  const d = dataRef.current
  const terms = d?.terms || []
  const xList = d ? xView(d.posts, xTab) : []
  const rdList = d ? rdView(d, rdSort) : []
  /* Arrivals are shown above the sorted list and are not duplicated inside it. */
  const arrivalIds = new Set(arrivals.map((a) => a._id))
  const xListDeduped = xList.filter((p) => !arrivalIds.has(p._id))

  const showX = !stacked || feed === 'x'
  const showRd = !stacked || feed === 'rd'

  return (
    <section id="si-root" ref={rootRef} aria-label="Social intelligence preview">
      <div className={styles['si-wrap']}>
        <header className={styles['si-head']}>
          <p className={`${styles['si-eyebrow']} ${styles['si-ani']}`}>Social intelligence</p>
          <h2 className={`${styles['si-h2']} ${styles['si-ani']} ${styles['si-d1']}`}>
            See what investors are <em>actually</em> saying.
          </h2>
          <p className={`${styles['si-sub']} ${styles['si-ani']} ${styles['si-d2']}`}>
            Search a ticker or a theme. X and Reddit load side by side, with an AI read of the mood sitting above both.
          </p>
        </header>

        {/* NOT legacy — the search, the read and the two feeds are ONE console.

            Legacy floated three separate cards on the page ground: a 640px search
            box, then the sentiment band, then the grid. Read top to bottom that
            says the search is a thing you do to the page, and the feeds are two
            unrelated widgets that happen to sit under it. They are not: one query
            fans out to both platforms and the band is the AI read OF those two
            feeds. Enclosing the three in a single bordered surface is what makes
            that legible without a word of copy — the query bar is the console's
            chrome, and X and Reddit are two panes inside the same instrument.

            The source marks in the search bar carry the other half of it: they
            name what a single Enter actually queries, so the reader does not have
            to infer it from two columns appearing below. */}
        <div className={`${styles['si-console']} ${styles['si-ani']} ${styles['si-d3']}`}>
        <div className={styles['si-searchrow']}>
          <div className={styles['si-search']}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" />
            </svg>
            <input
              id="siInput" ref={inputRef} className={styles['si-input']} type="text"
              autoComplete="off" spellCheck={false}
              placeholder="Search a ticker or theme" aria-label="Search a ticker or theme"
              onKeyDown={(e) => {
                if (e.key === 'Enter') { e.preventDefault(); run(e.currentTarget.value); e.currentTarget.blur() }
                if (e.key === 'Escape') { e.currentTarget.value = ''; e.currentTarget.blur() }
              }}
            />
            <span className={styles['si-sources']}>
              <span className={styles['si-srclab']}>Searching</span>
              <span className={`${styles['si-src']} ${styles['is-x']}`}>X</span>
              <span className={styles['si-srcplus']}>+</span>
              <span className={`${styles['si-src']} ${styles['is-rd']}`}>Reddit</span>
            </span>
            <kbd className={styles['si-kbd']} aria-hidden="true">⌘K</kbd>
            <button type="button" className={styles['si-go']} id="siGo" onClick={() => run(inputRef.current?.value || '')}>
              Search
            </button>
          </div>
          <div className={styles['si-chips']} id="siChips" role="group" aria-label="Quick searches">
            {CHIPS.map((c) => (
              <button
                key={c.q} type="button" className={styles['si-chip']} data-q={c.q}
                aria-pressed={activeChip === c.q.toLowerCase()}
                onClick={() => run(c.q)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* legacy:3663-3699 — the sentiment band. */}
        {/* The band is gated on `loading`, and that is a correctness fix rather than
            a polish one. dataRef holds the PREVIOUS dataset until the query
            resolves, and legacy left the band ungated: for the 360ms of every
            search the panel kept rendering the old ticker's score, distribution
            and prose under the new ticker's name — a confident, specific,
            entirely wrong read. The feeds were always gated; the band was the
            one thing on screen still asserting a stale number. */}
        <div className={styles['si-band']} id="siBand">
          {d && !loading ? (
            <Band ai={d.ai} display={d.display} expanded={expanded}
                  onToggle={() => setExpanded((v) => !v)} dialRef={dialRef} capRef={capRef} />
          ) : (
            <BandSkeleton display={pending || d?.display || ''} />
          )}
        </div>

        <div className={styles['si-feedtabs']} id="siFeedTabs" role="tablist" aria-label="Choose a feed">
          {(['x', 'rd'] as const).map((f) => (
            <button
              key={f} type="button" className={styles['si-feedtab']} role="tab"
              aria-selected={feed === f} data-feed={f} onClick={() => setFeed(f)}
            >
              {f === 'x' ? 'X' : 'Reddit'}
            </button>
          ))}
        </div>

        <div className={styles['si-grid']}>
          <section
            className={`${styles['si-col']} ${styles['si-col-x']}`} data-feed="x"
            aria-label="X conversation" hidden={!showX} aria-hidden={!showX}
          >
            <div className={styles['si-colhead']}>
              <span className={styles['si-colname']}>X</span>
              <span className={styles['si-live']} style={{ color: 'var(--x-dim)' }}><i />Live</span>
            </div>
            <div className={styles['si-tabs']} role="tablist" aria-label="Sort X posts" id="siXTabs">
              {(['top', 'latest', 'media'] as const).map((t) => (
                <button
                  key={t} type="button" className={styles['si-tab']} role="tab"
                  aria-selected={xTab === t} data-tab={t}
                  onClick={() => { setXTab(t); setArrivals([]); if (xStreamRef.current) xStreamRef.current.scrollTop = 0 }}
                >
                  {t === 'top' ? 'Top' : t === 'latest' ? 'Latest' : 'Media'}
                </button>
              ))}
            </div>
            <div className={styles['si-stream']} id="siX" ref={xStreamRef} tabIndex={0} aria-label="X posts">
              {!mounted ? null : loading ? (
                <Skeletons kind="x" n={5} />
              ) : !xList.length ? (
                <EmptyState
                  title="Nothing with media yet"
                  body="No one in this conversation has attached a chart or image in the last 24 hours. Try Top or Latest."
                />
              ) : (
                <>
                  {arrivals.map((p) => <XPostView key={p._id} p={p} terms={terms} isNew />)}
                  {xListDeduped.map((p) => <XPostView key={p._id} p={p} terms={terms} isNew={false} />)}
                </>
              )}
            </div>
          </section>

          <section
            className={`${styles['si-col']} ${styles['si-col-rd']}`} data-feed="rd"
            aria-label="Reddit conversation" hidden={!showRd} aria-hidden={!showRd}
          >
            <div className={styles['si-colhead']}>
              <span className={styles['si-colname']}>Reddit</span>
              <span className={styles['si-live']} style={{ color: 'var(--rd-dim)' }}><i />Live</span>
            </div>
            <div className={styles['si-tabs']} role="tablist" aria-label="Sort Reddit posts" id="siRdTabs">
              {([['rel', 'Relevance'], ['hot', 'Hot'], ['new', 'New'], ['top', 'Top']] as const).map(([k, label]) => (
                <button
                  key={k} type="button" className={styles['si-tab']} role="tab"
                  aria-selected={rdSort === k} data-sort={k}
                  onClick={() => { setRdSort(k); if (rdStreamRef.current) rdStreamRef.current.scrollTop = 0 }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className={styles['si-stream']} id="siRd" ref={rdStreamRef} tabIndex={0} aria-label="Reddit posts">
              {!mounted ? null : loading ? (
                <Skeletons kind="rd" n={4} />
              ) : !rdList.length ? (
                <EmptyState title="No threads found" body="Nothing matched this sort. Try Relevance." />
              ) : (
                rdList.map((p) => <RdPostView key={p._id} p={p} terms={terms} bump={bump} />)
              )}
            </div>
          </section>
        </div>
        </div>{/* /si-console */}

        <footer className={`${styles['si-foot']} ${styles['si-ani']}`}>
          <p className={styles['si-note']}>
            Preview only.
          </p>
          {/* Sends the reader to the plans at the foot of the page rather than
              off-site: they have just seen what the product does, and the next
              question is what it costs. */}
          <a className={styles['si-cta']} href="#sppricing-root" id="siCta">
            Get access
          </a>
        </footer>
      </div>
    </section>
  )
}

/* The band's pending state. It mirrors Band's three-column structure exactly so
   the console keeps its height through a search — a band that collapses and
   reopens makes every query look like a page change. The label is the one real
   thing in it: naming the ticker being fetched is honest, where naming the last
   one was not. */
function BandSkeleton({ display }: { display: string }) {
  return (
    <>
      <div className={styles['si-dialwrap']}>
        <div className={`${styles['sk-c']} ${styles['si-skdial']}`} />
        <div className={`${styles['sk-c']} ${styles['si-sktag']}`} />
      </div>

      <div className={styles['si-bandmid']}>
        <div className={styles['si-dist']}>
          {['Bullish', 'Neutral', 'Bearish'].map((label) => (
            <div className={styles['si-drow']} key={label}>
              <span className={styles['si-dlab']}>
                <i className={styles['si-ddot']} style={{ background: 'currentColor', opacity: 0.25 }} aria-hidden="true" />
                {label}
              </span>
              <span className={`${styles['sk-c']} ${styles['si-skbar']}`} />
              <span className={`${styles['sk-c']} ${styles['si-skval']}`} />
            </div>
          ))}
        </div>
        <div className={styles['si-meta']}><span>Reading the last 24h</span></div>
      </div>

      <div className={styles['si-bandright']}>
        <p className={styles['si-readlab']}>{display ? `The read on ${display}` : 'The read'}</p>
        <div className={`${styles['sk-c']} ${styles['si-skline']}`} />
        <div className={`${styles['sk-c']} ${styles['si-skline']} ${styles['is-short']}`} />
      </div>
    </>
  )
}

/* legacy:3663-3699 — extracted so the dial ref stays close to the arc. */
function Band({
  ai, display, expanded, onToggle, dialRef, capRef,
}: {
  ai: Ai; display: string; expanded: boolean; onToggle: () => void
  dialRef: React.RefObject<SVGPathElement | null>
  capRef: React.RefObject<SVGGElement | null>
}) {
  const c = sentimentColor(ai.score)
  /* Fill colour and ink colour are separate on purpose: the fill is the brand
     value at full strength, the ink is the darkened pair that clears contrast on
     the card. Using the fill for text would put #C79127 on cream. */
  const rows: [string, number, string, string][] = [
    ['Bullish', ai.dist.bull, 'var(--s-bull)', 'var(--s-bull-ink)'],
    ['Neutral', ai.dist.neu, 'var(--s-neu)', 'var(--s-neu-ink)'],
    ['Bearish', ai.dist.bear, 'var(--s-bear)', 'var(--s-bear-ink)'],
  ]
  return (
    <>
      <div className={styles['si-dialwrap']}>
        <svg className={styles['si-dial']} viewBox="0 0 168 100" role="img"
             aria-label={`Sentiment ${ai.score} out of 100, ${ai.label} for ${display}`}>
          {DIAL_TICKS.map((k) => (
            <line key={k.t} className={styles['si-tick']} x1={k.x1} y1={k.y1} x2={k.x2} y2={k.y2}
                  strokeLinecap="round" />
          ))}
          <path className={styles['si-track']} d="M 20 88 A 64 64 0 0 1 148 88" fill="none" strokeWidth="12" strokeLinecap="round" />
          <path ref={dialRef} className={styles['si-fill']} d="M 20 88 A 64 64 0 0 1 148 88" fill="none"
                strokeWidth="12" strokeLinecap="round" strokeDasharray={ARC_LEN} strokeDashoffset={ARC_LEN} />
          {/* The cap. Two circles rather than one: the halo is the card ground, so
              the dot reads as a bead sitting ON the arc instead of a blob fused
              into it. Both start at the arc's left end and are rotated into place
              by the effect. */}
          <g ref={capRef} className={styles['si-cap']}>
            <circle className={styles['si-caphalo']} cx="20" cy="88" r="8" />
            <circle className={styles['si-capdot']} cx="20" cy="88" r="4.4" />
          </g>
          <text className={styles['si-dialnum']} x="84" y="70" textAnchor="middle">{ai.score}</text>
          <text className={styles['si-diallab']} x="84" y="88" textAnchor="middle">/ 100</text>
        </svg>
        <span className={styles['si-dialtag']} style={{ color: c.ink }}>{ai.label}</span>
      </div>

      <div className={styles['si-bandmid']}>
        <div className={styles['si-dist']}>
          {rows.map(([label, val, color, ink]) => (
            <div className={styles['si-drow']} key={label}>
              <span className={styles['si-dlab']}>
                <i className={styles['si-ddot']} style={{ background: color }} aria-hidden="true" />
                {label}
              </span>
              <span className={styles['si-dbar']}>
                <i style={{ background: color, width: val + '%' }} />
              </span>
              <span className={styles['si-dval']} style={{ color: ink }}>{val}<span className={styles['si-dpct']}>%</span></span>
            </div>
          ))}
        </div>
        <div className={styles['si-meta']}>
          <span>{fmtNum(ai.postCount)} posts scanned</span>
          <span>Confidence: {ai.confidence}</span>
          <span>Last 24h</span>
        </div>
      </div>

      <div className={styles['si-bandright']}>
        <p className={styles['si-readlab']}>The read on {display}</p>
        <p className={expanded ? styles['si-interp'] : `${styles['si-interp']} ${styles['is-clamped']}`} id="siInterp">
          {ai.interp}
        </p>
        {expanded ? <p className={styles['si-synth']}>{ai.synth}</p> : null}
        <button type="button" className={styles['si-more']} id="siMore"
                aria-expanded={expanded} aria-controls="siInterp" onClick={onToggle}>
          {expanded ? 'Show less' : 'Read the full analysis'}
          <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
            <path d="M2 4.5L6 8.5L10 4.5" />
          </svg>
        </button>
      </div>
    </>
  )
}
