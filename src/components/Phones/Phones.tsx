'use client'

/* ============================================================================
   Block 06 — the five phone screens.  legacy/index.html 1685-2771.
   Root is #spphones-root, a wrapper this port introduces: the legacy block had
   no root element of its own (it styled :root and <body> directly), and
   globals.css already names #spphones-root as where those tokens now live.

   Ids kept literal because the script finds them by id: stage, s1-s5, typed,
   ph, nvda, posts, prog, progVal, btc, eth, thread, askPh, askTyped, askRest.

   The one structural change: legacy builds the AI thread with innerHTML from
   template strings (legacy:2651-2700). docs/OWNERSHIP.md forbids
   dangerouslySetInnerHTML, so CHAT is modelled as data and rendered as React
   nodes. The emitted DOM — class names, nesting, order — is unchanged. Every
   other script-driven element is still written through a ref exactly as legacy
   writes it, which also keeps the server output byte-identical to legacy's
   pre-script HTML.
   ========================================================================= */

import { useEffect, useRef, useState, type ReactNode } from 'react'
import styles from './Phones.module.css'

/* legacy:2661-2699 — the four scripted turns. `dot` is the marker class on each
   evidence row: r = red, g = green, gd = gold. */
type Dot = 'r' | 'g' | 'gd'
type Piece =
  | { kind: 'ev'; dot: Dot; text: ReactNode; src: string }
  | { kind: 'watch'; label: string; text: string }
  | { kind: 'cmp'; head?: true; l: string; a: string; b: string }
type Turn = { q: string; cap: string; lead: ReactNode; pieces: Piece[]; src?: ReactNode }

const CHAT: Turn[] = [
  {
    q: 'Why is NVDA down 4% today?',
    cap: '1.8s',
    lead: (
      <>
        Three things moved together before the open — <b>none of them was a price target cut.</b>
      </>
    ),
    pieces: [
      { kind: 'ev', dot: 'r', text: '10-Q shows inventory up 22% QoQ while revenue grew 9%.', src: 'SEC filing · 2h ago' },
      { kind: 'ev', dot: 'gd', text: 'Two directors sold into strength Friday, disclosed this morning.', src: 'Form 4 · 3 filings' },
      { kind: 'ev', dot: 'r', text: 'Community sentiment fell from 74% to 51% bullish in six hours.', src: 'X + Reddit · 1,284 posts' },
    ],
    src: (
      <>
        Synthesized from <b>1,284</b> sources · <b>12</b> filings
      </>
    ),
  },
  {
    q: 'Is the inventory build actually a problem?',
    cap: '2.1s',
    lead: <>Not yet — but the next print decides it.</>,
    pieces: [
      { kind: 'ev', dot: 'g', text: 'Gross margin held at 71.4%, so they are not discounting to move units.', src: 'Q3 10-Q' },
      { kind: 'ev', dot: 'gd', text: 'Days inventory rose 18 to 94 — high for them, normal for the sector.', src: 'Computed · 8 quarters' },
      {
        kind: 'watch',
        label: 'What to watch',
        text: 'If margin slips below 68% next quarter, the build is oversupply rather than pre-launch.',
      },
    ],
  },
  {
    q: 'Who sold before the filing?',
    cap: '1.4s',
    lead: <>Two insiders, both three days ahead of the disclosure.</>,
    pieces: [
      { kind: 'ev', dot: 'r', text: 'Director — $410K sold at $191.20, filed 3 days later.', src: 'Form 4 · Aug 12' },
      { kind: 'ev', dot: 'r', text: 'VP Operations — $186K sold at $189.75.', src: 'Form 4 · Aug 12' },
      { kind: 'ev', dot: 'g', text: 'No Rule 10b5-1 plan attached to either sale.', src: 'Filing detail' },
    ],
    src: (
      <>
        Cross-checked against <b>41</b> prior filings
      </>
    ),
  },
  {
    q: 'Compare NVDA and AMD margins',
    cap: '1.9s',
    lead: <>NVDA leads on both, but the gap narrowed this quarter.</>,
    pieces: [
      { kind: 'cmp', head: true, l: 'Metric', a: 'NVDA', b: 'AMD' },
      { kind: 'cmp', l: 'Gross margin', a: '71.4%', b: '53.6%' },
      { kind: 'cmp', l: 'Operating margin', a: '58.1%', b: '24.9%' },
      { kind: 'cmp', l: 'R&D as % revenue', a: '11.2%', b: '19.8%' },
    ],
    src: <>Latest filed quarter · both companies</>,
  },
]

/* legacy:2655-2657 — head(), ev(), src() as components. */
function AiHead({ cap }: { cap: string }) {
  return (
    <div className={styles['ai-top']}>
      <span className={styles['ai-mark']}>
        <svg viewBox="0 0 24 24">
          <path d="M12 2l2.2 6.3L20.5 10l-5.4 3.4L16.4 20 12 16.4 7.6 20l1.3-6.6L3.5 10l6.3-1.7L12 2Z" />
        </svg>
      </span>
      <b>Signal Pro AI</b>
      <span className={styles.cap}>{cap}</span>
    </div>
  )
}

function AiCard({ turn }: { turn: Turn }) {
  return (
    <div className={styles['ai-card']}>
      <AiHead cap={turn.cap} />
      <p className={styles['ai-lead']}>{turn.lead}</p>
      {turn.pieces.map((p, i) => {
        if (p.kind === 'ev') {
          return (
            /* legacy inlines opacity:1;transform:none so the row is visible the
               moment it is appended — the .ev enter animation is skipped. */
            <div className={styles.ev} key={i} style={{ opacity: 1, transform: 'none' }}>
              <i className={styles[p.dot]} />
              <div className={styles.t}>
                <p>{p.text}</p>
                <span>{p.src}</span>
              </div>
            </div>
          )
        }
        if (p.kind === 'watch') {
          return (
            <div className={styles['ai-watch']} key={i}>
              <span>{p.label}</span>
              <p>{p.text}</p>
            </div>
          )
        }
        return (
          <div className={p.head ? `${styles.cmp} ${styles.hd}` : styles.cmp} key={i}>
            <span className={styles.l}>{p.l}</span>
            <span className={styles.a}>{p.a}</span>
            <span className={styles.b}>{p.b}</span>
          </div>
        )
      })}
      {turn.src ? (
        <div className={styles['ai-src']}>
          <span>{turn.src}</span>
        </div>
      ) : null}
    </div>
  )
}

type Item = { id: number; kind: 'q'; text: string } | { id: number; kind: 'typing' } | { id: number; kind: 'card'; turn: number }

export default function Phones() {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const stageRef = useRef<HTMLDivElement | null>(null)
  const threadRef = useRef<HTMLDivElement | null>(null)
  const [items, setItems] = useState<Item[]>([])

  /* ---- legacy:2531-2645 — the infinite carousel ------------------------- */
  useEffect(() => {
    const stage = stageRef.current
    const shell = stage?.parentElement
    if (!stage || !shell) return

    const SPEED = 1.5 /* px per frame, about 90px a second */
    const originals = Array.from(stage.children) as HTMLElement[]
    let setW = 0
    let x = 0
    let paused = false
    let raf: number | null = null
    let dragging = false
    let startX = 0
    let startPos = 0
    let moved = false

    const RMQ = matchMedia('(prefers-reduced-motion: reduce)').matches

    const screenScale = () =>
      innerWidth > 900 ? 0.75 : Math.min(1, (innerWidth - 56) / 390) * 0.75

    function applyScale() {
      const s = screenScale()
      stage!.querySelectorAll<HTMLElement>('.' + styles.screen).forEach((el) => {
        /* `zoom` (not transform) is legacy: it rescales layout so the slot
           widths the carousel measures shrink with it. */
        el.style.zoom = s === 1 ? '' : String(s)
      })
    }

    function measure() {
      const gap = parseFloat(getComputedStyle(stage!).gap) || 0
      let w = 0
      originals.forEach((el) => {
        w += el.getBoundingClientRect().width + gap
      })
      return w
    }

    function build() {
      stage!.querySelectorAll('[data-clone]').forEach((c) => c.remove())
      applyScale()
      setW = measure()
      if (!setW) return

      const need = Math.ceil((shell!.clientWidth * 2 + setW) / setW)
      for (let i = 1; i < Math.max(2, need); i++) {
        originals.forEach((el) => {
          const c = el.cloneNode(true) as HTMLElement
          c.setAttribute('data-clone', '1')
          c.setAttribute('aria-hidden', 'true')
          /* Duplicated ids would break every getElementById below. */
          c.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'))
          stage!.appendChild(c)
        })
      }
      applyScale()
    }

    function tick() {
      if (!paused && !dragging) x += SPEED
      if (setW > 0) {
        while (x >= setW) x -= setW
        while (x < 0) x += setW
      }
      stage!.style.transform = 'translate3d(' + -x + 'px,0,0)'
      raf = requestAnimationFrame(tick)
    }

    const onEnter = () => {
      paused = true
    }
    const onLeave = () => {
      paused = false
    }

    function down(e: MouseEvent | TouchEvent) {
      dragging = true
      moved = false
      startX = 'touches' in e ? e.touches[0].clientX : e.clientX
      startPos = x
      shell!.classList.add(styles.dragging)
    }
    function move(e: MouseEvent | TouchEvent) {
      if (!dragging) return
      const cx = 'touches' in e ? e.touches[0].clientX : e.clientX
      const dx = cx - startX
      if (Math.abs(dx) > 3) moved = true
      x = startPos - dx
      if (e.cancelable && 'touches' in e) e.preventDefault()
    }
    function up() {
      dragging = false
      shell!.classList.remove(styles.dragging)
    }
    /* Capture phase: swallows the click that ends a drag so a drag never
       navigates. legacy:2617 */
    const onClickCapture = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault()
        e.stopPropagation()
      }
    }

    shell.addEventListener('mouseenter', onEnter)
    shell.addEventListener('mouseleave', onLeave)
    shell.addEventListener('mousedown', down)
    addEventListener('mousemove', move)
    addEventListener('mouseup', up)
    shell.addEventListener('touchstart', down, { passive: true })
    shell.addEventListener('touchmove', move, { passive: false })
    addEventListener('touchend', up)
    shell.addEventListener('click', onClickCapture, true)

    let rt: number | undefined
    const onResize = () => {
      clearTimeout(rt)
      rt = window.setTimeout(() => {
        x = 0
        build()
      }, 150)
    }
    addEventListener('resize', onResize)

    build()
    /* Three rebuilds: fonts change slot widths, and HighLevel used to inject
       late. Kept — they are what makes the loop seamless. legacy:2626-2628 */
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => build())
    const t400 = window.setTimeout(build, 400)
    const t1400 = window.setTimeout(build, 1400)

    const onVis = () => {
      if (document.hidden) {
        if (raf) {
          cancelAnimationFrame(raf)
          raf = null
        }
      } else if (!raf) {
        raf = requestAnimationFrame(tick)
      }
    }

    if (RMQ) {
      shell.style.overflowX = 'auto'
      stage.style.transform = ''
    } else {
      raf = requestAnimationFrame(tick)
      document.addEventListener('visibilitychange', onVis)
    }

    return () => {
      if (raf) cancelAnimationFrame(raf)
      clearTimeout(rt)
      clearTimeout(t400)
      clearTimeout(t1400)
      shell.removeEventListener('mouseenter', onEnter)
      shell.removeEventListener('mouseleave', onLeave)
      shell.removeEventListener('mousedown', down)
      removeEventListener('mousemove', move)
      removeEventListener('mouseup', up)
      shell.removeEventListener('touchstart', down)
      shell.removeEventListener('touchmove', move)
      removeEventListener('touchend', up)
      shell.removeEventListener('click', onClickCapture, true)
      removeEventListener('resize', onResize)
      document.removeEventListener('visibilitychange', onVis)
      /* Hand the DOM back to React exactly as React left it. */
      stage.querySelectorAll('[data-clone]').forEach((c) => c.remove())
      stage.style.transform = ''
    }
  }, [])

  /* ---- legacy:2647-2649, 2702-2712, 2762-2770 — screens 01, 03, 04 ------- */
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches
    const timers: number[] = []
    const rafs: number[] = []

    const byId = <T extends HTMLElement>(id: string) => root.querySelector<T>('#' + id)

    /* legacy:2647-2653 — countUp */
    function countUp(el: HTMLElement, to: number, fmt: (v: number) => string, dur: number) {
      if (RM) {
        el.textContent = fmt(to)
        return
      }
      const t0 = performance.now()
      const step = (now: number) => {
        const p = Math.min(1, (now - t0) / dur)
        const e = 1 - Math.pow(1 - p, 3)
        el.textContent = fmt(to * e)
        if (p < 1) rafs.push(requestAnimationFrame(step))
      }
      rafs.push(requestAnimationFrame(step))
    }

    /* 01 — the ticker search types itself. legacy:2703-2712 */
    const typedEl = byId('typed')
    const phEl = byId('ph')
    if (typedEl && phEl) {
      const word = 'NVDA'
      if (RM) {
        typedEl.textContent = word
        phEl.style.display = 'none'
      } else {
        let i = 0
        const id = window.setInterval(() => {
          typedEl.textContent = word.slice(0, ++i)
          if (i === 1) phEl.style.display = 'none'
          if (i >= word.length) clearInterval(id)
        }, 130)
        timers.push(id)
      }
    }

    /* legacy:2714 — staggered reveal of screen 01's post cards. */
    root.querySelectorAll<HTMLElement>('#s1 .' + styles.pm).forEach((m, i) => {
      timers.push(window.setTimeout(() => m.classList.add(styles.show), 450 + i * 280))
    })

    /* legacy:2715-2719 — NVDA price + post count jitter. */
    const nvda = byId('nvda')
    const posts = byId('posts')
    if (!RM && nvda && posts) {
      timers.push(
        window.setInterval(() => {
          nvda.textContent = '$' + (184.32 + (Math.random() * 0.4 - 0.2)).toFixed(2)
          posts.textContent = (1284 + Math.floor(Math.random() * 9)).toLocaleString()
        }, 3400),
      )
    }

    /* 03 — course progress. legacy:2762-2764 */
    const prog = byId('prog')
    const progVal = byId('progVal')
    if (prog) timers.push(window.setTimeout(() => (prog.style.width = '68%'), 400))
    if (progVal) countUp(progVal, 68, (v) => Math.round(v) + '%', 1700)

    /* 04 — crypto jitter. legacy:2767-2770 */
    const btc = byId('btc')
    const eth = byId('eth')
    if (!RM && btc && eth) {
      timers.push(
        window.setInterval(() => {
          btc.textContent = '$' + (118420 + Math.round(Math.random() * 240 - 120)).toLocaleString()
          eth.textContent = '$' + (4186 + Math.round(Math.random() * 12 - 6)).toLocaleString()
        }, 2800),
      )
    }

    return () => {
      timers.forEach(clearTimeout)
      timers.forEach(clearInterval)
      rafs.forEach(cancelAnimationFrame)
    }
  }, [])

  /* ---- legacy:2721-2760 — screen 05, the looping AI conversation --------- */
  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    const typedEl = root.querySelector<HTMLElement>('#askTyped')
    const restEl = root.querySelector<HTMLElement>('#askRest')
    const RM = matchMedia('(prefers-reduced-motion: reduce)').matches

    if (RM) {
      /* legacy:2752-2757 — no animation: every turn is present at once. */
      const all: Item[] = []
      CHAT.forEach((t, i) => {
        all.push({ id: i * 2, kind: 'q', text: t.q }, { id: i * 2 + 1, kind: 'card', turn: i })
      })
      setItems(all)
      return
    }

    let cancelled = false
    let seq = 0
    const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

    async function typeQ(q: string) {
      if (!typedEl || !restEl) return
      restEl.style.display = 'none'
      for (let i = 1; i <= q.length; i++) {
        if (cancelled) return
        typedEl.textContent = q.slice(0, i)
        await wait(26)
      }
      await wait(380)
      if (cancelled) return
      typedEl.textContent = ''
      restEl.style.display = ''
    }

    async function run() {
      while (!cancelled) {
        setItems([])
        for (let i = 0; i < CHAT.length; i++) {
          if (cancelled) return
          const turn = CHAT[i]
          await typeQ(turn.q)
          if (cancelled) return
          setItems((p) => [...p, { id: seq++, kind: 'q', text: turn.q }])
          await wait(500)
          if (cancelled) return
          const typingId = seq++
          setItems((p) => [...p, { id: typingId, kind: 'typing' }])
          await wait(1150)
          if (cancelled) return
          setItems((p) => p.filter((it) => it.id !== typingId).concat({ id: seq++, kind: 'card', turn: i }))
          await wait(3600)
        }
        await wait(2200)
      }
    }
    run()

    return () => {
      cancelled = true
    }
  }, [])

  /* legacy:2735 — every append scrolls the thread to the bottom. */
  useEffect(() => {
    const t = threadRef.current
    if (t) t.scrollTo({ top: t.scrollHeight, behavior: 'smooth' })
  }, [items])

  return (
    <div id="spphones-root" ref={rootRef}>

      <div className={styles.page}>
      <div className={styles['stage-shell']}>
      <div className={styles.stage} id="stage" ref={stageRef}>

        {/* ============ 01 COMMUNITY ============ */}
        <div className={styles.slot}>
          <div className={styles.screen} id="s1">
            <div className={`${styles.bar} ${styles.mono}`}><span>Signal Pro</span><span className={styles.live}><i></i>Monitoring 41,208 posts</span></div>

            <p className={`${styles.eyeb} ${styles.mono}`}>Community intelligence</p>
            <h2 className={`${styles.title} ${styles.serif}`}>What investors<br />are saying</h2>

            <div className={styles.search}>
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>
              <span className={styles.q}><span id="typed"></span><span className={styles.caret}></span><span className={styles.ph} id="ph">Search a ticker or company</span></span>
              <span className={styles.kbd}>⌘K</span>
            </div>
            <div className={styles.recent}>
              <span className={styles.on}>NVDA</span><span>TSLA</span><span>AMD</span><span>PLTR</span><span>AAPL</span>
            </div>

            <div className={styles.ticker}>
              <div className={styles.co}>NVIDIA <span>· NVDA</span></div>
              <div className={styles.px}><b className={styles.num} id="nvda">$184.32</b><em className={styles.num}>+2.41%</em></div>
            </div>

            <div className={styles.pcount}>
              <span className={styles.n}>Analyzing <b className={styles.num} id="posts">1,284</b> posts · 24h</span>
              <span className={`${styles.badge} ${styles['b-gold']} ${styles.sm}`}><i></i>Live feed</span>
            </div>

            <div className={styles.xcard}>
              <div className={styles.xhead}>
                <div className={styles.avatar} style={{ background: "linear-gradient(145deg,#4A5F52,#2E5C43)" }}>D</div>
                <div className={styles.xwho}>
                  <div className={styles.xline}>
                    <b>Daniel Okafor</b>
                    <svg className={styles.vf} viewBox="0 0 22 22" aria-label="Verified"><path fill="#1D9BF0" d="M20.4 11c0-1-.5-2-1.4-2.5.2-1-.1-2.1-.9-2.9-.8-.8-1.9-1.1-2.9-.9C14.7 3.8 13.7 3.3 12.6 3.3c-.6 0-1.1.2-1.6.4-.5-.2-1-.4-1.6-.4-1.1 0-2.1.5-2.6 1.4-1-.2-2.1.1-2.9.9-.8.8-1.1 1.9-.9 2.9-.9.5-1.4 1.5-1.4 2.5s.5 2 1.4 2.5c-.2 1 .1 2.1.9 2.9.8.8 1.9 1.1 2.9.9.5.9 1.5 1.4 2.6 1.4.6 0 1.1-.2 1.6-.4.5.2 1 .4 1.6.4 1.1 0 2.1-.5 2.6-1.4 1 .2 2.1-.1 2.9-.9.8-.8 1.1-1.9.9-2.9.9-.5 1.4-1.5 1.4-2.5Z" /><path fill="#fff" d="m10.1 14.4-2.9-2.9 1.3-1.3 1.6 1.6 4-4 1.3 1.3-5.3 5.3Z" /></svg>
                    <span className={styles.h}>@okaforcapital</span>
                  </div>
                </div>
                <svg className={styles.xlogo} viewBox="0 0 24 24" aria-label="X"><path d="M18.9 2H22l-7 8 8.2 12h-6.4l-5-7.3L5.9 22H2.8l7.5-8.6L2.4 2h6.6l4.5 6.7L18.9 2Zm-1.1 18h1.7L7.3 3.8H5.5L17.8 20Z" /></svg>
              </div>
              <p className={styles.xtext}>NVDA's data-center demand continues to surprise. The next earnings report could be much bigger than the market expects.</p>
              <div className={styles.xcount}>9:42 AM · <b className={styles.num}>218.4K</b> Views</div>
              <div className={styles.xacts}>
                <span><svg viewBox="0 0 24 24"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-3.9-.9L3 20.5l1.6-4.4A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4Z" /></svg>184</span>
                <span><svg viewBox="0 0 24 24"><path d="M17 2.5l4 4-4 4" /><path d="M3 11.5v-2a3 3 0 0 1 3-3h15" /><path d="M7 21.5l-4-4 4-4" /><path d="M21 12.5v2a3 3 0 0 1-3 3H3" /></svg>912</span>
                <span className={styles.like}><svg viewBox="0 0 24 24"><path d="M12 21S3.5 15.4 3.5 9.6A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8.5 2.6C20.5 15.4 12 21 12 21Z" /></svg>4,102</span>
                <span><svg viewBox="0 0 24 24"><path d="M4 20V10M9.3 20V4M14.7 20v-7M20 20V7" /></svg>218K</span>
              </div>
            </div>

            <div className={styles.pm}>
              <div className={styles['pm-h']}>
                <div className={`${styles['pm-av']} ${styles.rd}`}>r/</div>
                <div className={styles['pm-n']}><b>r/stocks</b><span>Posted 4h ago</span></div>
              </div>
              <p>"Anyone else watching NVDA's capex numbers? Hyperscaler spend guidance keeps getting revised up."</p>
              <div className={styles['pm-f']}>
                <span><svg viewBox="0 0 24 24"><path d="M12 4l8 8h-5v8H9v-8H4l8-8Z" /></svg>4.2K</span>
                <span><svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12Z" /></svg>328</span>
                <span className={`${styles.badge} ${styles['b-green']} ${styles.sm}`}><i></i>Bullish</span>
              </div>
            </div>

            <div className={styles.pm}>
              <div className={styles['pm-h']}>
                <div className={styles['pm-av']} style={{ background: "linear-gradient(145deg,#8A6A6E,#8A2A38)" }}>P</div>
                <div className={styles['pm-n']}><b>Priya Raman</b><span>@priyatrades · 8:15 AM</span></div>
                <svg className={styles['pm-x']} viewBox="0 0 24 24" aria-label="X"><path d="M18.9 2H22l-7 8 8.2 12h-6.4l-5-7.3L5.9 22H2.8l7.5-8.6L2.4 2h6.6l4.5 6.7L18.9 2Zm-1.1 18h1.7L7.3 3.8H5.5L17.8 20Z" /></svg>
              </div>
              <p>Inventory building faster than revenue two quarters running. Nobody wants to talk about pricing.</p>
              <div className={styles['pm-f']}>
                <span><svg viewBox="0 0 24 24"><path d="M21 11.5a8.4 8.4 0 0 1-9 8.4 8.9 8.9 0 0 1-3.9-.9L3 20.5l1.6-4.4A8.4 8.4 0 0 1 12 3.1a8.4 8.4 0 0 1 9 8.4Z" /></svg>421</span>
                <span><svg viewBox="0 0 24 24"><path d="M17 2.5l4 4-4 4" /><path d="M3 11.5v-2a3 3 0 0 1 3-3h15" /><path d="M7 21.5l-4-4 4-4" /><path d="M21 12.5v2a3 3 0 0 1-3 3H3" /></svg>308</span>
                <span><svg viewBox="0 0 24 24"><path d="M12 21S3.5 15.4 3.5 9.6A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8.5 2.6C20.5 15.4 12 21 12 21Z" /></svg>1,847</span>
                <span className={`${styles.badge} ${styles['b-burg']} ${styles.sm}`}><i></i>Bearish</span>
              </div>
            </div>

            <div className={styles.pm}>
              <div className={styles['pm-h']}>
                <div className={`${styles['pm-av']} ${styles.rd}`}>r/</div>
                <div className={styles['pm-n']}><b>r/wallstreetbets</b><span>Posted 2h ago</span></div>
              </div>
              <p>"Margins are the whole thesis and nobody is charting them. 70%+ four quarters straight."</p>
              <div className={styles['pm-f']}>
                <span><svg viewBox="0 0 24 24"><path d="M12 4l8 8h-5v8H9v-8H4l8-8Z" /></svg>11.4K</span>
                <span><svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L3 21l1.9-6.4A8 8 0 1 1 21 12Z" /></svg>1.1K</span>
                <span className={`${styles.badge} ${styles['b-gold']} ${styles.sm}`}><i></i>Mixed</span>
              </div>
            </div>

            <div className={styles.spacer}></div>
            <div className={`${styles.demo} ${styles.mono}`}>Simulated demo data</div>
          </div>
          <div className={styles['slot-tag']}><b>01</b> &nbsp;Community</div>
        </div>

        {/* ============ 02 SMART MONEY ============ */}
        <div className={styles.slot}>
          <div className={styles.screen} id="s2">
            <div className={`${styles.bar} ${styles.mono}`}><span>Signal Pro</span><span className={styles.live}><i></i>Form 4 · 13F feed</span></div>

            <p className={`${styles.eyeb} ${styles.mono}`}>Congressional trading</p>
            <h2 className={`${styles.title} ${styles.serif}`}>See the trades<br />Washington files</h2>
            <p className={styles.subt}>Ranked by disclosed net profit · STOCK Act filings</p>

            <div className={`${styles.lb} ${styles.top1}`}>
              <span className={styles.rank}>#1</span>
              <div className={styles['lb-h']}>
                <div className={styles['lb-av']} style={{ background: "linear-gradient(145deg,#7E7059,#5B5040)" }}>DT<img src="/img/congress/donald-j-trump.jpg" alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} /></div>
                <div className={styles['lb-n']}><b>Donald J. Trump</b><div className={styles['lb-badges']}><span className={`${styles.badge} ${styles['b-burg']} ${styles.sm}`}><i></i>R POTUS</span></div></div>
              </div>
              <div className={styles['lb-mid']}>
                <div>
                  <span className={styles['lb-lab']}>Net profit</span>
                  <div className={`${styles['lb-val']} ${styles.num}`}>+$31.5M</div>
                  <div className={styles['lb-ret']}><i></i><span className={styles.num}>+17.2%</span></div>
                </div>
                <svg className={styles.spark} viewBox="0 0 106 44" aria-hidden="true">
                  <path className={styles.ln} d="M3 36 L12 30 L21 32 L30 20 L39 24 L48 12 L57 26 L66 14 L75 18 L84 8 L93 16 L103 5" stroke="#2E5C43" />
                </svg>
              </div>
              <div className={styles['lb-foot']}>
                <div><span className={styles.k}>Gross flow</span><span className={`${styles.v} ${styles.num}`}>$505.7M</span></div>
                <div><span className={styles.k}>Trades</span><span className={`${styles.v} ${styles.num}`}>3,642</span></div>
                <span className={styles['lb-tick']}><span className={styles.kk}>TOP</span><span className={styles.tk}>MSFT</span></span>
              </div>
            </div>
            <div className={styles.lb}>
              <span className={styles.rank}>#2</span>
              <div className={styles['lb-h']}>
                <div className={styles['lb-av']} style={{ background: "linear-gradient(145deg,#7E7059,#5B5040)" }}>GC<img src="/img/congress/gilbert-ray-cisneros-jr.jpg" alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} /></div>
                <div className={styles['lb-n']}><b>Gilbert Ray Cisneros Jr.</b><div className={styles['lb-badges']}><span className={`${styles.badge} ${styles['b-slate']} ${styles.sm}`}><i></i>D HOUSE</span><span className={`${styles.badge} ${styles['b-gold']} ${styles.sm}`}><i></i>37 conflicts</span></div></div>
              </div>
              <div className={styles['lb-mid']}>
                <div>
                  <span className={styles['lb-lab']}>Net profit</span>
                  <div className={`${styles['lb-val']} ${styles.num}`}>+$478.5K</div>
                  <div className={styles['lb-ret']}><i></i><span className={styles.num}>+13.4%</span></div>
                </div>
                <svg className={styles.spark} viewBox="0 0 106 44" aria-hidden="true">
                  <path className={styles.ln} d="M3 38 L16 36 L28 33 L40 34 L52 30 L64 31 L74 27 L82 10 L92 12 L103 8" stroke="#2E5C43" />
                </svg>
              </div>
              <div className={styles['lb-foot']}>
                <div><span className={styles.k}>Gross flow</span><span className={`${styles.v} ${styles.num}`}>$11.7M</span></div>
                <div><span className={styles.k}>Trades</span><span className={`${styles.v} ${styles.num}`}>617</span></div>
                <span className={styles['lb-tick']}><span className={styles.kk}>TOP</span><span className={styles.tk}>RHP</span></span>
              </div>
            </div>
            <div className={styles.lb}>
              <span className={styles.rank}>#3</span>
              <div className={styles['lb-h']}>
                <div className={styles['lb-av']} style={{ background: "linear-gradient(145deg,#7E7059,#5B5040)" }}>CF<img src="/img/congress/cleo-fields.jpg" alt="" onError={(e) => { e.currentTarget.style.display = 'none' }} /></div>
                <div className={styles['lb-n']}><b>Cleo Fields</b><div className={styles['lb-badges']}><span className={`${styles.badge} ${styles['b-slate']} ${styles.sm}`}><i></i>D HOUSE</span><span className={`${styles.badge} ${styles['b-gold']} ${styles.sm}`}><i></i>23 conflicts</span></div></div>
              </div>
              <div className={styles['lb-mid']}>
                <div>
                  <span className={styles['lb-lab']}>Net profit</span>
                  <div className={`${styles['lb-val']} ${styles.num}`}>+$318.7K</div>
                  <div className={styles['lb-ret']}><i></i><span className={styles.num}>+27.5%</span></div>
                </div>
                <svg className={styles.spark} viewBox="0 0 106 44" aria-hidden="true">
                  <path className={styles.ln} d="M3 36 L16 35 L28 36 L40 34 L52 33 L62 32 L70 12 L82 11 L92 12 L103 11" stroke="#2E5C43" />
                </svg>
              </div>
              <div className={styles['lb-foot']}>
                <div><span className={styles.k}>Gross flow</span><span className={`${styles.v} ${styles.num}`}>$1.2M</span></div>
                <div><span className={styles.k}>Trades</span><span className={`${styles.v} ${styles.num}`}>25</span></div>
                <span className={styles['lb-tick']}><span className={styles.kk}>TOP</span><span className={styles.tk}>META</span></span>
              </div>
            </div>
            <div className={styles.locked}>
              <span className={styles.stack}><i></i><i></i><i></i></span>
              <span className={styles.txt}>
                <b>Tim Moore · Jonathan L. Jackson · Maria Elvira Salazar</b>
                <span>#4–#8 · 5 more ranked</span>
              </span>
              <span className={styles.lk}><svg viewBox="0 0 24 24"><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>Unlock</span>
            </div>

            <div className={styles.spacer}></div>
            <div className={`${styles.demo} ${styles.mono}`}>Public STOCK Act disclosures · figures for demonstration</div>
          </div>
          <div className={styles['slot-tag']}><b>02</b> &nbsp;Smart money</div>
        </div>

        {/* ============ 03 LEARN ============ */}
        <div className={styles.slot}>
          <div className={styles.screen} id="s3">
            <div className={`${styles.bar} ${styles.mono}`}><span>Signal Pro</span><span className={styles.live}><i></i>Lesson 9 of 12</span></div>

            <p className={`${styles.eyeb} ${styles.mono}`}>Investing education</p>
            <h2 className={`${styles.title} ${styles.serif}`}>Learn to think<br />like an investor</h2>
            <p className={styles.subt}>Your course · resumes where you left off</p>

            <div className={styles.course}>
              <span className={styles.cap}>Featured course</span>
              <h3>Mastering financial statements</h3>
              <div className={styles.meta}>12 lessons · Intermediate</div>
              <div className={styles.meter}><i className={styles.gold} id="prog"></i></div>
              <div className={styles.pmeta}><span>9 of 12 complete</span><span className={styles.num} id="progVal">68%</span></div>
            </div>

            <div className={styles.card} style={{ marginTop: "12px" }}>
              <span className={styles.cap}>What you'll understand</span>
              <div className={styles.rule}></div>
              <div className={styles.concept}><span className={`${styles.ctag} ${styles.serif}`}>P/E</span><p>What does valuation actually tell you?</p></div>
              <div className={styles.concept}><span className={`${styles.ctag} ${styles.serif}`}>ROIC</span><p>Is the company creating value with its capital?</p></div>
              <div className={styles.concept}><span className={`${styles.ctag} ${styles.serif} ${styles.sm}`}>FCF</span><p>How much cash is the business really generating?</p></div>
            </div>

            <div className={styles.spacer}></div>

            <a className={styles.btn} href="https://nadia-sv.com/app" target="_blank" rel="noopener">Continue lesson
              <svg width="15" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true"><path d="M9 1l4 4-4 4M13 5H0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </a>

            <div className={styles.minigrid}>
              <div><span>Course</span>Financial statements</div>
              <div><span>Course</span>Company analysis</div>
              <div><span>Course</span>Financial ratios</div>
              <div><span>Course</span>Reading earnings</div>
            </div>
            <div className={`${styles.demo} ${styles.mono}`}>Simulated demo data</div>
          </div>
          <div className={styles['slot-tag']}><b>03</b> &nbsp;Learn</div>
        </div>

        {/* ============ 04 CRYPTO ============ */}
        <div className={styles.slot}>
          <div className={styles.screen} id="s4">
            <div className={`${styles.bar} ${styles.mono}`}><span>Signal Pro</span><span className={styles.live}><i></i>On-chain · 24h</span></div>

            <p className={`${styles.eyeb} ${styles.mono}`}>Crypto intelligence</p>
            <h2 className={`${styles.title} ${styles.serif}`}>See where<br />crypto is moving</h2>

            <div className={styles.duo} style={{ marginTop: "12px" }}>
              <div><div className={styles.nm}>BTC · Bitcoin</div><div className={`${styles.px} ${styles.num}`} id="btc">$118,420</div><div className={`${styles.ch} ${styles.num}`}>+2.8%</div></div>
              <div><div className={styles.nm}>ETH · Ethereum</div><div className={`${styles.px} ${styles.num}`} id="eth">$4,186</div><div className={`${styles.ch} ${styles.num}`}>+4.1%</div></div>
            </div>
            <div className={styles.quad}>
              <div><b>SOL</b><span className={styles.num}>+6.2%</span></div>
              <div><b>XRP</b><span className={styles.num}>+1.4%</span></div>
              <div><b>LINK</b><span className={styles.num}>+3.9%</span></div>
              <div><b>AVAX</b><span className={`${styles.num} ${styles.r}`}>−0.8%</span></div>
            </div>

            <div className={styles.card} style={{ marginTop: "11px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className={styles.cap}>Capital flow · 7d</span>
                <span className={`${styles.badge} ${styles['b-gold']}`}><i></i>Rotation detected</span>
              </div>
              <div className={styles.rule}></div>
              <div className={styles.flow}>
                <div className={styles.spine}></div>
                <div className={styles.pulse}></div><div className={`${styles.pulse} ${styles.b}`}></div><div className={`${styles.pulse} ${styles.c}`}></div>
                <div className={styles.node}><span className={styles.dotn}></span><span className={styles.nname}>Stablecoins</span><span className={`${styles.nval} ${styles.num}`}>$4.2B out</span></div>
                <div className={styles.node}><span className={styles.dotn}></span><span className={styles.nname}>Bitcoin</span><span className={`${styles.nval} ${styles.num}`}>+$1.9B</span></div>
                <div className={styles.node}><span className={styles.dotn}></span><span className={styles.nname}>Ethereum</span><span className={`${styles.nval} ${styles.num}`}>+$860M</span></div>
                <div className={styles.node}><span className={styles.dotn}></span><span className={styles.nname}>Solana</span><span className={`${styles.nval} ${styles.num}`}>+$412M</span></div>
                <div className={styles.node}><span className={styles.dotn}></span><span className={styles.nname}>DeFi</span><span className={`${styles.nval} ${styles.num}`}>+$233M</span></div>
              </div>
            </div>

            <div className={styles.card}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span className={styles.cap}>BTC · ETH · 7 days</span>
                <span className={styles.cap}>Indexed to 100</span>
              </div>
              <div className={styles.rule} style={{ margin: "10px 0 8px" }}></div>
              <div className={styles.legend}>
                <span><i style={{ background: "#A8842B" }}></i>BTC <b style={{ color: "#A8842B" }}>+2.8%</b></span>
                <span><i style={{ background: "#2E5C43" }}></i>ETH <b>+4.1%</b></span>
              </div>
              <svg className={styles.chart} viewBox="0 0 330 116" fill="none" aria-hidden="true">
                <line className={styles.grid} x1="0" y1="20" x2="330" y2="20" />
                <line className={styles.grid} x1="0" y1="56" x2="330" y2="56" />
                <line className={styles.grid} x1="0" y1="92" x2="330" y2="92" />
                <path className={styles.ln} stroke="#A8842B" d="M4 82 L30 78 L56 84 L82 71 L108 74 L134 63 L160 67 L186 55 L212 59 L238 47 L264 51 L290 41 L326 37" />
                <path className={`${styles.ln} ${styles.eth}`} stroke="#2E5C43" d="M4 88 L30 79 L56 85 L82 69 L108 65 L134 56 L160 52 L186 42 L212 46 L238 32 L264 28 L290 19 L326 13" />
                <text className={styles.lbl} x="2" y="110">MON</text>
                <text className={styles.lbl} x="150" y="110">THU</text>
                <text className={styles.lbl} x="306" y="110">SUN</text>
              </svg>
            </div>

            <div className={styles.matters}>
              <span className={styles.cap}>Why it matters</span>
              <p>Capital appears to be rotating toward higher-beta assets as liquidity expands.</p>
            </div>

            <div className={styles.spacer}></div>
            <div className={`${styles.demo} ${styles.mono}`}>Simulated demo data</div>
          </div>
          <div className={styles['slot-tag']}><b>04</b> &nbsp;Crypto</div>
        </div>

        {/* ============ 05 AI INTELLIGENCE ============ */}
        <div className={styles.slot}>
          <div className={styles.screen} id="s5">
            <div className={`${styles.bar} ${styles.mono}`}><span>Signal Pro</span><span className={styles.live}><i></i>AI intelligence</span></div>

            <p className={`${styles.eyeb} ${styles.mono}`}>Signal Pro AI</p>
            <h2 className={`${styles.title} ${styles.serif}`}>Ask and get<br />the reasoning</h2>
            <p className={styles.subt} style={{ marginBottom: "14px" }}>Signal Pro AI connects filings, flows, and posts into one answer</p>

            <div className={styles.thread} id="thread" ref={threadRef}>
              {items.map((it) =>
                it.kind === 'q' ? (
                  <div className={styles['ai-q']} key={it.id}>
                    {it.text}
                  </div>
                ) : it.kind === 'typing' ? (
                  <div className={styles['ai-typing']} key={it.id}>
                    <i />
                    <i />
                    <i />
                  </div>
                ) : (
                  <AiCard turn={CHAT[it.turn]} key={it.id} />
                ),
              )}
            </div>

            <div className={styles.ask}>
              <svg className={styles.sp} viewBox="0 0 24 24"><path d="M12 2l2.2 6.3L20.5 10l-5.4 3.4L16.4 20 12 16.4 7.6 20l1.3-6.6L3.5 10l6.3-1.7L12 2Z" /></svg>
              <span className={styles.ph} id="askPh"><b id="askTyped"></b><span id="askRest">Ask about any company, filing or trade</span></span>
              <span className={styles.send}><svg viewBox="0 0 24 24"><path d="M12 19V5" /><path d="M5 12l7-7 7 7" /></svg></span>
            </div>

            <div className={`${styles.demo} ${styles.mono}`}>Simulated demo data</div>
          </div>
          <div className={styles['slot-tag']}><b>05</b> &nbsp;AI intelligence</div>
        </div>

      </div>
      </div>

      <div className={styles['cta-wrap']}>
        <a className={styles.unlock} href="https://nadia-sv.com/app" target="_blank" rel="noopener">Unlock full access
          <svg width="16" height="11" viewBox="0 0 14 10" fill="none" aria-hidden="true"><path d="M9 1l4 4-4 4M13 5H0" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </a>
        <p className={`${styles['cta-sub']} ${styles.serif}`}>Market intelligence. Education. Signals. One platform.</p>
      </div>

      </div>


    </div>
  )
}
