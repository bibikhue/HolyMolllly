// Run with Playwright installed: node scripts/render-og.cjs
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')

async function main() {
  const root = path.resolve(__dirname, '..')
  const svg = fs.readFileSync(path.join(root, 'src/assets/mapsosa-og.svg'), 'utf8')
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] })
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
    await page.setContent(`<html><head><style>html,body{margin:0;width:1200px;height:630px;overflow:hidden}svg{display:block}</style></head><body>${svg}</body></html>`)
    await page.evaluate(async () => {
      await document.fonts.ready
      await Promise.all(Array.from(document.querySelectorAll('image'), (image) => new Promise((resolve, reject) => {
        const resource = new Image()
        resource.onload = resolve
        resource.onerror = reject
        resource.src = image.getAttribute('href')
      })))
    })
    await page.screenshot({ path: path.join(root, 'public/images/mapsosa-og-coast-v3.png') })
  } finally {
    await browser.close()
  }
}
main().catch((error) => { console.error(error); process.exit(1) })
