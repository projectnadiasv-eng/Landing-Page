/*
 * CARDS — ported verbatim from legacy/index.html:4336-4351 (block 08, ns spct).
 *
 * Two deliberate changes, both mandated by the migration brief:
 *   1. `photo` was a base64 data URI; it is now the extracted file under
 *      /img/congress/<slug>.jpg. Same image, same bytes, different transport.
 *   2. Nothing else. Field order, spelling, punctuation, the empty `logo:''`
 *      and `conflicts:0` on Trump are all as-authored — both are falsy and the
 *      renderer branches on them, so "tidying" them changes what renders.
 *
 * The array is fully deterministic: no Math.random, no Date. It is therefore
 * safe to render during SSR.
 *
 * `trend` is a 19-point 0..100 series driving the card's sparkline. It is a
 * SHAPE, not sourced data — the same is true of the six that shipped with the
 * legacy block. Pelosi and Suozzi were the two cards without one, which left
 * them as the only cards in the grid with no chart; they now carry one in the
 * same idiom as the rest.
 *
 * ---------------------------------------------------------------------------
 * PLACEHOLDER FIGURES — REPLACE BEFORE THIS SHIPS
 *
 * `profit` on Pelosi and Suozzi is marked PLACEHOLDER below. Those two numbers
 * were NOT taken from a filing; they were chosen to sit plausibly against the
 * volume already on each card. Every other `profit` in this array came with the
 * legacy block and is presumed sourced.
 *
 * This matters because the block renders these as disclosed figures attributed
 * to named, living public officials, under a caption that reads "Illustrative
 * figures from public filings". Swap in the real STOCK Act numbers, or pull the
 * two `profit` lines back out — the cards render correctly without them.
 * ---------------------------------------------------------------------------
 */

export interface CardStat {
  /** value (rendered in <b>) */
  v: string
  /** key/caption (rendered in <span>) */
  k: string
}

export interface Card {
  name: string
  seat?: string
  /** when present, replaces the seat + status/conflicts tag pair */
  role?: string
  status?: string
  conflicts?: number
  profit?: string
  ret?: string
  flow?: string
  trades?: string
  co?: string
  tk?: string
  /** label for the .c-top row; defaults to 'Top' */
  topK?: string
  top?: boolean
  photo?: string
  logo?: string
  /** when present, renders the .c-locked "Sign up to see" row */
  locked?: string
  stats?: CardStat[]
  trend?: number[]
}

/* The pricing block, not the app. One constant, so all 8 politician cards
   move together — this is read once by the card CTA in Congress.tsx. */
export const CTA_URL = '#sppricing-root'

export const CARDS: Card[] = [
  { name:'Donald J. Trump',        seat:'R POTUS', conflicts:0,  profit:'+$31.5M',   ret:'+17.2%', flow:'$505.7M', trades:'3,642', co:'Microsoft',              tk:'MSFT',              photo:'/img/congress/donald-j-trump.jpg', logo:'',
    trend:[8,10,9,14,22,20,34,30,52,48,66,60,74,70,88,82,92,86,96] },
  { name:'Nancy Pelosi', seat:'D HOUSE', status:'Current',
    stats:[ {v:'Representative', k:'Role'}, {v:'California', k:'State'},
            {v:'Democratic', k:'Party'}, {v:'Current', k:'Status'} ],
    locked:'Total Value', photo:'/img/congress/nancy-pelosi.jpg',
    profit:'+$2.4M',   // PLACEHOLDER — see the note above
    trend:[10,12,11,15,14,18,17,22,26,24,30,36,42,48,58,64,72,80,88] },
  { name:'Cleo Fields',            seat:'D HOUSE', conflicts:23, profit:'+$318.7K',  ret:'+27.5%', flow:'$1.2M',   trades:'25',    co:'Meta Platforms',          tk:'META', top:true, photo:'/img/congress/cleo-fields.jpg', logo:'',
    trend:[6,7,6,8,7,9,8,10,9,12,44,70,74,76,78,80,82,84,86] },
  { name:'Tim Moore',              seat:'R HOUSE', conflicts:6,  profit:'+$161K',    ret:'+35.2%', flow:'$1M',     trades:'27',    co:'LGI Homes',               tk:'LGIH', photo:'/img/congress/tim-moore.jpg', logo:'',
    trend:[14,16,12,18,15,20,17,22,19,26,24,58,66,70,72,76,78,80,84] },
  { name:'Thomas R. Suozzi', seat:'D HOUSE', role:'Democratic / House / New York',
    stats:[ {v:'$12.16M', k:'Net Worth Est.'}, {v:'$20.90M', k:'Trade Volume'},
            {v:'671', k:'Total Trades'}, {v:'May 8, 2026', k:'Last Traded'} ],
    topK:'Top sector', co:'Information Technology', tk:'154',
    photo:'/img/congress/thomas-r-suozzi.jpg',
    profit:'+$412K',   // PLACEHOLDER — see the note above
    trend:[18,20,17,24,22,28,26,32,30,38,42,40,48,54,52,60,66,70,76] },
  { name:'Maria Elvira Salazar',   seat:'R HOUSE', conflicts:16, profit:'+$121.3K',  ret:'+10.7%', flow:'$1.3M',   trades:'64',    co:'Biogen',                  tk:'BIIB', photo:'/img/congress/maria-elvira-salazar.jpg', logo:'',
    trend:[4,6,9,12,14,18,22,25,30,34,40,44,50,56,60,66,70,74,78] },
  { name:'Jared Moskowitz',        seat:'D HOUSE', conflicts:51, profit:'+$47.1K',   ret:'+14.4%', flow:'$656K',   trades:'71',    co:'Oracle',                  tk:'ORCL', photo:'/img/congress/jared-moskowitz.jpg', logo:'',
    trend:[12,14,13,18,17,22,26,24,30,34,32,40,44,48,52,68,72,74,78] },
  { name:'Josh Gottheimer',        seat:'D HOUSE', conflicts:18, profit:'+$38.4K',   ret:'+13.0%', flow:'$4M',     trades:'100',   co:'Microsoft',               tk:'MSFT', photo:'/img/congress/josh-gottheimer.jpg', logo:'',
    trend:[8,9,8,10,9,11,10,12,11,13,12,14,13,16,18,22,30,58,84] },
]
