// Capture docs/screenshots/agent.png — Agent page with a seeded conversation
// (screenshot gallery + vision feedback). Run: node scripts/take-agent-screenshot.mjs
import puppeteer from 'puppeteer-core'

const APP_URL = 'http://localhost:5173'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await puppeteer.launch({ executablePath: CHROME, headless: 'new' })
try {
  const page = await browser.newPage()
  await page.setViewport({ width: 1500, height: 1050, deviceScaleFactor: 2 })
  await page.goto(APP_URL, { waitUntil: 'networkidle0' })

  // Build fake phone screenshots (gradient + UI blocks) as data URIs
  const images = await page.evaluate(() => {
    const palettes = [
      ['#7c5cff', '#2dd4bf'],
      ['#0ea5e9', '#6366f1'],
      ['#f59e0b', '#ef4444'],
      ['#10b981', '#0ea5e9'],
    ]
    return palettes.map(([a, b], i) => {
      const canvas = document.createElement('canvas')
      canvas.width = 512
      canvas.height = 1024
      const ctx = canvas.getContext('2d')
      const grad = ctx.createLinearGradient(0, 0, 512, 1024)
      grad.addColorStop(0, a)
      grad.addColorStop(1, b)
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, 512, 1024)
      ctx.fillStyle = 'rgba(255,255,255,0.92)'
      ctx.font = 'bold 44px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText(['Plan your trip', 'Track your runs', 'Sleep better', 'Scan & go'][i], 256, 200)
      ctx.fillStyle = 'rgba(255,255,255,0.35)'
      for (let r = 0; r < 4; r++) {
        ctx.beginPath()
        ctx.roundRect(66, 320 + r * 140, 380, 100, 24)
        ctx.fill()
      }
      ctx.fillStyle = 'rgba(255,255,255,0.9)'
      ctx.beginPath()
      ctx.roundRect(156, 900, 200, 56, 28)
      ctx.fill()
      return {
        url: canvas.toDataURL('image/png'),
        fullUrl: canvas.toDataURL('image/png'),
        name: `iPhone 6.7" #${i + 1} — screenshot_${i + 1}.png`,
      }
    })
  })

  const seedMessages = [
    { role: 'user', content: 'Show me the French screenshots of the latest ChillTrip version and give me feedback' },
    {
      role: 'assistant',
      content: 'Let me pull up your **fr-FR** screenshots.',
      toolCalls: [{ id: 'call_1', name: 'asc_list_screenshots', args: { versionId: 'v123', locale: 'fr-FR' } }],
    },
    {
      role: 'tool',
      toolCallId: 'call_1',
      name: 'asc_list_screenshots',
      content: JSON.stringify({ locale: 'fr-FR', totalScreenshots: 4, sets: [{ displayType: 'APP_IPHONE_67', name: 'iPhone 6.7"', count: 4 }] }, null, 2),
      isError: false,
      images,
    },
    {
      role: 'assistant',
      content: [
        'Nice set overall — a few things to tighten for the French store:',
        '',
        '- **Screenshot 1** — strong headline, but "Plan your trip" is still in English; localize it (*"Planifiez votre voyage"*).',
        '- **Screenshot 3** — the CTA button is cramped at the bottom safe area on 6.7".',
        '- Consider adding a fifth screenshot showing offline mode — a top search theme in `fr-FR` travel apps.',
      ].join('\n'),
      toolCalls: [],
    },
  ]

  await page.evaluate((msgs) => {
    window.localStorage.setItem('xcstrings-localizer-agent-messages', JSON.stringify(msgs))
    window.localStorage.setItem(
      'xcstrings-localizer-agent-settings',
      JSON.stringify({ provider: 'anthropic', model: 'claude-sonnet-5-5', autoApprove: false })
    )
    // A placeholder key so the page shows its ready state; nothing is sent
    window.localStorage.setItem(
      'xcstrings-localizer-provider-config',
      JSON.stringify({ provider: 'anthropic', apiKeys: { anthropic: 'sk-ant-demo' }, models: { anthropic: 'claude-sonnet-5-5' } })
    )
    window.localStorage.setItem('xcstrings-localizer-active-page', 'agent')
    window.localStorage.setItem('localizer-theme', 'dark')
    window.sessionStorage.setItem('xcstrings-localizer-welcome-shown', 'true')
  }, seedMessages)
  await page.reload({ waitUntil: 'networkidle0' })
  await sleep(2500)

  const el = await page.$('main')
  await el.screenshot({ path: 'docs/screenshots/agent.png' })
  console.log('saved docs/screenshots/agent.png')
} finally {
  await browser.close()
}
