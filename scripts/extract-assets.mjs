/**
 * One-shot extraction of every base64 data URI in legacy/index.html into
 * public/img/. Output is committed; the script is kept for provenance so the
 * mapping can be re-derived and audited.
 *
 * Names are derived from the SOURCE MARKUP, never hand-guessed:
 *  - block 08 portraits are paired with the name: field of their CARDS object
 *  - block 06 portraits are paired with the initials text of their .lb-av div
 *  - the hero poster comes from the poster= attribute of the two <video> tags
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'

const SRC = 'legacy/index.html'
const html = readFileSync(SRC, 'utf8')
const B64 = String.raw`data:image/(\w+);base64,([A-Za-z0-9+/=]+)`

const slug = (s) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

const planned = []

// --- block 08: CARDS array -> pair name: with photo: ---------------------
const cardsStart = html.indexOf('var CARDS = [')
const cardsEnd = html.indexOf('\n  ];', cardsStart)
const cardsSrc = html.slice(cardsStart, cardsEnd)
for (const obj of cardsSrc.split(/\{\s*name:/).slice(1)) {
  const name = obj.match(/^\s*'([^']+)'/)?.[1]
  const photo = obj.match(new RegExp(`photo:\\s*'${B64}'`))
  if (name && photo) {
    planned.push({ file: `congress/${slug(name)}.${photo[1] === 'jpeg' ? 'jpg' : photo[1]}`, b64: photo[2], from: `CARDS name='${name}'` })
  }
}

// --- block 06: leaderboard -> pair initials text with the img ------------
const INITIALS = { DT: 'donald-j-trump', GC: 'gilbert-ray-cisneros-jr', CF: 'cleo-fields' }
const lbRe = new RegExp(String.raw`class="lb-av"[^>]*>([A-Z]{2})<img src="${B64}"`, 'g')
for (const m of html.matchAll(lbRe)) {
  const who = INITIALS[m[1]]
  if (!who) throw new Error(`unmapped leaderboard initials: ${m[1]}`)
  planned.push({ file: `congress/${who}.${m[2] === 'jpeg' ? 'jpg' : m[2]}`, b64: m[3], from: `lb-av '${m[1]}'` })
}

// --- hero video posters --------------------------------------------------
const posterRe = new RegExp(String.raw`poster="${B64}"`, 'g')
for (const m of html.matchAll(posterRe)) {
  planned.push({ file: `hero-poster.${m[1] === 'jpeg' ? 'jpg' : m[1]}`, b64: m[2], from: 'video poster=' })
}

// --- dedupe by content, assert every name maps to exactly one payload ----
const byFile = new Map()
for (const p of planned) {
  const buf = Buffer.from(p.b64, 'base64')
  const sha = createHash('sha256').update(buf).digest('hex')
  const prev = byFile.get(p.file)
  if (prev && prev.sha !== sha) throw new Error(`name collision with different bytes: ${p.file}`)
  if (!prev) byFile.set(p.file, { sha, buf, sources: [p.from] })
  else prev.sources.push(p.from)
}

mkdirSync('public/img/congress', { recursive: true })
const manifest = []
for (const [file, { sha, buf, sources }] of byFile) {
  writeFileSync(`public/img/${file}`, buf)
  manifest.push({ file: `/img/${file}`, bytes: buf.length, sha256: sha, occurrences: sources.length, sources })
}
manifest.sort((a, b) => a.file.localeCompare(b.file))
writeFileSync('public/img/manifest.json', JSON.stringify(manifest, null, 2) + '\n')

const uniq = new Set([...byFile.values()].map((v) => v.sha))
console.log(`occurrences: ${planned.length}   files: ${byFile.size}   unique payloads: ${uniq.size}`)
for (const m of manifest) console.log(`  ${m.file.padEnd(38)} ${String(m.bytes).padStart(7)}B  x${m.occurrences}`)
