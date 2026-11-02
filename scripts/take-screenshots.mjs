// Captures the README screenshots against the local dev server (bun run dev).
// Usage: node scripts/take-screenshots.mjs
// Output: docs/screenshots/*.png (1600x1000 viewport @2x, dark theme)

import puppeteer from 'puppeteer-core'
import { mkdirSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { tmpdir } from 'os'
import { fileURLToPath } from 'url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'docs', 'screenshots')
const APP_URL = 'http://localhost:5173'
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

mkdirSync(OUT, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// A provider with a placeholder key, so the sidebar shows a ready state (no request is sent)
const DEMO_PROVIDER = JSON.stringify({
  provider: 'anthropic',
  apiKeys: { anthropic: 'sk-ant-demo' },
  models: { anthropic: 'claude-sonnet-5-5' },
})

// A demo .xcstrings catalog (a fitness app) so the translator page shows real content:
// 16 keys, 9 languages, a few strings still missing in some locales
const DEMO_STRINGS = {
  'welcome.title': {
    en: "Welcome to FitTrack",
    de: "Willkommen bei FitTrack",
    es: "Bienvenido a FitTrack",
    fr: "Bienvenue sur FitTrack",
    ja: "FitTrackへようこそ",
    ko: "FitTrack에 오신 것을 환영합니다",
    'pt-BR': "Boas-vindas ao FitTrack",
    ar: "مرحبًا بك في FitTrack",
    'zh-Hans': "欢迎使用 FitTrack",
  },
  'workout.start': {
    en: "Start workout",
    de: "Training starten",
    es: "Iniciar entrenamiento",
    fr: "Démarrer l’entraînement",
    ja: "ワークアウトを開始",
    ko: "운동 시작",
    'pt-BR': "Iniciar treino",
    ar: "ابدأ التمرين",
    'zh-Hans': "开始锻炼",
  },
  'workout.pause': {
    en: "Pause",
    de: "Pause",
    es: "Pausa",
    fr: "Pause",
    ja: "一時停止",
    ko: "일시정지",
    'pt-BR': "Pausar",
    ar: "إيقاف مؤقت",
  },
  'workout.finish': {
    en: "Finish workout",
    de: "Training beenden",
    es: "Terminar entrenamiento",
    fr: "Terminer l’entraînement",
    ja: "ワークアウトを終了",
    ko: "운동 종료",
    'pt-BR': "Finalizar treino",
    'zh-Hans': "结束锻炼",
  },
  'stats.calories': {
    en: "%lld calories burned",
    de: "%lld Kalorien verbrannt",
    es: "%lld calorías quemadas",
    fr: "%lld calories brûlées",
    ja: "%lld kcal消費",
    ko: "%lld칼로리 소모",
    'pt-BR': "%lld calorias queimadas",
    ar: "تم حرق %lld سعرة",
    'zh-Hans': "已消耗 %lld 卡路里",
  },
  'stats.distance': {
    en: "%@ km today",
    de: "Heute %@ km",
    es: "%@ km hoy",
    fr: "%@ km aujourd’hui",
    ja: "今日は%@ km",
    ko: "오늘 %@ km",
    'pt-BR': "%@ km hoje",
    ar: "%@ كم اليوم",
    'zh-Hans': "今天 %@ 公里",
  },
  'streak.days': {
    en: "%lld-day streak",
    de: "%lld Tage in Folge",
    es: "Racha de %lld días",
    fr: "Série de %lld jours",
    ja: "%lld日連続",
    ko: "%lld일 연속",
    'zh-Hans': "连续 %lld 天",
  },
  'goal.reached': {
    en: "You reached today’s goal",
    de: "Du hast dein Tagesziel erreicht",
    es: "Alcanzaste tu objetivo de hoy",
    fr: "Objectif du jour atteint",
    ja: "今日の目標を達成しました",
    ko: "오늘의 목표를 달성했어요",
    'pt-BR': "Você atingiu a meta de hoje",
    ar: "لقد حققت هدف اليوم",
    'zh-Hans': "你已达成今日目标",
  },
  'premium.upgrade': {
    en: "Upgrade to Premium",
    de: "Auf Premium upgraden",
    es: "Mejorar a Premium",
    fr: "Passer à Premium",
    ja: "プレミアムにアップグレード",
    ko: "프리미엄으로 업그레이드",
    'pt-BR': "Assinar o Premium",
    ar: "الترقية إلى بريميوم",
    'zh-Hans': "升级到高级版",
  },
  'premium.trial': {
    en: "Start your 7-day free trial",
    de: "Starte deine 7-tägige Gratisprobe",
    es: "Empieza tu prueba gratuita de 7 días",
    fr: "Commencez votre essai gratuit de 7 jours",
    ja: "7日間の無料トライアルを開始",
    'pt-BR': "Comece seu teste grátis de 7 dias",
  },
  'settings.reminders': {
    en: "Workout reminders",
    de: "Trainingserinnerungen",
    es: "Recordatorios de entrenamiento",
    ja: "ワークアウトのリマインダー",
    ko: "운동 알림",
    'zh-Hans': "锻炼提醒",
  },
  'settings.units': {
    en: "Units",
    de: "Einheiten",
    es: "Unidades",
    fr: "Unités",
    ja: "単位",
    ko: "단위",
    'pt-BR': "Unidades",
    ar: "الوحدات",
  },
  'history.empty': {
    en: "No workouts yet",
    de: "Noch keine Trainings",
    es: "Aún no hay entrenamientos",
    fr: "Aucun entraînement pour l’instant",
    ja: "まだワークアウトがありません",
    ko: "아직 운동 기록이 없어요",
    'pt-BR': "Nenhum treino ainda",
    'zh-Hans': "还没有锻炼记录",
  },
  'share.summary': {
    en: "Share summary",
    de: "Zusammenfassung teilen",
    es: "Compartir resumen",
    fr: "Partager le résumé",
    ja: "概要を共有",
    'pt-BR': "Compartilhar resumo",
    ar: "مشاركة الملخص",
  },
  'health.heartRate': {
    en: "Heart rate",
    de: "Herzfrequenz",
    es: "Frecuencia cardíaca",
    fr: "Fréquence cardiaque",
    ko: "심박수",
    'pt-BR': "Frequência cardíaca",
    'zh-Hans': "心率",
  },
  'paywall.restore': {
    en: "Restore purchases",
    de: "Käufe wiederherstellen",
    es: "Restaurar compras",
    fr: "Restaurer les achats",
    ja: "購入を復元",
    ko: "구매 복원",
    ar: "استعادة المشتريات",
    'zh-Hans': "恢复购买",
  },
}

const DEMO_XCSTRINGS = {
  sourceLanguage: 'en',
  version: '1.0',
  strings: Object.fromEntries(Object.entries(DEMO_STRINGS).map(([key, locs]) => [key, {
    localizations: Object.fromEntries(Object.entries(locs).map(([lang, value]) => [lang, { stringUnit: { state: 'translated', value } }])),
  }])),
}

// Phone-shaped demo app screen rendered as HTML, screenshotted, then fed to the Screenshots tab
const PHONE_MOCK_HTML = `data:text/html,<html><body style="margin:0;width:660px;height:1434px;font-family:-apple-system,sans-serif;background:%23101114;color:%23f2f2f2;overflow:hidden">
<div style="padding:110px 44px 0">
<div style="font-size:28px;color:%238e8e93">Tuesday, March 4</div>
<div style="font-size:54px;font-weight:600;margin-top:8px;letter-spacing:-1px">Today</div>
<div style="margin-top:44px;background:%231c1c1f;border-radius:36px;padding:44px">
<div style="font-size:26px;color:%238e8e93">Calories burned</div>
<div style="font-size:76px;font-weight:600;margin-top:6px;font-variant-numeric:tabular-nums">486<span style="font-size:32px;color:%238e8e93;font-weight:400"> / 750</span></div>
<div style="height:12px;background:%232c2c30;border-radius:6px;margin-top:24px"><div style="width:64%25;height:100%25;background:%23ffb547;border-radius:6px"></div></div>
</div>
<div style="display:flex;gap:24px;margin-top:24px">
<div style="flex:1;background:%231c1c1f;border-radius:36px;padding:38px"><div style="font-size:24px;color:%238e8e93">Steps</div><div style="font-size:54px;font-weight:600;margin-top:6px">9,214</div></div>
<div style="flex:1;background:%231c1c1f;border-radius:36px;padding:38px"><div style="font-size:24px;color:%238e8e93">Streak</div><div style="font-size:54px;font-weight:600;margin-top:6px">12 days</div></div>
</div>
<div style="margin-top:24px;background:%23f2f2f2;color:%23101114;border-radius:36px;padding:40px;text-align:center;font-size:34px;font-weight:600">Start workout</div>
</div></body></html>`

async function preparePage(browser, { page: appPage, theme = 'dark' }) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 })
  await page.evaluateOnNewDocument((activePage, themeValue, provider) => {
    sessionStorage.setItem('xcstrings-localizer-welcome-shown', 'true')
    localStorage.setItem('localizer-theme', themeValue)
    localStorage.setItem('xcstrings-localizer-active-page', activePage)
    localStorage.setItem('xcstrings-localizer-provider-config', provider)
  }, appPage, theme, DEMO_PROVIDER)
  await page.goto(APP_URL, { waitUntil: 'networkidle2' })
  await sleep(1200)
  return page
}

// Toasts from auto-connect and file loads would cover the top right corner
async function hideToasts(page) {
  await page.evaluate(() => document.querySelectorAll('[data-sonner-toaster]').forEach((n) => { n.style.display = 'none' }))
}

async function shoot(page, name) {
  await hideToasts(page)
  const path = join(OUT, `${name}.png`)
  await page.screenshot({ path })
  console.log(`✓ ${name}.png`)
  await page.close()
}

// Screenshot clipped around an element (dialog, card, canvas) with padding,
// so the README shows the feature — not the whole page.
async function clipShot(page, selector, name, pad = 36) {
  await hideToasts(page)
  const el = await page.$(selector)
  if (!el) { console.warn(`✗ ${name}: selector not found (${selector})`); await page.close(); return }
  const box = await el.boundingBox()
  if (!box) { console.warn(`✗ ${name}: element not visible (${selector})`); await page.close(); return }
  const vp = page.viewport()
  const clip = {
    x: Math.max(0, box.x - pad),
    y: Math.max(0, box.y - pad),
    width: Math.min(vp.width - Math.max(0, box.x - pad), box.width + pad * 2),
    height: Math.min(vp.height - Math.max(0, box.y - pad), box.height + pad * 2),
  }
  await page.screenshot({ path: join(OUT, `${name}.png`), clip })
  console.log(`✓ ${name}.png (feature crop)`)
  await page.close()
}

// The default background is a violet preset; the README shots use the warm peach one
async function pickWarmBackground(page) {
  const swatches = await page.$$('.preset-grid .preset-swatch')
  if (swatches[13]) { await swatches[13].click(); await sleep(800) }
}

// Open a dev-only demo scenario (?demo=…) and capture its dialog
async function demoShot(browser, scenario, name) {
  const page = await browser.newPage()
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 })
  await page.evaluateOnNewDocument((provider) => {
    sessionStorage.setItem('xcstrings-localizer-welcome-shown', 'true')
    localStorage.setItem('localizer-theme', 'dark')
    localStorage.setItem('xcstrings-localizer-provider-config', provider)
  }, DEMO_PROVIDER)
  await page.goto(`${APP_URL}/?demo=${scenario}`, { waitUntil: 'networkidle2' })
  await sleep(1500)
  await clipShot(page, '[role="dialog"]', name)
}

// ─── App Store Connect mock ─────────────────────────────────────────────────
// The README shows the connected App Store page, so every /api/appstoreconnect
// call is answered locally with a demo app; nothing reaches Apple.

const ASC_DEMO_LOCALES = {
  'en-US': {
    name: 'FitTrack: Workout Log', subtitle: 'Strength, runs and streaks',
    promotionalText: 'New in 2.4: plan a full week of workouts and get a reminder when it is time to train.',
    whatsNew: 'Weekly plans are here. Pick your training days and FitTrack reminds you before each session.\n\nAlso: faster sync with Apple Health and a fix for the streak counter.',
    keywords: 'workout,gym,strength,running,habit,streak,fitness log,training plan',
    description: 'FitTrack keeps every workout in one log: sets, runs, rest days and the streak that keeps you going.',
  },
  'fr-FR': {
    name: 'FitTrack : Journal sportif', subtitle: 'Muscu, course et séries',
    promotionalText: 'Nouveau dans la 2.4 : planifiez une semaine d’entraînement et recevez un rappel au bon moment.',
    whatsNew: 'Les plans hebdomadaires arrivent. Choisissez vos jours d’entraînement et FitTrack vous prévient avant chaque séance.\n\nAussi : synchronisation plus rapide avec Santé et correction du compteur de série.',
    keywords: 'musculation,salle,course,habitude,série,journal sportif,programme,entraînement',
    description: 'FitTrack réunit chaque séance dans un seul journal : séries, courses, jours de repos et la série qui vous motive.',
  },
  'de-DE': {
    name: 'FitTrack: Trainingslog', subtitle: 'Kraft, Läufe und Serien',
    promotionalText: 'Neu in 2.4: Plane eine ganze Trainingswoche und lass dich rechtzeitig erinnern.',
    whatsNew: 'Wochenpläne sind da. Wähle deine Trainingstage und FitTrack erinnert dich vor jeder Einheit.\n\nAußerdem: schnellere Synchronisierung mit Apple Health und ein Fix für den Serienzähler.',
    keywords: 'training,fitnessstudio,kraft,laufen,gewohnheit,serie,trainingsplan',
    description: 'FitTrack hält jedes Training in einem Log fest: Sätze, Läufe, Ruhetage und die Serie, die dich motiviert.',
  },
  ja: {
    name: 'FitTrack：トレーニング記録', subtitle: '筋トレ、ラン、連続記録',
    promotionalText: '2.4の新機能：1週間分のトレーニングを計画し、時間になったらリマインダーを受け取れます。',
    whatsNew: '',
    keywords: 'ワークアウト,ジム,筋トレ,ランニング,習慣,連続記録,トレーニング',
    description: 'FitTrackはすべてのワークアウトをひとつの記録にまとめます。',
  },
  'es-ES': {
    name: 'FitTrack: Diario de entreno', subtitle: 'Fuerza, carreras y rachas',
    promotionalText: 'Novedad en la 2.4: planifica una semana de entrenamientos y recibe un aviso a tiempo.',
    whatsNew: 'Llegan los planes semanales. Elige tus días de entrenamiento y FitTrack te avisa antes de cada sesión.',
    keywords: 'entrenamiento,gimnasio,fuerza,correr,hábito,racha,plan',
    description: 'FitTrack guarda cada entrenamiento en un solo diario.',
  },
  'pt-BR': {
    name: 'FitTrack: Diário de treino', subtitle: 'Força, corridas e sequências',
    promotionalText: '', whatsNew: '', keywords: 'treino,academia,força,corrida,hábito',
    description: 'O FitTrack reúne cada treino em um só diário.',
  },
  ko: {
    name: 'FitTrack: 운동 기록', subtitle: '근력, 러닝, 연속 기록',
    promotionalText: '', whatsNew: '', keywords: '운동,헬스,근력,러닝,습관',
    description: 'FitTrack은 모든 운동을 하나의 기록으로 모아 줍니다.',
  },
}

function ascMockResponse(url) {
  const path = new URL(url).pathname.replace(/^.*\/api\/appstoreconnect/, '')
  const list = (data) => ({ data, links: {}, meta: { paging: { total: data.length, limit: 200 } } })
  if (/^\/v1\/apps$/.test(path)) {
    return list([
      { type: 'apps', id: '6448120371', attributes: { name: 'FitTrack: Workout Log', bundleId: 'com.example.fittrack' } },
      { type: 'apps', id: '6451934410', attributes: { name: 'ChillTrip', bundleId: 'com.example.chilltrip' } },
    ])
  }
  if (/\/appStoreVersions$/.test(path)) {
    return list([
      { type: 'appStoreVersions', id: 'v240', attributes: { versionString: '2.4', appVersionState: 'PREPARE_FOR_SUBMISSION', platform: 'IOS', createdDate: '2026-10-28T09:12:00Z' } },
      { type: 'appStoreVersions', id: 'v231', attributes: { versionString: '2.3.1', appVersionState: 'READY_FOR_SALE', platform: 'IOS', createdDate: '2026-09-30T15:40:00Z' } },
    ])
  }
  if (/\/appStoreVersionLocalizations$/.test(path)) {
    return list(Object.entries(ASC_DEMO_LOCALES).map(([locale, l]) => ({
      type: 'appStoreVersionLocalizations', id: `loc-${locale}`,
      attributes: { locale, description: l.description, keywords: l.keywords, promotionalText: l.promotionalText, whatsNew: l.whatsNew, marketingUrl: '', supportUrl: 'https://example.com/support' },
    })))
  }
  if (/\/appInfos$/.test(path)) {
    return list([{ type: 'appInfos', id: 'info-1', attributes: { appStoreState: 'PREPARE_FOR_SUBMISSION' } }])
  }
  if (/\/appInfoLocalizations$/.test(path)) {
    return list(Object.entries(ASC_DEMO_LOCALES).map(([locale, l]) => ({
      type: 'appInfoLocalizations', id: `info-${locale}`,
      attributes: { locale, name: l.name, subtitle: l.subtitle, privacyPolicyUrl: 'https://example.com/privacy', privacyPolicyText: '' },
    })))
  }
  return list([])
}

async function prepareConnectedAscPage(browser, activePage = 'appstore') {
  const page = await browser.newPage()
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 })
  await page.setRequestInterception(true)
  page.on('request', (req) => {
    const url = req.url()
    if (url.includes('/api/appstoreconnect/')) {
      return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(ascMockResponse(url)) })
    }
    if (url.includes('/api/itunes/')) {
      return req.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ resultCount: 0, results: [] }) })
    }
    return req.continue()
  })
  await page.evaluateOnNewDocument((provider, pageId) => {
    sessionStorage.setItem('xcstrings-localizer-welcome-shown', 'true')
    localStorage.setItem('localizer-theme', 'dark')
    localStorage.setItem('xcstrings-localizer-active-page', pageId)
    localStorage.setItem('xcstrings-localizer-provider-config', provider)
    localStorage.setItem('asc-localizer-config', JSON.stringify({ keyId: 'DEMO4KEY42', issuerId: 'demo-issuer' }))
    sessionStorage.setItem('asc-token-cache', JSON.stringify({ token: 'demo', expiry: Date.now() + 15 * 60 * 1000, credHash: 'DEMO4KEY42:demo-issuer' }))
    sessionStorage.setItem('asc-selected-app', JSON.stringify({ id: '6448120371' }))
    sessionStorage.setItem('asc-selected-version', JSON.stringify({ id: 'v240' }))
  }, DEMO_PROVIDER, activePage)
  await page.goto(APP_URL, { waitUntil: 'networkidle2' })
  await sleep(2500)
  return page
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: 'new',
  args: ['--no-first-run', '--hide-scrollbars', '--force-device-scale-factor=2'],
})

try {
  // --- 0. Render the phone mock used by the Screenshots tab ---
  const mock = await browser.newPage()
  await mock.setViewport({ width: 660, height: 1434, deviceScaleFactor: 1 })
  await mock.goto(PHONE_MOCK_HTML)
  await sleep(300)
  const mockDir = join(tmpdir(), 'storelocalizer-screenshots')
  mkdirSync(mockDir, { recursive: true })
  const mockPath = join(mockDir, 'Today.png')
  await mock.screenshot({ path: mockPath })
  await mock.close()

  // Demo catalog on disk for the file input, named like the real Xcode file
  const xcDir = join(tmpdir(), 'storelocalizer-screenshots')
  mkdirSync(xcDir, { recursive: true })
  const xcPath = join(xcDir, 'Localizable.xcstrings')
  writeFileSync(xcPath, JSON.stringify(DEMO_XCSTRINGS, null, 2))

  // --- 1. Landing page (welcome) ---
  {
    const page = await browser.newPage()
    await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 2 })
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('localizer-theme', 'dark')
      sessionStorage.removeItem('xcstrings-localizer-welcome-shown')
    })
    await page.goto(APP_URL, { waitUntil: 'networkidle2' })
    await sleep(1200)
    await shoot(page, 'landing')
  }

  // --- 1b. Home, with an App Store Connect session ---
  {
    const page = await prepareConnectedAscPage(browser, 'home')
    await shoot(page, 'home')
  }

  // --- 2. XCStrings translator with the demo file loaded ---
  {
    const page = await preparePage(browser, { page: 'xcstrings' })
    const input = await page.$('input[accept=".xcstrings"]')
    if (input) {
      await input.uploadFile(xcPath)
      await sleep(1500)
      // Switch to the Editor tab to show the populated translation matrix
      await page.click('[role="tab"]:nth-child(2)')
      await sleep(1200)
    }
    await shoot(page, 'xcstrings-editor')
  }

  // --- 3. Screenshots studio with a demo phone screenshot ---
  {
    const page = await preparePage(browser, { page: 'screenshots' })
    const fileInputs = await page.$$('input[type="file"]')
    for (const fi of fileInputs) {
      const accept = await fi.evaluate((el) => el.accept)
      if (accept?.includes('image')) { await fi.uploadFile(mockPath); break }
    }
    await sleep(2500)
    await pickWarmBackground(page)
    await shoot(page, 'screenshot-studio')
  }

  // --- 4. App Store Connect page, connected to the mocked demo app ---
  {
    const page = await prepareConnectedAscPage(browser)
    await shoot(page, 'app-store-connect')
  }

  // --- 5. Subscriptions pricing page (GDP Pricing tab is the showcase) ---
  {
    const page = await preparePage(browser, { page: 'subscriptions' })
    const tabs = await page.$$('button')
    for (const t of tabs) {
      const txt = await t.evaluate((el) => el.textContent)
      if (/GDP Pricing/i.test(txt)) { await t.click(); break }
    }
    await sleep(1500)
    await shoot(page, 'subscriptions')
  }

  // =====================================================================
  // Feature shots — dialogs and components in action, cropped tight
  // =====================================================================

  // --- 6. AppCompete keyword suggestions dialog ---
  await demoShot(browser, 'suggestions', 'feature-keyword-suggestions')

  // --- 7. Keyword review verdicts dialog ---
  await demoShot(browser, 'review', 'feature-keyword-review')

  // --- 8. Competitor picker dialog ---
  await demoShot(browser, 'competitors', 'feature-competitors')

  // --- 9. XCStrings translation edit dialog (real flow: load file, click a translation) ---
  {
    const page = await preparePage(browser, { page: 'xcstrings' })
    const input = await page.$('input[accept=".xcstrings"]')
    await input.uploadFile(xcPath)
    await sleep(1500)
    await page.click('[role="tab"]:nth-child(2)')
    await sleep(1000)
    // Click the first filled translation badge to open the edit dialog
    const badges = await page.$$('table button[title]')
    for (const b of badges) {
      const title = await b.evaluate((el) => el.title)
      if (title && title !== 'Add a translation') { await b.click(); break }
    }
    await sleep(900)
    await clipShot(page, '[role="dialog"]', 'feature-edit-translation')
  }

  // --- 10. Screenshot studio canvas close-up ---
  {
    const page = await preparePage(browser, { page: 'screenshots' })
    for (const fi of await page.$$('input[type="file"]')) {
      const accept = await fi.evaluate((el) => el.accept)
      if (accept?.includes('image')) { await fi.uploadFile(mockPath); break }
    }
    await sleep(2500)
    await pickWarmBackground(page)
    // Several canvases exist (hidden Three.js renderer included) — crop the largest visible one
    const target = await page.evaluateHandle(() => {
      let best = null, bestArea = 0
      for (const c of document.querySelectorAll('canvas')) {
        const r = c.getBoundingClientRect()
        if (r.width * r.height > bestArea && r.width > 0) { best = c; bestArea = r.width * r.height }
      }
      return best
    })
    const el = target.asElement()
    const box = el && (await el.boundingBox())
    if (box) {
      const pad = 60
      await page.screenshot({
        path: join(OUT, 'feature-canvas.png'),
        clip: {
          x: Math.max(0, box.x - pad), y: Math.max(0, box.y - pad),
          width: box.width + pad * 2, height: Math.min(1000 - Math.max(0, box.y - pad), box.height + pad * 2),
        },
      })
      console.log('✓ feature-canvas.png (feature crop)')
    }
    await page.close()
  }

  // --- 11. GDP pricing chart card close-up ---
  {
    const page = await preparePage(browser, { page: 'subscriptions' })
    for (const t of await page.$$('button')) {
      const txt = await t.evaluate((el) => el.textContent)
      if (/GDP Pricing/i.test(txt)) { await t.click(); break }
    }
    await sleep(1500)
    const card = await page.evaluateHandle(() => {
      const headers = Array.from(document.querySelectorAll('div'))
      const el = headers.find((d) => /^Recommended prices by country/i.test(d.textContent) && d.querySelector('svg'))
      return el?.closest('[data-slot="card"], .rounded-xl, .border') || el
    })
    const box = card.asElement() && (await card.asElement().boundingBox())
    if (box) {
      await page.screenshot({
        path: join(OUT, 'feature-gdp-chart.png'),
        clip: { x: Math.max(0, box.x - 10), y: Math.max(0, box.y - 10), width: box.width + 20, height: Math.min(1000 - box.y, box.height + 20) },
      })
      console.log('✓ feature-gdp-chart.png (feature crop)')
    }
    await page.close()
  }
} finally {
  await browser.close()
}

console.log('Done.')
