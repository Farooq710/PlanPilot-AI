import { readFileSync, mkdirSync } from 'node:fs'
import sharp from 'sharp'

/**
 * Assembles the captured beats into an animation.
 *
 * There is no ffmpeg on this machine, so an MP4 is not available. Animated
 * WebP and GIF both carry the walkthrough, embed in a README or a chat
 * without a player, and keep the per-frame timing the capture recorded.
 */

const DIR = 'C:/Users/FAROOQ/AppData/Local/Temp/claude/C--Users-FAROOQ-Downloads-VPW-C05/e5967e41-6440-447d-8324-7c56b123a4f5/scratchpad/design/frames'
const OUT = 'C:/Users/FAROOQ/Downloads/VPW C05/brand'
mkdirSync(OUT, { recursive: true })

const manifest = JSON.parse(readFileSync(`${DIR}/manifest.json`, 'utf8'))
console.log(`  ${manifest.length} frames, ${(manifest.reduce((s, f) => s + f.hold, 0) / 1000).toFixed(1)}s total`)

const WIDTH = 1000

// Resize every frame to a common width first; sharp's join requires identical
// dimensions across the set.
const buffers = []
for (const f of manifest) {
  buffers.push(await sharp(f.file).resize({ width: WIDTH }).png().toBuffer())
}

const delay = manifest.map((f) => f.hold)

/* WebP: the better artefact — far smaller, and no 256-colour ceiling to
   posterise the warm ground the whole interface sits on. */
await sharp(buffers, { join: { animated: true } })
  .webp({ loop: 0, delay, quality: 72, effort: 5 })
  .toFile(`${OUT}/planpilot-demo.webp`)

/* GIF: universally embeddable, at the cost of size and a quantised palette. */
await sharp(buffers, { join: { animated: true } })
  .gif({ loop: 0, delay, colours: 128, dither: 0.6 })
  .toFile(`${OUT}/planpilot-demo.gif`)

console.log('  written: planpilot-demo.webp, planpilot-demo.gif')
