import { mkdirSync, writeFileSync } from 'node:fs'
import puppeteer from 'puppeteer'

/**
 * Drives the real application through the demo script and captures a frame at
 * each beat. Nothing here is mocked: every screen is the running app against
 * its own engines and live sources.
 */

const BASE = 'http://127.0.0.1:3000'
const OUT = 'C:/Users/FAROOQ/AppData/Local/Temp/claude/C--Users-FAROOQ-Downloads-VPW-C05/e5967e41-6440-447d-8324-7c56b123a4f5/scratchpad/design/frames'
mkdirSync(OUT, { recursive: true })

const W = 1280
const H = 800

const frames = []
let i = 0

const browser = await puppeteer.launch({
  headless: 'new',
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  args: [`--window-size=${W},${H}`, '--force-color-profile=srgb', '--hide-scrollbars'],
})

const page = await browser.newPage()
await page.setViewport({ width: W, height: H, deviceScaleFactor: 1 })

/** Captures one beat. `hold` is how long the frame sits on screen. */
async function beat(label, hold = 1600) {
  const file = `${OUT}/${String(i).padStart(3, '0')}.png`
  await page.screenshot({ path: file })
  frames.push({ file, hold, label })
  console.log(`  ${String(i).padStart(3, '0')}  ${label}`)
  i++
}

const settle = (ms = 500) => new Promise((r) => setTimeout(r, ms))

/** Smooth scroll, capturing along the way so motion reads as motion. */
async function scrollTo(y, steps = 4, hold = 420) {
  const from = await page.evaluate(() => window.scrollY)
  for (let s = 1; s <= steps; s++) {
    await page.evaluate((v) => window.scrollTo({ top: v, behavior: 'instant' }), from + ((y - from) * s) / steps)
    await settle(140)
    await beat(`scroll ${Math.round(from + ((y - from) * s) / steps)}`, hold)
  }
}

/* ── 1. the brief ────────────────────────────────────────────────────────── */
await page.goto(`${BASE}/brief`, { waitUntil: 'networkidle2' })
await settle(700)
await beat('brief — opening question', 2400)

// Fill it from the demo brief, as a presenter would.
await page.evaluate(() => {
  const b = [...document.querySelectorAll('button')].find((x) =>
    /use the demo brief/i.test(x.textContent || ''),
  )
  b?.click()
})
await settle(600)
await beat('brief — demo scenario loaded', 2200)
await scrollTo(260, 2, 500)
await beat('brief — style and constraints', 2000)

/* ── 2. build ────────────────────────────────────────────────────────────── */
await Promise.all([
  page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60_000 }),
  page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((x) =>
      /build my event plan/i.test(x.textContent || ''),
    )
    b?.click()
  }),
])
await settle(900)
await beat('command — readiness, every deduction with its fix', 3200)
await beat('command — readiness held', 1400)

/* ── 3. the command center ───────────────────────────────────────────────── */
await scrollTo(700, 3, 460)
await beat('command — budget split, exact to the rupee', 2600)
await scrollTo(1500, 3, 460)
await beat('command — planned against actual, run of show', 2600)
await scrollTo(2300, 3, 460)
await beat('command — task board with real dependencies', 2400)
await scrollTo(3100, 3, 460)
await beat('command — shortlist, risks, validator', 2400)

/* ── 4. research ─────────────────────────────────────────────────────────── */
await page.goto(`${BASE}/research`, { waitUntil: 'networkidle2' })
await settle(900)
await beat('research — sourced options, live forecast', 3000)
await scrollTo(600, 3, 460)
await beat('research — evidence on every card', 2600)

/* ── 5. the what-if ──────────────────────────────────────────────────────── */
await page.goto(`${BASE}/whatif`, { waitUntil: 'networkidle2' })
await settle(700)
await beat('what-if — levers', 2200)

await page.goto(`${BASE}/whatif?guests=55`, { waitUntil: 'networkidle2' })
await settle(900)
await beat('what-if — 40 guests to 55', 3400)
await beat('what-if — only the dependent lines moved', 2600)
await scrollTo(520, 3, 460)
await beat('what-if — the cascade, and the over-budget warning', 3000)

/* ── 6. the pack ─────────────────────────────────────────────────────────── */
await page.goto(`${BASE}/execution`, { waitUntil: 'networkidle2' })
await settle(800)
await beat('execution — the pack', 2800)
await scrollTo(700, 3, 460)
await beat('execution — evidence survives into the export', 3200)

await browser.close()

writeFileSync(`${OUT}/manifest.json`, JSON.stringify(frames, null, 2))
console.log(`\n  ${frames.length} frames captured`)
