import { useState, useEffect, useCallback } from 'react'
import { Languages, Search, DollarSign, Image, Bot, ShieldCheck, Copy, Check, ArrowRight } from 'lucide-react'
import { LogoMark } from '@/components/LogoMark'
import { AppStoreIcon, GooglePlayIcon } from '@/components/StoreIcons'

// ─── Data ────────────────────────────────────────────────────────────────────

// One App Store subtitle, written for each storefront within Apple's 30 characters
const SUBTITLE_LIMIT = 30
const SPECIMEN = [
  { code: 'en-US', text: 'Strength, runs and streaks', source: true },
  { code: 'fr-FR', text: 'Muscu, course et séries' },
  { code: 'ja', text: '筋トレ、ラン、連続記録', marked: true },
  { code: 'ar-SA', text: 'القوة والجري والاستمرار', rtl: true },
  { code: 'hi', text: 'स्ट्रेंथ, रन और स्ट्रीक' },
  { code: 'ko', text: '근력, 러닝, 연속 기록' },
  { code: 'pt-BR', text: 'Força, corridas e sequências' },
]

const PREVIEW_ROWS = [
  { flag: '🇺🇸', name: 'English (US)', code: 'en-US', subtitle: 'Strength, runs and streaks', whatsNew: 'Weekly plans are here. Pick your training days and FitTrack reminds you before each session.' },
  { flag: '🇫🇷', name: 'French', code: 'fr-FR', subtitle: 'Muscu, course et séries', whatsNew: 'Les plans hebdomadaires arrivent. Choisissez vos jours et FitTrack vous prévient avant chaque séance.' },
  { flag: '🇯🇵', name: 'Japanese', code: 'ja', subtitle: '筋トレ、ラン、連続記録', whatsNew: null },
  { flag: '🇧🇷', name: 'Portuguese (BR)', code: 'pt-BR', subtitle: 'Força, corridas e sequências', whatsNew: null },
]

const FEATURES = [
  { icon: AppStoreIcon, title: 'App Store Connect and Google Play', desc: 'Name, subtitle, description, keywords and What’s New for every locale, translated with the AI provider you choose and pushed through the official APIs.' },
  { icon: Image, title: 'Localized screenshots', desc: '2D and 3D device frames with a headline in every language, placed per locale from the Asset Library or exported as one ZIP per store size.' },
  { icon: Bot, title: 'An agent for the busywork', desc: 'Ask in plain words to list your apps, audit localizations, translate What’s New or review your screenshots. It asks before every write.' },
  { icon: Search, title: 'ASO keywords', desc: 'Keyword ideas per locale that fit Apple’s 100 characters, with popularity and difficulty scores once you connect AppCompete.' },
  { icon: DollarSign, title: 'Subscription pricing', desc: 'A price for each of 175 storefronts from your US base price, adjusted to local purchasing power, then sent to App Store Connect.' },
  { icon: Languages, title: 'String catalogs too', desc: 'Drop a Localizable.xcstrings file and get it back with every missing string filled, format specifiers and brand words untouched.' },
  { icon: ShieldCheck, title: 'Keys stay in your browser', desc: 'API keys and your .p8 key never leave the page. Saved keys are encrypted with your password and tokens are signed client side.' },
]

const QUICK_START = 'git clone https://github.com/fayharinn/StoreLocalizer.git\ncd StoreLocalizer && npm install\nnpm run dev'

const GITHUB_URL = 'https://github.com/fayharinn/StoreLocalizer'

function GitHubIcon({ className }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" /></svg>
  )
}

// ─── Specimen: one App Store subtitle in seven storefronts ────────────────────

function Specimen() {
  return (
    <figure className="w-full">
      <ul className="divide-y divide-border border-y border-border">
        {SPECIMEN.map(({ code, text, source, marked, rtl }) => (
          <li key={code} className="grid h-16 grid-cols-[64px_1fr_auto] items-center gap-4 md:h-[72px]">
            <span className="keycap w-fit">{code}</span>
            <span
              dir={rtl ? 'rtl' : undefined}
              lang={code}
              className={`truncate text-[22px] leading-none md:text-[28px] ${rtl ? 'text-left' : ''} ${source ? 'text-faint' : 'text-foreground'}`}
            >
              {marked ? (
                <mark className="rounded-[3px] bg-highlight px-1.5 py-0.5 text-highlight-foreground [box-decoration-break:clone]">{text}</mark>
              ) : text}
            </span>
            <span className="font-mono text-xs tabular-nums text-faint">{[...text].length}/{SUBTITLE_LIMIT}</span>
          </li>
        ))}
      </ul>
      <figcaption className="mt-3 flex items-center justify-between font-mono text-xs text-faint">
        <span>App Store subtitle</span>
        <span>7 storefronts</span>
      </figcaption>
    </figure>
  )
}

// ─── Product view: an App Store listing across locales ───────────────────────

function ListingPreview() {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-[0_24px_64px_rgba(0,0,0,0.35)]">
      <div className="flex h-11 items-center gap-3 border-b border-border px-4">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
          <span className="h-2.5 w-2.5 rounded-full bg-foreground/15" />
        </span>
        <span className="text-xs text-muted-foreground">FitTrack: Workout Log <span className="text-faint">· version 2.4</span></span>
        <span className="ml-auto hidden items-center gap-4 text-xs text-faint sm:flex">
          <span className="flex items-center gap-1.5"><span className="h-1.5 w-1.5 rounded-full bg-positive" /><AppStoreIcon className="h-3.5 w-3.5" />App Store Connect</span>
          <span><span className="tabular-nums text-foreground">12</span> locales</span>
          <span><span className="tabular-nums text-highlight-ink">2</span> to translate</span>
        </span>
      </div>
      <div className="grid grid-cols-[220px_260px_1fr] border-b border-border px-4 py-2.5 text-xs text-faint max-md:grid-cols-[1fr]">
        <span>Locale</span>
        <span className="max-md:hidden">Subtitle</span>
        <span className="max-md:hidden">What’s New</span>
      </div>
      {PREVIEW_ROWS.map((row) => (
        <div key={row.code} className="grid grid-cols-[220px_260px_1fr] items-center gap-y-1 border-b border-border px-4 py-3 last:border-b-0 max-md:grid-cols-[1fr]">
          <span className="flex items-center gap-2 text-sm">
            <span className="text-base leading-none">{row.flag}</span>
            {row.name}
            <span className="keycap">{row.code}</span>
          </span>
          <span className="truncate pr-6 text-sm text-muted-foreground">{row.subtitle}</span>
          {row.whatsNew ? (
            <span className="truncate text-sm text-muted-foreground max-md:hidden">{row.whatsNew}</span>
          ) : (
            <span className="flex h-8 w-fit items-center rounded-md border border-dashed border-foreground/15 px-2.5 text-[13px] text-faint max-md:hidden">
              Empty, translate from en-US
            </span>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function WelcomeScreen({ onComplete }) {
  const [exiting, setExiting] = useState(false)
  const [copied, setCopied] = useState(false)

  const handleStart = useCallback(() => {
    setExiting(true)
    setTimeout(onComplete, 300)
  }, [onComplete])

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Enter') handleStart() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [handleStart])

  const handleCopy = () => {
    navigator.clipboard.writeText(QUICK_START.replace(/\n/g, ' && '))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] overflow-x-hidden overflow-y-auto bg-background text-foreground transition-opacity duration-300 ease-out ${exiting ? 'opacity-0' : 'opacity-100'}`}
    >
      <div className="mx-auto max-w-[1200px] px-4 sm:px-6 lg:px-10">

        {/* ═══ HERO ═══ */}
        <section className="welcome-enter flex min-h-[calc(100svh-160px)] flex-col">
          <div className="flex h-16 items-center justify-between">
            <span className="flex items-center gap-3">
              <LogoMark className="h-7 w-7" />
              <span className="text-[15px] font-medium">StoreLocalizer</span>
            </span>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <GitHubIcon className="h-4 w-4" />
              <span className="max-sm:hidden">Source on GitHub</span>
            </a>
          </div>

          <div className="grid flex-1 items-center gap-12 py-12 md:py-16 lg:grid-cols-[1fr_minmax(0,560px)] lg:gap-16">
            <div className="max-w-xl">
              <h1 className="text-balance text-[40px] leading-[1.06] font-medium tracking-[-0.02em] md:text-[60px] md:tracking-[-0.03em]">
                Your App Store and Google Play pages, in every language
              </h1>
              <p className="mt-6 max-w-[36rem] text-lg leading-8 text-muted-foreground">
                StoreLocalizer connects to App Store Connect and the Google Play Console with your own keys, translates your listings with the AI provider you choose, builds screenshots for each locale, and lets an agent handle the repetitive parts.
              </p>
              <div className="mt-10 flex flex-wrap items-center gap-3">
                <button
                  onClick={handleStart}
                  className="inline-flex h-12 items-center gap-2 rounded-lg bg-primary px-5 text-[15px] font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
                >
                  Open StoreLocalizer
                  <ArrowRight className="h-4 w-4" />
                </button>
                <a
                  href={GITHUB_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center gap-2 rounded-lg border border-border px-5 text-[15px] text-foreground hover:bg-secondary"
                >
                  <GitHubIcon className="h-4 w-4" />
                  Star on GitHub
                </a>
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="text-faint">Works with</span>
                <span className="flex items-center gap-2">
                  <AppStoreIcon className="h-4 w-4" />
                  App Store Connect
                </span>
                <span className="flex items-center gap-2">
                  <GooglePlayIcon className="h-4 w-4" />
                  Google Play Console
                </span>
                <span className="text-faint max-md:hidden">Free and open source · press <kbd className="keycap">Enter</kbd> to start</span>
              </div>
            </div>

            <Specimen />
          </div>
        </section>

        {/* Product view rising into the first screen */}
        <div className="welcome-enter [animation-delay:80ms]">
          <ListingPreview />
        </div>

        {/* ═══ QUICK START ═══ */}
        <section className="mx-auto max-w-[720px] pt-32">
          <h2 className="text-2xl font-medium tracking-[-0.01em]">Run it locally</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Or use it at <a href="https://localizer.fayhe.com" target="_blank" rel="noopener noreferrer" className="text-foreground underline decoration-foreground/30 underline-offset-4 hover:decoration-foreground">localizer.fayhe.com</a> with nothing to install.
          </p>
          <div className="mt-6 overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex h-10 items-center justify-between border-b border-border pl-4 pr-2">
              <span className="font-mono text-xs text-faint">Terminal</span>
              <button
                onClick={handleCopy}
                className="flex h-7 items-center gap-1.5 rounded-md px-2 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
              >
                {copied ? <Check className="h-3.5 w-3.5 text-positive" /> : <Copy className="h-3.5 w-3.5" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>
            <pre className="overflow-x-auto px-4 py-4 font-mono text-[13px] leading-6">
              {QUICK_START.split('\n').map((line) => (
                <div key={line}><span className="select-none text-faint">$ </span>{line}</div>
              ))}
            </pre>
          </div>
        </section>

        {/* ═══ WHAT IT DOES ═══ */}
        <section className="pt-32">
          <div className="grid gap-12 lg:grid-cols-[280px_1fr] lg:gap-16">
            <div>
              <h2 className="text-2xl font-medium tracking-[-0.01em]">What it does</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Everything a store release needs before it reaches another country.
              </p>
            </div>
            <ul className="grid gap-x-12 sm:grid-cols-2">
              {FEATURES.map((f) => (
                <li key={f.title} className="border-t border-border py-6">
                  <h3 className="flex items-center gap-2.5 text-[15px] font-medium">
                    <f.icon className="h-4 w-4 text-faint" />
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{f.desc}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ═══ BOTTOM CTA ═══ */}
        <section className="pt-24 pb-16">
          <div className="flex flex-col items-start justify-between gap-8 border-t border-border pt-12 md:flex-row md:items-center">
            <div>
              <h2 className="text-2xl font-medium tracking-[-0.01em]">Connect your first store</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Bring an App Store Connect key or a Google Play service account, and an API key from the AI provider you already use.
              </p>
            </div>
            <button
              onClick={handleStart}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-sm font-medium text-primary-foreground hover:bg-primary/90 active:scale-[0.98] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]"
            >
              Open StoreLocalizer
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-16 flex flex-wrap items-center gap-6 text-sm text-faint">
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:text-foreground">
              <GitHubIcon className="h-4 w-4" />
              Source on GitHub
            </a>
            <a href="https://x.com/fayhecode" target="_blank" rel="noopener noreferrer" className="hover:text-foreground">
              @fayhecode
            </a>
          </div>
        </section>
      </div>

      <style>{`
        @keyframes welcome-rise {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: none; }
        }
        .welcome-enter { animation: welcome-rise 400ms cubic-bezier(0.22, 1, 0.36, 1) both; }
        @media (prefers-reduced-motion: reduce) { .welcome-enter { animation: none; } }
      `}</style>
    </div>
  )
}
