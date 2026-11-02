import { ArrowRight, Image, Bot, DollarSign, Languages } from 'lucide-react'
import { AppStoreIcon, GooglePlayIcon } from '@/components/StoreIcons'
import { Button } from '@/components/ui/button'
import { hasValidToken } from '@/services/appStoreConnectService'
import { TOOL_CAPABLE_PROVIDERS } from '@/services/agentService'
import { PROVIDERS } from '@/services/translationService'

// The App Store page groups its cards in tabs and remembers the last one,
// so a deep link only has to preselect the tab before switching page
const ASC_TAB_KEY = 'asc-localizer-active-tab'

const ASC_SECTIONS = [
  { tab: 'listing', title: 'Listing', items: 'Name, subtitle, description, keywords, What’s New' },
  { tab: 'media', title: 'Media', items: 'Screenshots, app previews, Asset Library' },
  { tab: 'growth', title: 'Growth', items: 'In-App Events, Custom Product Pages, A/B tests' },
  { tab: 'builds', title: 'Builds', items: 'Drop an .ipa, it goes to TestFlight' },
]

const GP_SECTIONS = [
  { id: 'gp-listings', title: 'Listings', items: 'Title and descriptions' },
  { id: 'gp-images', title: 'Images', items: 'Screenshots per language' },
  { id: 'gp-translation', title: 'Translation', items: 'Every locale in one run' },
]

const AGENT_PROMPTS = [
  'List my App Store Connect apps',
  'Translate the What’s New of my latest version to French and German, then update those locales',
  'Review my French screenshots and tell me what to fix',
]

function Status({ ready, children }) {
  return (
    <span className={`flex items-center gap-2 text-sm ${ready ? 'text-positive' : 'text-muted-foreground'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${ready ? 'bg-positive' : 'bg-highlight'}`} />
      {children}
    </span>
  )
}

function Panel({ icon: Icon, title, status, children, action, className = '' }) {
  return (
    <section className={`flex flex-col rounded-xl border border-border bg-card ${className}`}>
      <div className="flex items-start justify-between gap-4 px-6 pt-6">
        <div className="space-y-2">
          <h2 className="flex items-center gap-2.5 text-base font-medium">
            <Icon className="h-4 w-4 text-faint" />
            {title}
          </h2>
          {status}
        </div>
        {action}
      </div>
      <div className="flex-1 px-6 pb-6 pt-5">{children}</div>
    </section>
  )
}

function SectionRow({ title, items, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full items-center gap-4 border-t border-border py-3 text-left first:border-t-0 first:pt-0"
    >
      <span className="w-24 shrink-0 text-sm">{title}</span>
      <span className="flex-1 truncate text-sm text-muted-foreground">{items}</span>
      <ArrowRight className="h-4 w-4 text-faint transition-transform duration-150 ease-out group-hover:translate-x-0.5 group-hover:text-foreground" />
    </button>
  )
}

export function HomePage({ onPageChange, ascCredentials, gpCredentials, providerConfig }) {
  const ascSession = hasValidToken(ascCredentials.keyId, ascCredentials.issuerId)
  const ascKeyStored = !!(ascCredentials.privateKey || localStorage.getItem('asc-encrypted-p8-key'))
  const ascReady = !!(ascCredentials.keyId && ascCredentials.issuerId && (ascSession || ascKeyStored))

  const gpLoaded = !!gpCredentials?.serviceAccountJson
  const gpStored = !!localStorage.getItem('gp-encrypted-service-account')

  const agentProvider = TOOL_CAPABLE_PROVIDERS.find((id) => providerConfig.apiKeys?.[id])
  const agentProviderName = PROVIDERS[agentProvider]?.name

  const openAsc = (tab) => {
    if (tab) {
      try { localStorage.setItem(ASC_TAB_KEY, tab) } catch { /* storage unavailable */ }
    }
    onPageChange('appstore')
  }

  const openGp = (id) => {
    onPageChange('googleplay')
    if (id) setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' }), 300)
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-[28px] leading-9 font-medium tracking-[-0.01em]">Your stores</h1>
        <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
          Translate and publish your App Store and Google Play pages, make localized screenshots, or hand the repetitive parts to the agent.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Panel
          icon={AppStoreIcon}
          title="App Store Connect"
          status={
            <Status ready={ascReady}>
              {ascSession ? 'Session active' : ascReady ? 'Key saved, ready to connect' : 'Add your API key in the sidebar'}
            </Status>
          }
          action={<Button onClick={() => openAsc()}>Open</Button>}
        >
          {ASC_SECTIONS.map((s) => (
            <SectionRow key={s.tab} title={s.title} items={s.items} onClick={() => openAsc(s.tab)} />
          ))}
        </Panel>

        <Panel
          icon={GooglePlayIcon}
          title="Google Play"
          status={
            <Status ready={gpLoaded}>
              {gpLoaded ? 'Service account loaded' : gpStored ? 'Saved, unlock it in the sidebar' : 'Add a service account in the sidebar'}
            </Status>
          }
          action={<Button variant="outline" onClick={() => openGp()}>Open</Button>}
        >
          {GP_SECTIONS.map((s) => (
            <SectionRow key={s.id} title={s.title} items={s.items} onClick={() => openGp(s.id)} />
          ))}
        </Panel>

        <Panel
          icon={Bot}
          title="Agent"
          status={
            <Status ready={!!agentProvider}>
              {agentProvider ? `Ready with ${agentProviderName}` : 'Needs a key from a provider with function calling'}
            </Status>
          }
          action={<Button variant="outline" onClick={() => onPageChange('agent')}>Open</Button>}
        >
          <p className="mb-4 text-sm leading-6 text-muted-foreground">
            Ask in plain words. It reads and updates your store metadata through 24 tools and asks before every write.
          </p>
          <ul className="space-y-2">
            {AGENT_PROMPTS.map((prompt) => (
              <li key={prompt}>
                <button
                  onClick={() => onPageChange('agent')}
                  className="flex w-full items-center gap-3 rounded-lg border border-border px-3 py-2.5 text-left text-sm text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                >
                  <span className="font-mono text-xs text-faint">›</span>
                  <span className="truncate">{prompt}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          icon={Image}
          title="Screenshots"
          status={<span className="text-sm text-muted-foreground">Device frames and headlines in every language</span>}
          action={<Button variant="outline" onClick={() => onPageChange('screenshots')}>Open</Button>}
        >
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <div>
              <dt className="text-xs text-faint">Frames</dt>
              <dd className="mt-1">2D and 3D</dd>
            </div>
            <div>
              <dt className="text-xs text-faint">Headlines</dt>
              <dd className="mt-1">Written and translated</dd>
            </div>
            <div>
              <dt className="text-xs text-faint">Sizes</dt>
              <dd className="mt-1 flex flex-wrap gap-1">
                <span className="keycap">6.9″</span>
                <span className="keycap">6.5″</span>
                <span className="keycap">iPad</span>
                <span className="keycap">Play</span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-faint">Export</dt>
              <dd className="mt-1">One ZIP per store size</dd>
            </div>
          </dl>
        </Panel>
      </div>

      <section className="border-t border-border pt-6">
        <h2 className="text-xs text-faint">More tools</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => onPageChange('subscriptions')}
            className="flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
          >
            <DollarSign className="h-4 w-4 text-faint" />
            Subscription pricing
          </button>
          <button
            onClick={() => onPageChange('xcstrings')}
            className="flex h-9 items-center gap-2 rounded-lg border border-border px-3 text-sm text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
          >
            <Languages className="h-4 w-4 text-faint" />
            String catalogs <span className="font-mono text-xs text-faint">.xcstrings</span>
          </button>
        </div>
      </section>
    </div>
  )
}
