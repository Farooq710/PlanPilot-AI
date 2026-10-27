import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import opentype from 'opentype.js'
import sharp from 'sharp'

/* ─────────────────────────────────────────────────────────── Calibrated Silence
   A single plate. Every angle below subtends a real quantity: the six segments
   hold the system's default allocation, the needle the readiness it reports for
   the reference scenario. Type is converted to outlines, so the artefact
   carries no font dependency.
   ───────────────────────────────────────────────────────────────────────── */

const FONT_DIR =
  'C:/Users/FAROOQ/AppData/Local/Claude-Data/claude_pzs8sxrjxfjjc/local-agent-mode-sessions/skills-plugin/007345b3-e1d6-4bb5-aa34-ba7f693ccee0/f3274a1d-b3b1-48db-b0d3-c58681f9c426/skills/canvas-design/canvas-fonts'

// loadSync is deprecated in opentype.js 2.x and returns undefined rather than
// throwing, so the font is parsed from the buffer directly.
const loadFont = (file) => {
  const buf = readFileSync(`${FONT_DIR}/${file}`)
  return opentype.parse(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength))
}

const display = loadFont('Italiana-Regular.ttf')
const mono = loadFont('GeistMono-Regular.ttf')

/* ── palette ─────────────────────────────────────────────────────────────── */
const GROUND = '#F7F3EC' // unbleached linen, never white
const INK = '#141C2E' // reads as structure, not colour
const MUTED = '#5A6480'
const HAIR = '#D9D0C2'
const FAINT = '#E7DFD3'
const ACCENT = '#B8372B' // three appearances, each earned

/* ── the reference ───────────────────────────────────────────────────────── */
const SEGMENTS = [
  { k: 'VN', pct: 25 },
  { k: 'FD', pct: 35 },
  { k: 'DC', pct: 15 },
  { k: 'CK', pct: 8 },
  { k: 'AC', pct: 7 },
  { k: 'CT', pct: 10 },
]
const READINESS = 72

/* ── helpers ─────────────────────────────────────────────────────────────── */
const n = (v) => Number(v.toFixed(3))

const onArc = (r, t, cx, cy) => {
  const phi = ((180 - 180 * t) * Math.PI) / 180
  return [cx + r * Math.cos(phi), cy - r * Math.sin(phi)]
}

const arcPath = (r, t0, t1, cx, cy) => {
  const [x0, y0] = onArc(r, t0, cx, cy)
  const [x1, y1] = onArc(r, t1, cx, cy)
  return `M ${n(x0)} ${n(y0)} A ${n(r)} ${n(r)} 0 0 1 ${n(x1)} ${n(y1)}`
}

const circlePath = (r, cx, cy) =>
  `M ${n(cx - r)} ${n(cy)} A ${n(r)} ${n(r)} 0 1 0 ${n(cx + r)} ${n(cy)} A ${n(r)} ${n(r)} 0 1 0 ${n(cx - r)} ${n(cy)}`

/* ── type as outlines ────────────────────────────────────────────────────── */
function tracked(font, text, size, tracking) {
  // charToGlyph rather than stringToGlyphs: the latter runs feature shaping,
  // which opentype.js cannot parse in these faces, and a tracked logotype
  // wants no ligatures regardless.
  const glyphs = [...text].map((ch) => font.charToGlyph(ch))
  let w = 0
  for (const g of glyphs) w += (g.advanceWidth / font.unitsPerEm) * size + tracking
  w -= tracking
  return { width: w, glyphs }
}

/**
 * Serialises a glyph outline from its commands.
 *
 * opentype.js's own toPathData emits the literal string "NaN" at certain
 * fractional offsets — cursor 912.50 produces it where 912.40 and 912.60 do
 * not — which silently truncates a glyph run at render time. Writing the
 * numbers here removes that failure mode and keeps precision uniform.
 */
function pathToD(path) {
  const out = []
  for (const c of path.commands) {
    if (c.type === 'M') out.push(`M${n(c.x)} ${n(c.y)}`)
    else if (c.type === 'L') out.push(`L${n(c.x)} ${n(c.y)}`)
    else if (c.type === 'C')
      out.push(`C${n(c.x1)} ${n(c.y1)} ${n(c.x2)} ${n(c.y2)} ${n(c.x)} ${n(c.y)}`)
    else if (c.type === 'Q') out.push(`Q${n(c.x1)} ${n(c.y1)} ${n(c.x)} ${n(c.y)}`)
    else if (c.type === 'Z') out.push('Z')
  }
  return out.join('')
}

function typeset(font, text, size, tracking, x, y, anchor = 'start') {
  const { width, glyphs } = tracked(font, text, size, tracking)
  let cursor = anchor === 'middle' ? x - width / 2 : anchor === 'end' ? x - width : x
  const parts = []
  for (const g of glyphs) {
    const d = pathToD(g.getPath(cursor, y, size))
    if (d) parts.push(d)
    cursor += (g.advanceWidth / font.unitsPerEm) * size + tracking
  }
  return { d: parts.join(' '), width }
}

const mark = (text, size, x, y, anchor = 'start', tracking = size * 0.16, fill = MUTED) => {
  const { d, width } = typeset(mono, text.toUpperCase(), size, tracking, x, y, anchor)
  return { el: `<path d="${d}" fill="${fill}"/>`, width }
}

/* ── the dial ────────────────────────────────────────────────────────────── */
/**
 * Draws the instrument at a given centre and scale. Shared by the plate and
 * the standalone mark so the two can never drift apart.
 */
function dial({ cx, cy, rRing, gauge, band, ticks = true, graduations = true, horizon = 0.26 }) {
  const g = []

  if (ticks) {
    // Dense accumulation: one hairline per degree. Tone from a distance,
    // countable units at reading range.
    const t = []
    for (let deg = 0; deg < 360; deg += 1) {
      // Uniform length, with reach given only to the cardinals. Varying three
      // tick lengths around the circle reads as a sawtooth at plate scale.
      const len = deg % 90 === 0 ? rRing * 0.062 : rRing * 0.026
      const phi = (deg * Math.PI) / 180
      t.push(
        `M ${n(cx + rRing * Math.cos(phi))} ${n(cy - rRing * Math.sin(phi))} L ${n(cx + (rRing + len) * Math.cos(phi))} ${n(cy - (rRing + len) * Math.sin(phi))}`,
      )
    }
    g.push(`<path d="${t.join(' ')}" stroke="${FAINT}" stroke-width="${n(rRing * 0.0048)}" fill="none"/>`)
    g.push(`<path d="${circlePath(rRing, cx, cy)}" stroke="${HAIR}" stroke-width="${n(rRing * 0.0053)}" fill="none"/>`)
  }

  // Horizon.
  g.push(
    `<path d="M ${n(cx - rRing - rRing * horizon)} ${n(cy)} L ${n(cx + rRing + rRing * horizon)} ${n(cy)}" stroke="${HAIR}" stroke-width="${n(rRing * 0.0053)}"/>`,
  )

  // Unlit track, then the six segments with angular gaps so they stay
  // optically even at every radius.
  g.push(
    `<path d="${arcPath(gauge, 0, 1, cx, cy)}" stroke="#EAE3D8" stroke-width="${n(band)}" fill="none" stroke-linecap="butt"/>`,
  )
  const GAP_T = 1.15 / 180
  let t0 = 0
  for (const s of SEGMENTS) {
    const span = s.pct / 100
    g.push(
      `<path d="${arcPath(gauge, t0 + GAP_T / 2, t0 + span - GAP_T / 2, cx, cy)}" stroke="${INK}" stroke-width="${n(band)}" fill="none" stroke-linecap="butt"/>`,
    )
    t0 += span
  }

  // Inner rule, set one modulus in from the band.
  const rInner = gauge - band / 2 - band * 0.48
  g.push(`<path d="${arcPath(rInner, 0, 1, cx, cy)}" stroke="${HAIR}" stroke-width="${n(rRing * 0.0048)}" fill="none"/>`)

  if (graduations) {
    const gr = []
    for (let v = 0; v <= 100; v += 2.5) {
      const decade = v % 10 === 0
      const r0 = rInner - band * 0.30
      const r1 = r0 - (decade ? band * 0.52 : band * 0.26)
      const [x0, y0] = onArc(r0, v / 100, cx, cy)
      const [x1, y1] = onArc(r1, v / 100, cx, cy)
      gr.push(`M ${n(x0)} ${n(y0)} L ${n(x1)} ${n(y1)}`)
    }
    g.push(`<path d="${gr.join(' ')}" stroke="${MUTED}" stroke-width="${n(rRing * 0.0048)}" fill="none" opacity="0.45"/>`)
  }

  // ACCENT — the needle. It terminates inside the inner rule: an instrument
  // points at its scale, it does not cross it.
  const t = READINESS / 100
  const [xo, yo] = onArc(rInner - band * 0.12, t, cx, cy)
  const [xi, yi] = onArc(rRing * 0.135, t, cx, cy)
  g.push(`<path d="M ${n(xi)} ${n(yi)} L ${n(xo)} ${n(yo)}" stroke="${ACCENT}" stroke-width="${n(rRing * 0.0115)}"/>`)
  g.push(`<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(rRing * 0.030)}" fill="${ACCENT}"/>`)
  g.push(
    `<circle cx="${n(cx)}" cy="${n(cy)}" r="${n(rRing * 0.092)}" fill="none" stroke="${ACCENT}" stroke-width="${n(rRing * 0.0053)}"/>`,
  )

  return g.join('\n')
}

/* ── guard ───────────────────────────────────────────────────────────────── */
const assertClean = (doc, label) => {
  if (doc.includes('NaN') || doc.includes('undefined')) {
    throw new Error(`${label}: document contains a non-finite coordinate`)
  }
}

/* ═══════════════════════════════════════════════════════════ PLATE ════════ */
const W = 2400
const H = 3200
const M = 190

const CX = W / 2
const CY = 1150
const R_RING = 430

const plate = []
plate.push(`<rect width="${W}" height="${H}" fill="${GROUND}"/>`)
plate.push(dial({ cx: CX, cy: CY, rRing: R_RING, gauge: 322, band: 50 }))

/* Wordmark. */
{
  const y = 1985
  const { d } = typeset(display, 'PLANPILOT', 168, 29, CX, y, 'middle')
  plate.push(`<path d="${d}" fill="${INK}"/>`)

  const sub = mark('E V I D E N C E   E N G I N E', 21, CX, y + 84, 'middle', 6.6, MUTED)
  plate.push(sub.el)
  const half = sub.width / 2
  plate.push(
    `<path d="M ${n(CX - half - 72)} ${n(y + 76)} L ${n(CX - half - 236)} ${n(y + 76)}" stroke="${HAIR}" stroke-width="2.1"/>`,
  )
  plate.push(
    `<path d="M ${n(CX + half + 72)} ${n(y + 76)} L ${n(CX + half + 236)} ${n(y + 76)}" stroke="${HAIR}" stroke-width="2.1"/>`,
  )
}

/* The four states. Two continuous, two broken — the distinction the whole
   system turns on, stated once and left unexplained. */
{
  // Close to the type block, so the page holds one measured breath before
  // the foot rather than two indecisive ones.
  const y = 2424
  const keys = [
    { k: 'PUBLISHED', dash: null },
    { k: 'QUOTED', dash: null },
    { k: 'ESTIMATE', dash: '13 11' },
    { k: 'UNKNOWN', dash: '4 13' },
  ]
  const slot = (W - M * 2) / 4
  keys.forEach((s, i) => {
    const cx = M + slot * i + slot / 2
    plate.push(
      `<path d="M ${n(cx - 84)} ${n(y)} L ${n(cx + 84)} ${n(y)}" stroke="${INK}" stroke-width="3.2"${s.dash ? ` stroke-dasharray="${s.dash}"` : ''}/>`,
    )
    plate.push(mark(s.k, 18, cx, y + 52, 'middle', 4.2, MUTED).el)
  })
}

/* Segment legend. Replaces the radial keys, which fouled the tick ring: the
   codes now sit on one measured line where nothing can collide. Set directly
   beneath the subtitle so the wordmark, its rule and the data read as one
   block, leaving a single intentional void below it. */
{
  const y = 2176
  const line = SEGMENTS.map((s) => `${s.k} ${String(s.pct).padStart(2, '0')}`).join('   ·   ')
  const m = mark(line, 20, CX, y, 'middle', 5.2, MUTED)
  plate.push(m.el)
  plate.push(
    `<path d="M ${n(CX - m.width / 2)} ${n(y - 42)} L ${n(CX + m.width / 2)} ${n(y - 42)}" stroke="${HAIR}" stroke-width="2.1"/>`,
  )
}

/* Marginalia. */
plate.push(mark('PL—01', 21, M, M + 10, 'start', 5.2, INK).el)
plate.push(mark('CALIBRATED SILENCE', 21, W - M, M + 10, 'end', 5.2, MUTED).el)
/* ACCENT — one struck rule beneath the plate number. */
plate.push(`<path d="M ${n(M)} ${n(M + 34)} L ${n(M + 92)} ${n(M + 34)}" stroke="${ACCENT}" stroke-width="3.2"/>`)

/* Left measure, anchored between the two horizontal rules rather than
   drifting the full height. */
{
  const x = M
  const y0 = CY - R_RING - 58
  const y1 = CY + R_RING + 58
  const g = [`M ${n(x)} ${n(y0)} L ${n(x)} ${n(y1)}`]
  for (let y = y0; y <= y1; y += 38) {
    const major = Math.round((y - y0) / 38) % 5 === 0
    g.push(`M ${n(x)} ${n(y)} L ${n(x + (major ? 24 : 12))} ${n(y)}`)
  }
  plate.push(`<path d="${g.join(' ')}" stroke="${FAINT}" stroke-width="2.1" fill="none"/>`)
}
/* ACCENT — a single index on the measure, struck at the needle's height. */
plate.push(`<path d="M ${n(M - 15)} ${n(CY)} L ${n(M + 38)} ${n(CY)}" stroke="${ACCENT}" stroke-width="3.2"/>`)

/* Baseline: the one phrase permitted to carry weight. */
{
  const y = H - M
  plate.push(mark('AN ESTIMATE IS NOT A QUOTE', 24, CX, y, 'middle', 7.2, INK).el)
  plate.push(mark('FIG. 01', 19, M, y, 'start', 4.8, MUTED).el)
  plate.push(mark('180°  /  6 SEGMENTS', 19, W - M, y, 'end', 4.8, MUTED).el)
}

const plateDoc = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${plate.join('\n')}</svg>`
assertClean(plateDoc, 'plate')

/* ═══════════════════════════════════════════════════════════ MARK ═════════ */
/* The logo alone, on a square field, for actual use. */
const S = 1600
const mcx = S / 2
const mcy = 640

const logo = []
logo.push(`<rect width="${S}" height="${S}" fill="${GROUND}"/>`)
logo.push(dial({ cx: mcx, cy: mcy, rRing: 292, gauge: 219, band: 34, horizon: 0.11 }))
{
  const { d } = typeset(display, 'PLANPILOT', 112, 19, mcx, 1118, 'middle')
  logo.push(`<path d="${d}" fill="${INK}"/>`)
  logo.push(mark('E V I D E N C E   E N G I N E', 14.5, mcx, 1172, 'middle', 4.6, MUTED).el)
}
const logoDoc = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${logo.join('\n')}</svg>`
assertClean(logoDoc, 'mark')

/* ── write ───────────────────────────────────────────────────────────────── */
const OUT = 'C:/Users/FAROOQ/Downloads/VPW C05/brand'
mkdirSync(OUT, { recursive: true })

writeFileSync(`${OUT}/planpilot-plate.svg`, plateDoc)
writeFileSync(`${OUT}/planpilot-mark.svg`, logoDoc)

await sharp(Buffer.from(plateDoc), { density: 300 }).resize(3600).png().toFile(`${OUT}/planpilot-plate.png`)
await sharp(Buffer.from(logoDoc), { density: 300 }).resize(2000).png().toFile(`${OUT}/planpilot-mark.png`)

console.log('plate + mark written, documents verified clean')
