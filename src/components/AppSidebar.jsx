import { useState, useEffect, useMemo } from 'react'
import { ChevronDown, Cpu, ExternalLink, Languages, CheckCircle2, AlertCircle, Link2, AppWindow, Layers, TrendingUp, Terminal, Image, Images, Library, CalendarRange, PanelsTopLeft, FlaskConical, Moon, Sun, Monitor, DollarSign, Loader2, Search, Bot, House, Package } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { LogoMark } from './LogoMark'
import { AppStoreAccounts, GooglePlayAccounts } from './AccountSections'
import { AppStoreIcon, GooglePlayIcon } from './StoreIcons'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import { PROVIDERS, fetchOpenAIModels } from '@/services/translationService'

// Brand accent shown as a dot next to each AI provider in the selector
const PROVIDER_COLORS = {
  openai: '#10a37f',
  anthropic: '#d97757',
  google: '#4285f4',
  azure: '#0078d4',
  bedrock: '#ff9900',
  github: '#8b5cf6',
  deepseek: '#4d6bfe',
  xai: '#71717a',
  mistral: '#fa520f',
  openrouter: '#6467f2',
  cloudflare: '#f38020',
}

const PROVIDER_KEY_PLACEHOLDERS = {
  openai: 'sk-...',
  anthropic: 'sk-ant-...',
  google: 'AIza...',
  deepseek: 'sk-...',
  xai: 'xai-...',
  openrouter: 'sk-or-...',
}

const NAV_ITEMS = [
  { id: 'home', label: 'Home', icon: House, tooltip: 'Home' },
  { id: 'appstore', label: 'App Store Connect', icon: AppStoreIcon, tooltip: 'App Store Connect' },
  { id: 'googleplay', label: 'Google Play', icon: GooglePlayIcon, tooltip: 'Google Play Console' },
  { id: 'screenshots', label: 'Screenshots', icon: Image, tooltip: 'Screenshot studio' },
  { id: 'agent', label: 'Agent', icon: Bot, tooltip: 'Agent with access to your stores' },
]

// Secondary tools, listed after the store workflow
const MORE_NAV_ITEMS = [
  { id: 'subscriptions', label: 'Subscriptions', icon: DollarSign, tooltip: 'Subscription pricing and translations' },
  { id: 'xcstrings', label: 'XCStrings', icon: Languages, tooltip: 'Translate .xcstrings catalogs' },
]
import { isLocalEnvironment } from '@/constants'

// The App Store Connect page groups its cards in tabs, so jumping to a card means
// switching tab first — the page listens for this event and handles both.
const goToAscSection = (id) => window.dispatchEvent(new CustomEvent('asc:navigate', { detail: id }))

function NavMenu({ items, activePage, onPageChange, subNav = {} }) {
  return (
    <SidebarMenu className="gap-0.5">
      {items.map(({ id, label, icon: Icon, tooltip }) => {
        const active = activePage === id
        return (
          <SidebarMenuItem key={id}>
            <SidebarMenuButton
              isActive={active}
              onClick={() => onPageChange(id)}
              tooltip={tooltip}
              className={`relative h-9 gap-2.5 rounded-md px-3 text-sm transition-colors duration-150 ${
                active
                  ? 'bg-sidebar-accent text-foreground font-medium dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                  : 'text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60'
              }`}
            >
              {/* Left accent bar marks the active page */}
              <span
                className={`absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-highlight transition-opacity duration-150 ${
                  active ? 'opacity-100' : 'opacity-0'
                }`}
              />
              <Icon className={`h-4 w-4 ${active ? 'text-foreground' : 'text-faint'}`} />
              <span>{label}</span>
            </SidebarMenuButton>
            {active && subNav[id]}
          </SidebarMenuItem>
        )
      })}
    </SidebarMenu>
  )
}

export function AppSidebar({
  activePage,
  onPageChange,
  providerConfig,
  onProviderConfigChange,
  ascCredentials,
  onAscCredentialsChange,
  gpCredentials,
  onGpCredentialsChange,
  astroConfig,
  onAstroConfigChange,
  appCompeteConfig,
  onAppCompeteConfigChange,
  accounts,
}) {
  const { theme, setTheme } = useTheme()
  const [aiSettingsOpen, setAiSettingsOpen] = useState(true)
  const [astroSettingsOpen, setAstroSettingsOpen] = useState(false)
  const [appCompeteOpen, setAppCompeteOpen] = useState(false)
  const [astroTesting, setAstroTesting] = useState(false)
  const [astroTestResult, setAstroTestResult] = useState(null)
  const [ascSettingsOpen, setAscSettingsOpen] = useState(true)
  const [gpSettingsOpen, setGpSettingsOpen] = useState(false)

  const currentApiKey = providerConfig.apiKeys[providerConfig.provider] || ''
  const currentModel = providerConfig.models[providerConfig.provider] || PROVIDERS[providerConfig.provider]?.defaultModel || ''

  // Dynamically fetched OpenAI model list (so the user doesn't have to add models by hand)
  const [openaiModels, setOpenaiModels] = useState([])
  const [modelsLoading, setModelsLoading] = useState(false)
  const [modelsError, setModelsError] = useState('')

  const openaiApiKey = providerConfig.apiKeys.openai || ''
  useEffect(() => {
    if (providerConfig.provider !== 'openai') return
    let cancelled = false
    const hasValidKey = openaiApiKey.length >= 20
    // All state updates happen inside the timer callback so none run synchronously
    // during the effect (avoids cascading re-renders).
    const timer = setTimeout(async () => {
      if (!hasValidKey) {
        setOpenaiModels([])
        setModelsError('')
        setModelsLoading(false)
        return
      }
      setModelsLoading(true)
      setModelsError('')
      try {
        const models = await fetchOpenAIModels(openaiApiKey)
        if (!cancelled) setOpenaiModels(models)
      } catch (err) {
        if (!cancelled) {
          setOpenaiModels([])
          setModelsError(err?.message || 'Failed to load models')
        }
      } finally {
        if (!cancelled) setModelsLoading(false)
      }
    }, hasValidKey ? 600 : 0)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [providerConfig.provider, openaiApiKey])

  // Options shown in the model dropdown. We keep a small curated list per provider;
  // for OpenAI we filter it down to the models actually available on the account
  // (falling back to the full curated list if the live list isn't loaded yet).
  const modelOptions = useMemo(() => {
    const curated = PROVIDERS[providerConfig.provider]?.models || []
    let list = curated
    if (providerConfig.provider === 'openai' && openaiModels.length > 0) {
      const available = curated.filter(m => openaiModels.includes(m))
      list = available.length > 0 ? available : curated
    }
    // Make sure the currently selected model is always selectable
    if (currentModel && !list.includes(currentModel)) list = [currentModel, ...list]
    return list
  }, [providerConfig.provider, openaiModels, currentModel])

  // Handlers
  const handleProviderChange = (newProvider) => {
    onProviderConfigChange(prev => ({ ...prev, provider: newProvider }))
  }

  const handleApiKeyChange = (newKey) => {
    onProviderConfigChange(prev => ({
      ...prev,
      apiKeys: { ...prev.apiKeys, [prev.provider]: newKey }
    }))
  }

  const handleModelChange = (newModel) => {
    onProviderConfigChange(prev => ({
      ...prev,
      models: { ...prev.models, [prev.provider]: newModel }
    }))
  }

  const getModelDisplayName = (model) => {
    if (!model) return 'Select model'
    if (model.includes('inference-profile/')) {
      return model.split('/').pop().replace('global.anthropic.', '').replace(/-v\d+:\d+$/, '')
    }
    // Cloudflare ids look like @cf/meta/llama-3.3-70b-instruct-fp8-fast — show the model name only
    if (model.startsWith('@cf/')) {
      return model.split('/').pop()
    }
    return model
  }

  // Quick nav into the cards of the store pages, shown under their entry while that page is open
  const ascSubNav = (
    <div className="mt-1 mb-2 ml-5 pl-2 border-l border-sidebar-border space-y-0.5 group-data-[collapsible=icon]:hidden">
      <button
        onClick={() => goToAscSection('asc-connection')}
        className="flex h-8 min-w-0 items-center gap-2.5 w-full px-2 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors [&>svg]:shrink-0 [&>svg]:text-faint [&>span]:truncate"
      >
        <Link2 className="h-3.5 w-3.5" />
        <span>Connection</span>
      </button>
      <button
        onClick={() => goToAscSection('asc-app-version')}
        className="flex h-8 min-w-0 items-center gap-2.5 w-full px-2 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors [&>svg]:shrink-0 [&>svg]:text-faint [&>span]:truncate"
      >
        <AppWindow className="h-3.5 w-3.5" />
        <span>App and version</span>
      </button>
      <button
        onClick={() => goToAscSection('asc-localizations')}
        className="flex h-8 min-w-0 items-center gap-2.5 w-full px-2 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors [&>svg]:shrink-0 [&>svg]:text-faint [&>span]:truncate"
      >
        <Layers className="h-3.5 w-3.5" />
        <span>Localizations</span>
      </button>
      <button
        onClick={() => goToAscSection('asc-aso-keywords')}
        className="flex h-8 min-w-0 items-center gap-2.5 w-full px-2 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors [&>svg]:shrink-0 [&>svg]:text-faint [&>span]:truncate"
      >
        <TrendingUp className="h-3.5 w-3.5" />
        <span>ASO keywords</span>
      </button>
      <button
        onClick={() => goToAscSection('asc-media')}
        className="flex h-8 min-w-0 items-center gap-2.5 w-full px-2 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors [&>svg]:shrink-0 [&>svg]:text-faint [&>span]:truncate"
      >
        <Images className="h-3.5 w-3.5" />
        <span>Product page media</span>
      </button>
      <button
        onClick={() => goToAscSection('asc-screenshots')}
        className="flex h-8 min-w-0 items-center gap-2.5 w-full px-2 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors [&>svg]:shrink-0 [&>svg]:text-faint [&>span]:truncate"
      >
        <Image className="h-3.5 w-3.5" />
        <span>Screenshots</span>
      </button>
      <button
        onClick={() => goToAscSection('asc-asset-library')}
        className="flex h-8 min-w-0 items-center gap-2.5 w-full px-2 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors [&>svg]:shrink-0 [&>svg]:text-faint [&>span]:truncate"
      >
        <Library className="h-3.5 w-3.5" />
        <span>Asset Library</span>
      </button>
      <button
        onClick={() => goToAscSection('asc-events')}
        className="flex h-8 min-w-0 items-center gap-2.5 w-full px-2 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors [&>svg]:shrink-0 [&>svg]:text-faint [&>span]:truncate"
      >
        <CalendarRange className="h-3.5 w-3.5" />
        <span>In-App Events</span>
      </button>
      <button
        onClick={() => goToAscSection('asc-cpp')}
        className="flex h-8 min-w-0 items-center gap-2.5 w-full px-2 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors [&>svg]:shrink-0 [&>svg]:text-faint [&>span]:truncate"
      >
        <PanelsTopLeft className="h-3.5 w-3.5" />
        <span>Custom Product Pages</span>
      </button>
      <button
        onClick={() => goToAscSection('asc-ppo')}
        className="flex h-8 min-w-0 items-center gap-2.5 w-full px-2 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors [&>svg]:shrink-0 [&>svg]:text-faint [&>span]:truncate"
      >
        <FlaskConical className="h-3.5 w-3.5" />
        <span>Page Optimization</span>
      </button>
      <button
        onClick={() => goToAscSection('asc-translation')}
        className="flex h-8 min-w-0 items-center gap-2.5 w-full px-2 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors [&>svg]:shrink-0 [&>svg]:text-faint [&>span]:truncate"
      >
        <Languages className="h-3.5 w-3.5" />
        <span>Translation</span>
      </button>
      <button
        onClick={() => goToAscSection('asc-builds')}
        className="flex h-8 min-w-0 items-center gap-2.5 w-full px-2 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors [&>svg]:shrink-0 [&>svg]:text-faint [&>span]:truncate"
      >
        <Package className="h-3.5 w-3.5" />
        <span>Builds</span>
      </button>
      <button
        onClick={() => goToAscSection('asc-logs')}
        className="flex h-8 min-w-0 items-center gap-2.5 w-full px-2 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors [&>svg]:shrink-0 [&>svg]:text-faint [&>span]:truncate"
      >
        <Terminal className="h-3.5 w-3.5" />
        <span>Activity log</span>
      </button>
    </div>
  )

  const gpSubNav = (
    <div className="mt-1 mb-2 ml-5 pl-2 border-l border-sidebar-border space-y-0.5 group-data-[collapsible=icon]:hidden">
      <button
        onClick={() => document.getElementById('gp-connection')?.scrollIntoView({ behavior: 'smooth' })}
        className="flex h-8 min-w-0 items-center gap-2.5 w-full px-2 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors [&>svg]:shrink-0 [&>svg]:text-faint [&>span]:truncate"
      >
        <Link2 className="h-3.5 w-3.5" />
        <span>Connection</span>
      </button>
      <button
        onClick={() => document.getElementById('gp-app')?.scrollIntoView({ behavior: 'smooth' })}
        className="flex h-8 min-w-0 items-center gap-2.5 w-full px-2 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors [&>svg]:shrink-0 [&>svg]:text-faint [&>span]:truncate"
      >
        <AppWindow className="h-3.5 w-3.5" />
        <span>App package</span>
      </button>
      <button
        onClick={() => document.getElementById('gp-listings')?.scrollIntoView({ behavior: 'smooth' })}
        className="flex h-8 min-w-0 items-center gap-2.5 w-full px-2 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors [&>svg]:shrink-0 [&>svg]:text-faint [&>span]:truncate"
      >
        <Layers className="h-3.5 w-3.5" />
        <span>Listings</span>
      </button>
      <button
        onClick={() => document.getElementById('gp-translation')?.scrollIntoView({ behavior: 'smooth' })}
        className="flex h-8 min-w-0 items-center gap-2.5 w-full px-2 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors [&>svg]:shrink-0 [&>svg]:text-faint [&>span]:truncate"
      >
        <Languages className="h-3.5 w-3.5" />
        <span>Translation</span>
      </button>
      <button
        onClick={() => document.getElementById('gp-logs')?.scrollIntoView({ behavior: 'smooth' })}
        className="flex h-8 min-w-0 items-center gap-2.5 w-full px-2 rounded-md text-[13px] text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors [&>svg]:shrink-0 [&>svg]:text-faint [&>span]:truncate"
      >
        <Terminal className="h-3.5 w-3.5" />
        <span>Activity log</span>
      </button>
    </div>
  )

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border p-2">
        <div className="flex h-12 items-center gap-3 px-2 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <LogoMark className="h-7 w-7 shrink-0" />
          <div className="flex min-w-0 flex-col gap-0.5 group-data-[collapsible=icon]:hidden">
            <span className="text-[15px] font-medium leading-none">StoreLocalizer</span>
            <span className="text-xs leading-4 text-faint truncate">App Store & Google Play</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Navigation */}
        <SidebarGroup className="pt-6">
          <SidebarGroupLabel className="h-auto px-3 pb-2 text-xs font-normal text-faint">Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavMenu
              items={NAV_ITEMS}
              activePage={activePage}
              onPageChange={onPageChange}
              subNav={{ appstore: ascSubNav, googleplay: gpSubNav }}
            />

          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup className="pt-2">
          <SidebarGroupLabel className="h-auto px-3 pb-2 text-xs font-normal text-faint">More</SidebarGroupLabel>
          <SidebarGroupContent>
            <NavMenu items={MORE_NAV_ITEMS} activePage={activePage} onPageChange={onPageChange} />
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-4 group-data-[collapsible=icon]:hidden" />

        {/* AI Provider Settings */}
        <Collapsible open={aiSettingsOpen} onOpenChange={setAiSettingsOpen} className="group-data-[collapsible=icon]:hidden">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex h-9 w-full items-center justify-between px-3 rounded-md text-foreground hover:bg-sidebar-accent/60 transition-colors [&[data-state=open]>svg.chevron-icon]:rotate-180">
                <div className="flex items-center gap-2.5">
                  <Cpu className="h-4 w-4 text-faint" />
                  <span className="text-sm font-medium">AI provider</span>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${currentApiKey ? 'bg-positive' : 'bg-highlight'}`}
                    title={currentApiKey ? 'Ready to translate' : 'API key required'}
                  />
                </div>
                <ChevronDown className="chevron-icon h-4 w-4 text-faint transition-transform duration-200 ease-out" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent className="px-3 pt-3 space-y-4">
                {/* Provider selector — one clean row with brand dot */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Provider</Label>
                  <Select value={providerConfig.provider} onValueChange={handleProviderChange}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue>
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 shrink-0 rounded-full"
                            style={{ background: PROVIDER_COLORS[providerConfig.provider] || 'var(--muted-foreground)' }}
                          />
                          {PROVIDERS[providerConfig.provider]?.name || providerConfig.provider}
                        </span>
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(PROVIDERS).map(([key, provider]) => (
                        <SelectItem key={key} value={key}>
                          <span className="flex items-center gap-2">
                            <span
                              className="h-2 w-2 shrink-0 rounded-full"
                              style={{ background: PROVIDER_COLORS[key] || 'var(--muted-foreground)' }}
                            />
                            {provider.name}
                            {providerConfig.apiKeys[key] ? (
                              <CheckCircle2 className="h-3.5 w-3.5 text-positive ml-auto" />
                            ) : null}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* API Key */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">API key</Label>
                  <Input
                    type="password"
                    placeholder={PROVIDER_KEY_PLACEHOLDERS[providerConfig.provider] || 'API key'}
                    value={currentApiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                {/* Model */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Model or deployment</Label>
                  {PROVIDERS[providerConfig.provider]?.customModelInput ? (
                    <>
                      <Input
                        placeholder={PROVIDERS[providerConfig.provider]?.defaultModel || 'model-name'}
                        value={currentModel}
                        onChange={(e) => handleModelChange(e.target.value)}
                        className="h-9 text-sm"
                        list={`model-suggestions-${providerConfig.provider}`}
                      />
                      <datalist id={`model-suggestions-${providerConfig.provider}`}>
                        {modelOptions.map(model => (
                          <option key={model} value={model} />
                        ))}
                      </datalist>
                    </>
                  ) : (
                    <Select value={currentModel} onValueChange={handleModelChange}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {modelOptions.map(model => (
                          <SelectItem key={model} value={model}>{getModelDisplayName(model)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  {providerConfig.provider === 'openai' && (modelsLoading || modelsError) && (
                    <p className="text-xs text-faint">
                      {modelsLoading ? 'Loading models from OpenAI…' : `Couldn't load models: ${modelsError}`}
                    </p>
                  )}
                </div>

                {/* Service Tier for OpenAI */}
                {PROVIDERS[providerConfig.provider]?.serviceTiers && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Service tier</Label>
                    <Select value={providerConfig.serviceTier || 'auto'} onValueChange={(val) => onProviderConfigChange(prev => ({ ...prev, serviceTier: val }))}>
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PROVIDERS[providerConfig.provider].serviceTiers.map(tier => (
                          <SelectItem key={tier} value={tier}>
                            {tier === 'auto' ? 'Auto (default)' : tier === 'priority' ? 'Priority (faster)' : tier === 'flex' ? 'Flex (cheaper)' : tier.charAt(0).toUpperCase() + tier.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-faint">
                      Priority is faster, Flex is cheaper for batches
                    </p>
                  </div>
                )}

                {/* Endpoint URL for Azure / Account ID for Cloudflare */}
                {PROVIDERS[providerConfig.provider]?.needsEndpoint && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">{PROVIDERS[providerConfig.provider]?.endpointLabel || 'Endpoint URL'}</Label>
                    <Input
                      placeholder={PROVIDERS[providerConfig.provider]?.placeholder || 'https://your-resource.openai.azure.com'}
                      value={providerConfig.endpoint || ''}
                      onChange={(e) => onProviderConfigChange(prev => ({ ...prev, endpoint: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>
                )}

                {/* Region for Bedrock */}
                {PROVIDERS[providerConfig.provider]?.needsRegion && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">AWS Region</Label>
                    <Input
                      placeholder="us-east-1"
                      value={providerConfig.region}
                      onChange={(e) => onProviderConfigChange(prev => ({ ...prev, region: e.target.value }))}
                      className="h-9 text-sm"
                    />
                  </div>
                )}

                {/* Status — compact inline line, the dot in the section header mirrors it */}
                {!currentApiKey && (
                  <p className="flex items-center gap-1.5 text-xs text-highlight-ink">
                    <AlertCircle className="h-3.5 w-3.5" />
                    Add an API key to translate
                  </p>
                )}
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <SidebarSeparator className="my-4 group-data-[collapsible=icon]:hidden" />

        {/* Astro ASO Settings — local MCP server, useless outside localhost/Tauri */}
        {isLocalEnvironment() && (
        <Collapsible open={astroSettingsOpen} onOpenChange={setAstroSettingsOpen} className="group-data-[collapsible=icon]:hidden">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex h-9 w-full items-center justify-between px-3 rounded-md text-foreground hover:bg-sidebar-accent/60 transition-colors [&[data-state=open]>svg.chevron-icon]:rotate-180">
                <div className="flex items-center gap-2.5">
                  <TrendingUp className="h-4 w-4 text-faint" />
                  <span className="text-sm font-medium">Astro ASO</span>
                  {astroConfig?.enabled && (
                    <span className="h-1.5 w-1.5 rounded-full bg-positive" title="Enabled" />
                  )}
                </div>
                <ChevronDown className="chevron-icon h-4 w-4 text-faint transition-transform duration-200 ease-out" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent className="px-3 pt-3 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Enabled</Label>
                    <button
                      onClick={() => onAstroConfigChange(prev => ({ ...prev, enabled: !prev.enabled }))}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${astroConfig?.enabled ? 'bg-primary' : 'bg-muted-foreground/30'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-background transition-transform ${astroConfig?.enabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
                    </button>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Port</Label>
                    <Input
                      type="number"
                      min="1"
                      max="65535"
                      value={astroConfig?.port || 8089}
                      onChange={(e) => onAstroConfigChange(prev => ({ ...prev, port: parseInt(e.target.value) || 8089 }))}
                      className="h-8 text-sm"
                      placeholder="8089"
                    />
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 text-xs"
                    disabled={astroTesting}
                    onClick={async () => {
                      setAstroTesting(true)
                      setAstroTestResult(null)
                      const { testAstroConnection } = await import('@/services/astroService')
                      const result = await testAstroConnection(astroConfig?.port || 8089)
                      setAstroTestResult(result)
                      setAstroTesting(false)
                    }}
                  >
                    {astroTesting ? (
                      <><Loader2 className="h-3 w-3 animate-spin mr-1.5" />Testing</>
                    ) : 'Test connection'}
                  </Button>
                  {astroTestResult && (
                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs ${astroTestResult.success ? 'bg-positive/10 text-positive' : 'bg-destructive/10 text-destructive'}`}>
                      {astroTestResult.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                      {astroTestResult.message}
                    </div>
                  )}
                  <p className="text-xs leading-5 text-faint">
                    Keyword suggestions from Astro. Turn it on in Astro under Settings, MCP Server.
                  </p>
                </div>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
        )}

        {/* AppCompete Keyword Review */}
        <Collapsible open={appCompeteOpen} onOpenChange={setAppCompeteOpen} className="group-data-[collapsible=icon]:hidden">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex h-9 w-full items-center justify-between px-3 rounded-md text-foreground hover:bg-sidebar-accent/60 transition-colors [&[data-state=open]>svg.chevron-icon]:rotate-180">
                <div className="flex items-center gap-2.5">
                  <Search className="h-4 w-4 text-faint" />
                  <span className="text-sm font-medium">AppCompete</span>
                  {appCompeteConfig?.apiKey && (
                    <span className="h-1.5 w-1.5 rounded-full bg-positive" title="API key configured" />
                  )}
                </div>
                <ChevronDown className="chevron-icon h-4 w-4 text-faint transition-transform duration-200 ease-out" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent className="px-3 pt-3 space-y-4">
                {/* Link to get the key */}
                <a
                  href="https://appcompete.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-8 items-center gap-2 px-3 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/60 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Get an AppCompete API key</span>
                </a>

                {/* How-to */}
                <ol className="space-y-1 pl-4 text-xs leading-5 text-faint list-decimal">
                  <li>Sign in on appcompete.com</li>
                  <li>Open <span className="text-foreground/80">“Connect AppCompete to your AI client”</span></li>
                  <li>Click <span className="text-foreground/80">Generate</span>. The key (<code className="text-[11px]">ac_live_…</code>) shows only once, so copy it right away</li>
                  <li>Paste it below. You can revoke or rotate it from the same page</li>
                </ol>

                {/* API Key */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">API key</Label>
                  <Input
                    type="password"
                    placeholder="ac_live_…"
                    value={appCompeteConfig?.apiKey || ''}
                    onChange={(e) => onAppCompeteConfigChange(prev => ({ ...prev, apiKey: e.target.value.trim() }))}
                    className="h-9 text-sm"
                    autoComplete="off"
                    data-1p-ignore
                  />
                </div>

                {appCompeteConfig?.apiKey ? (
                  <p className="flex items-center gap-1.5 text-xs text-positive">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Key saved, rank tracker and keyword review ready
                  </p>
                ) : (
                  <p className="text-xs leading-5 text-faint">
                    Track keyword rankings, mine competitor keywords and review ASO opportunities with AppCompete.
                  </p>
                )}
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <SidebarSeparator className="my-4 group-data-[collapsible=icon]:hidden" />

        {/* App Store Connect Settings */}
        <Collapsible open={ascSettingsOpen} onOpenChange={setAscSettingsOpen} className="group-data-[collapsible=icon]:hidden">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex h-9 w-full items-center justify-between px-3 rounded-md text-foreground hover:bg-sidebar-accent/60 transition-colors [&[data-state=open]>svg.chevron-icon]:rotate-180">
                <div className="flex items-center gap-2.5">
                  <AppStoreIcon className="h-4 w-4 text-faint" />
                  <span className="text-sm font-medium">App Store Connect</span>
                </div>
                <ChevronDown className="chevron-icon h-4 w-4 text-faint transition-transform duration-200 ease-out" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent className="px-3 pt-3">
                <AppStoreAccounts accounts={accounts} credentials={ascCredentials} onCredentialsChange={onAscCredentialsChange} />
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <SidebarSeparator className="my-4 group-data-[collapsible=icon]:hidden" />

        {/* Google Play Settings */}
        <Collapsible open={gpSettingsOpen} onOpenChange={setGpSettingsOpen} className="group-data-[collapsible=icon]:hidden">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex h-9 w-full items-center justify-between px-3 rounded-md text-foreground hover:bg-sidebar-accent/60 transition-colors [&[data-state=open]>svg.chevron-icon]:rotate-180">
                <div className="flex items-center gap-2.5">
                  <GooglePlayIcon className="h-4 w-4 text-faint" />
                  <span className="text-sm font-medium">Google Play</span>
                </div>
                <ChevronDown className="chevron-icon h-4 w-4 text-faint transition-transform duration-200 ease-out" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent className="px-3 pt-3">
                <GooglePlayAccounts accounts={accounts} credentials={gpCredentials} onCredentialsChange={onGpCredentialsChange} />
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border group-data-[collapsible=icon]:hidden">
        <div className="flex h-10 items-center justify-between px-2">
          {/* Theme segmented control */}
          <div className="flex items-center gap-0.5 rounded-lg bg-sidebar-accent p-0.5">
            {[
              { value: 'light', icon: Sun, label: 'Light mode' },
              { value: 'dark', icon: Moon, label: 'Dark mode' },
              { value: 'system', icon: Monitor, label: 'System theme' },
            ].map(({ value, icon: ThemeIcon, label }) => (
              <button
                key={value}
                onClick={() => setTheme(value)}
                className={`p-1.5 rounded-md transition-colors ${
                  theme === value
                    ? 'bg-background text-foreground dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title={label}
              >
                <ThemeIcon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>

          <a
            href="https://x.com/fayhecode"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-faint hover:text-foreground"
          >
            Made by Fayhe
          </a>
        </div>
      </SidebarFooter>

    </Sidebar>
  )
}
