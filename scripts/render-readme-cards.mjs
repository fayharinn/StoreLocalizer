// Renders the README illustrations from docs/readme/cards.html.
// Usage: node scripts/render-readme-cards.mjs
// Output: docs/readme/<card>.png (one per <section class="card" data-name="…">, @2x),
// or the path in data-file (public/og.png for the social preview)

import puppeteer from 'puppeteer-core'
import { join, dirname } from 'path'
import { fileURLToPath, pathToFileURL } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SOURCE = join(ROOT, 'docs', 'readme', 'cards.html')
const OUT = join(ROOT, 'docs', 'readme')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new', args: ['--allow-file-access-from-files'] })
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 2 })
  await page.goto(pathToFileURL(SOURCE).href, { waitUntil: 'networkidle0' })
  await page.evaluate(() => document.fonts.ready)
  for (const card of await page.$$('section.card')) {
    const { name, file, scale } = await card.evaluate((el) => ({ ...el.dataset }))
    // data-file sends a card elsewhere (the social preview goes to public/og.png at 1x)
    await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: Number(scale) || 2 })
    await card.screenshot({ path: file ? join(ROOT, file) : join(OUT, `${name}.png`), omitBackground: !file })
    console.log(`✓ ${file || `${name}.png`}`)
  }
} finally {
  await browser.close()
}
