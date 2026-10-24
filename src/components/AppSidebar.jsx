import { useState, useEffect, useMemo } from 'react'
import { toast } from 'sonner'
import { FileText, Globe, ChevronDown, Key, Cpu, Trash2, ExternalLink, Lock, Unlock, Save, Languages, Store, Sparkles, CheckCircle2, AlertCircle, Link2, AppWindow, Layers, TrendingUp, Terminal, Image, Images, Library, CalendarRange, PanelsTopLeft, FlaskConical, Moon, Sun, Monitor, DollarSign, Play, Loader2, Search, Bot, Download } from 'lucide-react'
import { useTheme } from './ThemeProvider'
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
  { id: 'xcstrings', label: 'XCStrings', icon: Languages, tooltip: 'XCStrings Translator' },
  { id: 'appstore', label: 'App Store Connect', icon: Store, tooltip: 'App Store Connect' },
  { id: 'googleplay', label: 'Google Play', icon: Play, tooltip: 'Google Play Console' },
  { id: 'screenshots', label: 'Screenshots', icon: Image, tooltip: 'Screenshot Maker' },
  { id: 'subscriptions', label: 'Subscriptions', icon: DollarSign, tooltip: 'Subscription Pricing & Translations' },
  { id: 'agent', label: 'Agent', icon: Bot, tooltip: 'AI Agent — chat with function calling' },
]
import { encrypt, decrypt } from '@/utils/crypto'
import { downloadTextFile, serviceAccountFilename } from '@/utils/downloadFile'
import { isLocalEnvironment } from '@/constants'

// The App Store Connect page groups its cards in tabs, so jumping to a card means
// switching tab first — the page listens for this event and handles both.
const goToAscSection = (id) => window.dispatchEvent(new CustomEvent('asc:navigate', { detail: id }))

const ENCRYPTED_KEY_STORAGE = 'asc-encrypted-p8-key'

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
  onAppCompeteConfigChange
}) {
  const { theme, setTheme } = useTheme()
  const [isDraggingKey, setIsDraggingKey] = useState(false)
  const [isDraggingGpKey, setIsDraggingGpKey] = useState(false)
  const [aiSettingsOpen, setAiSettingsOpen] = useState(true)
  const [astroSettingsOpen, setAstroSettingsOpen] = useState(false)
  const [appCompeteOpen, setAppCompeteOpen] = useState(false)
  const [astroTesting, setAstroTesting] = useState(false)
  const [astroTestResult, setAstroTestResult] = useState(null)
  const [ascSettingsOpen, setAscSettingsOpen] = useState(true)
  const [gpSettingsOpen, setGpSettingsOpen] = useState(false)

  // Encrypted key state
  const [hasStoredKey, setHasStoredKey] = useState(() => {
    if (typeof window === 'undefined') return false
    return !!window.localStorage.getItem(ENCRYPTED_KEY_STORAGE)
  })
  const [keyPassword, setKeyPassword] = useState('')
  const [showPasswordInput, setShowPasswordInput] = useState(false)
  const [passwordMode, setPasswordMode] = useState('') // 'save' or 'load'
  const [keyError, setKeyError] = useState('')
  const [isSavingKey, setIsSavingKey] = useState(false)

  // Google Play encrypted key state
  const ENCRYPTED_GP_KEY_STORAGE = 'gp-encrypted-service-account'
  const [hasStoredGpKey, setHasStoredGpKey] = useState(() => {
    if (typeof window === 'undefined') return false
    return !!window.localStorage.getItem(ENCRYPTED_GP_KEY_STORAGE)
  })
  const [gpKeyPassword, setGpKeyPassword] = useState('')
  const [showGpPasswordInput, setShowGpPasswordInput] = useState(false)
  const [gpPasswordMode, setGpPasswordMode] = useState('') // 'save' or 'load'
  const [gpKeyError, setGpKeyError] = useState('')
  const [isSavingGpKey, setIsSavingGpKey] = useState(false)

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

  // Handle .p8 file
  const processKeyFile = async (file) => {
    if (!file) return
    if (!file.name.endsWith('.p8')) return
    try {
      const content = await file.text()
      
      // Extract Key ID from filename (format: AuthKey_XXXXXXXXXX.p8)
      const keyIdMatch = file.name.match(/AuthKey_([A-Z0-9]+)\.p8$/i)
      const extractedKeyId = keyIdMatch ? keyIdMatch[1] : null
      
      onAscCredentialsChange(prev => ({
        ...prev,
        privateKey: content,
        // Auto-fill Key ID if extracted and field is empty
        ...(extractedKeyId && !prev.keyId ? { keyId: extractedKeyId } : {})
      }))
    } catch { /* ignore */ }
  }

  const handleKeyUpload = async (event) => {
    await processKeyFile(event.target.files[0])
  }

  const handleKeyDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingKey(true)
  }

  const handleKeyDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingKey(false)
  }

  const handleKeyDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingKey(false)
    const files = e.dataTransfer.files
    if (files.length > 0) {
      await processKeyFile(files[0])
    }
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

  // Save key encrypted with password
  const handleSaveKeyEncrypted = async () => {
    if (!keyPassword || keyPassword.length < 4) {
      setKeyError('Password must be at least 4 characters')
      return
    }
    if (!ascCredentials.privateKey) {
      setKeyError('No key loaded to save')
      return
    }

    setIsSavingKey(true)
    setKeyError('')

    try {
      const encrypted = await encrypt(ascCredentials.privateKey, keyPassword)
      localStorage.setItem(ENCRYPTED_KEY_STORAGE, encrypted)
      setHasStoredKey(true)
      setKeyPassword('')
      setPasswordMode('')
      setShowPasswordInput(false)
      toast.success('Key saved (encrypted)')
    } catch {
      setKeyError('Failed to encrypt key')
    }

    setIsSavingKey(false)
  }

  // Load key with password
  const handleLoadKeyEncrypted = async () => {
    if (!keyPassword) {
      setKeyError('Please enter your password')
      return
    }

    const stored = localStorage.getItem(ENCRYPTED_KEY_STORAGE)
    if (!stored) {
      setKeyError('No stored key found')
      return
    }

    setIsSavingKey(true)
    setKeyError('')

    const result = await decrypt(stored, keyPassword)

    if (result.success) {
      onAscCredentialsChange(prev => ({ ...prev, privateKey: result.data }))
      setKeyPassword('')
      setPasswordMode('')
      setShowPasswordInput(false)
      toast.success('Key decrypted!')
    } else {
      setKeyError('Wrong password')
    }

    setIsSavingKey(false)
  }

  // Delete stored encrypted key
  const handleDeleteStoredKey = () => {
    localStorage.removeItem(ENCRYPTED_KEY_STORAGE)
    setHasStoredKey(false)
  }

  // Cancel password input
  const handleCancelPassword = () => {
    setShowPasswordInput(false)
    setKeyPassword('')
    setPasswordMode('')
    setKeyError('')
  }

  // Export the decrypted credentials currently held in memory as a plain file
  const handleExportPrivateKey = () => {
    if (!ascCredentials.privateKey) return
    const name = ascCredentials.keyId ? `AuthKey_${ascCredentials.keyId}.p8` : 'AuthKey.p8'
    downloadTextFile(name, ascCredentials.privateKey)
    toast.success(`Exported ${name}`, { description: 'The file is not encrypted — store it somewhere safe.' })
  }

  const handleExportServiceAccount = () => {
    if (!gpCredentials?.serviceAccountJson) return
    const name = serviceAccountFilename(gpCredentials.serviceAccountJson)
    downloadTextFile(name, gpCredentials.serviceAccountJson, 'application/json')
    toast.success(`Exported ${name}`, { description: 'The file is not encrypted — store it somewhere safe.' })
  }

  // Google Play: Save service account encrypted with password
  const handleSaveGpKeyEncrypted = async () => {
    if (!gpKeyPassword || gpKeyPassword.length < 4) {
      setGpKeyError('Password must be at least 4 characters')
      return
    }
    if (!gpCredentials?.serviceAccountJson) {
      setGpKeyError('No service account loaded to save')
      return
    }

    setIsSavingGpKey(true)
    setGpKeyError('')

    try {
      const encrypted = await encrypt(gpCredentials.serviceAccountJson, gpKeyPassword)
      localStorage.setItem(ENCRYPTED_GP_KEY_STORAGE, encrypted)
      setHasStoredGpKey(true)
      setGpKeyPassword('')
      setGpPasswordMode('')
      setShowGpPasswordInput(false)
      toast.success('Service account saved (encrypted)')
    } catch {
      setGpKeyError('Failed to encrypt service account')
    }

    setIsSavingGpKey(false)
  }

  // Google Play: Load service account with password
  const handleLoadGpKeyEncrypted = async () => {
    if (!gpKeyPassword) {
      setGpKeyError('Please enter your password')
      return
    }

    const stored = localStorage.getItem(ENCRYPTED_GP_KEY_STORAGE)
    if (!stored) {
      setGpKeyError('No stored service account found')
      return
    }

    setIsSavingGpKey(true)
    setGpKeyError('')

    const result = await decrypt(stored, gpKeyPassword)

    if (result.success) {
      onGpCredentialsChange(prev => ({ ...prev, serviceAccountJson: result.data }))
      setGpKeyPassword('')
      setGpPasswordMode('')
      setShowGpPasswordInput(false)
      toast.success('Service account decrypted!')
    } else {
      setGpKeyError('Wrong password')
    }

    setIsSavingGpKey(false)
  }

  // Google Play: Delete stored encrypted service account
  const handleDeleteStoredGpKey = () => {
    localStorage.removeItem(ENCRYPTED_GP_KEY_STORAGE)
    setHasStoredGpKey(false)
  }

  // Google Play: Cancel password input
  const handleCancelGpPassword = () => {
    setShowGpPasswordInput(false)
    setGpKeyPassword('')
    setGpPasswordMode('')
    setGpKeyError('')
  }

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border/50">
        <div className="flex items-center gap-2.5 px-3 py-3 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 shadow-sm shadow-violet-500/30">
            <Globe className="h-4 w-4 text-white" />
          </div>
          <div className="flex min-w-0 flex-col group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-semibold tracking-tight leading-tight">Localizer</span>
            <span className="text-[11px] leading-tight text-muted-foreground truncate">App Store & Play Store</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Navigation */}
        <SidebarGroup className="pt-4">
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-2 mb-2">Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-0.5">
              {NAV_ITEMS.map(({ id, label, icon: Icon, tooltip }) => {
                const active = activePage === id
                return (
                  <SidebarMenuItem key={id}>
                    <SidebarMenuButton
                      isActive={active}
                      onClick={() => onPageChange(id)}
                      tooltip={tooltip}
                      className={`relative rounded-lg h-9 px-3 text-[13px] transition-colors duration-150 ${
                        active
                          ? 'bg-primary/8 text-primary font-semibold'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/40'
                      }`}
                    >
                      {/* Left accent bar marks the active page */}
                      <span
                        className={`absolute left-0 top-1/2 -translate-y-1/2 h-4 w-0.5 rounded-full bg-primary transition-opacity duration-150 ${
                          active ? 'opacity-100' : 'opacity-0'
                        }`}
                      />
                      <Icon className={`h-4 w-4 ${active ? 'text-primary' : ''}`} />
                      <span>{label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>

            {/* App Store Connect Quick Nav - only show when on appstore page */}
            {activePage === 'appstore' && (
              <div className="mt-3 ml-3 pl-3 border-l-2 border-primary/20 space-y-1 group-data-[collapsible=icon]:hidden">
                <button
                  onClick={() => goToAscSection('asc-connection')}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  <span>Connection</span>
                </button>
                <button
                  onClick={() => goToAscSection('asc-app-version')}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <AppWindow className="h-3.5 w-3.5" />
                  <span>App & Version</span>
                </button>
                <button
                  onClick={() => goToAscSection('asc-localizations')}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Localizations</span>
                </button>
                <button
                  onClick={() => goToAscSection('asc-aso-keywords')}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>ASO Keywords</span>
                </button>
                <button
                  onClick={() => goToAscSection('asc-media')}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Images className="h-3.5 w-3.5" />
                  <span>Product Page Media</span>
                </button>
                <button
                  onClick={() => goToAscSection('asc-screenshots')}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Image className="h-3.5 w-3.5" />
                  <span>Screenshots</span>
                </button>
                <button
                  onClick={() => goToAscSection('asc-asset-library')}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Library className="h-3.5 w-3.5" />
                  <span>Asset Library</span>
                </button>
                <button
                  onClick={() => goToAscSection('asc-events')}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <CalendarRange className="h-3.5 w-3.5" />
                  <span>In-App Events</span>
                </button>
                <button
                  onClick={() => goToAscSection('asc-cpp')}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <PanelsTopLeft className="h-3.5 w-3.5" />
                  <span>Custom Product Pages</span>
                </button>
                <button
                  onClick={() => goToAscSection('asc-ppo')}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <FlaskConical className="h-3.5 w-3.5" />
                  <span>Page Optimization</span>
                </button>
                <button
                  onClick={() => goToAscSection('asc-translation')}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>AI Translation</span>
                </button>
                <button
                  onClick={() => goToAscSection('asc-logs')}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Terminal className="h-3.5 w-3.5" />
                  <span>Activity Log</span>
                </button>
              </div>
            )}

            {/* Google Play Quick Nav - only show when on googleplay page */}
            {activePage === 'googleplay' && (
              <div className="mt-3 ml-3 pl-3 border-l-2 border-primary/20 space-y-1 group-data-[collapsible=icon]:hidden">
                <button
                  onClick={() => document.getElementById('gp-connection')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  <span>Connection</span>
                </button>
                <button
                  onClick={() => document.getElementById('gp-app')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <AppWindow className="h-3.5 w-3.5" />
                  <span>App Package</span>
                </button>
                <button
                  onClick={() => document.getElementById('gp-listings')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Listings</span>
                </button>
                <button
                  onClick={() => document.getElementById('gp-translation')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>AI Translation</span>
                </button>
                <button
                  onClick={() => document.getElementById('gp-logs')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Terminal className="h-3.5 w-3.5" />
                  <span>Activity Log</span>
                </button>
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator className="my-4 opacity-50 group-data-[collapsible=icon]:hidden" />

        {/* AI Provider Settings */}
        <Collapsible open={aiSettingsOpen} onOpenChange={setAiSettingsOpen} className="group-data-[collapsible=icon]:hidden">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between px-2 py-2 rounded-lg hover:bg-muted/40 transition-colors [&[data-state=open]>svg.chevron-icon]:rotate-180">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-500" />
                  <span className="text-[13px] font-medium">AI Provider</span>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${currentApiKey ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    title={currentApiKey ? 'Ready to translate' : 'API key required'}
                  />
                </div>
                <ChevronDown className="chevron-icon h-4 w-4 text-muted-foreground transition-transform duration-200" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent className="px-2 pt-3 space-y-3">
                {/* Provider selector — one clean row with brand dot */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Provider</Label>
                  <Select value={providerConfig.provider} onValueChange={handleProviderChange}>
                    <SelectTrigger className="h-9 text-sm bg-muted/30 border-border/50">
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
                              <CheckCircle2 className="h-3 w-3 text-emerald-500 ml-auto" />
                            ) : null}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* API Key */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">API Key</Label>
                  <Input
                    type="password"
                    placeholder={PROVIDER_KEY_PLACEHOLDERS[providerConfig.provider] || 'Enter your API key...'}
                    value={currentApiKey}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    className="h-9 text-sm bg-muted/30 border-border/50 focus:border-primary/50"
                  />
                </div>

                {/* Model */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Model / Deployment Name</Label>
                  {PROVIDERS[providerConfig.provider]?.customModelInput ? (
                    <>
                      <Input
                        placeholder={PROVIDERS[providerConfig.provider]?.defaultModel || 'model-name'}
                        value={currentModel}
                        onChange={(e) => handleModelChange(e.target.value)}
                        className="h-9 text-sm bg-muted/30 border-border/50 focus:border-primary/50"
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
                      <SelectTrigger className="h-9 text-sm bg-muted/30 border-border/50">
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
                    <p className="text-[11px] text-muted-foreground">
                      {modelsLoading ? 'Loading models from OpenAI…' : `Couldn't load models: ${modelsError}`}
                    </p>
                  )}
                </div>

                {/* Service Tier for OpenAI */}
                {PROVIDERS[providerConfig.provider]?.serviceTiers && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Service Tier</Label>
                    <Select value={providerConfig.serviceTier || 'auto'} onValueChange={(val) => onProviderConfigChange(prev => ({ ...prev, serviceTier: val }))}>
                      <SelectTrigger className="h-9 text-sm bg-muted/30 border-border/50">
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
                    <p className="text-xs text-muted-foreground">
                      Priority = faster, Flex = cheaper batch processing
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
                      className="h-9 text-sm bg-muted/30 border-border/50 focus:border-primary/50"
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
                      className="h-9 text-sm bg-muted/30 border-border/50 focus:border-primary/50"
                    />
                  </div>
                )}

                {/* Status — compact inline line, the dot in the section header mirrors it */}
                {!currentApiKey && (
                  <p className="flex items-center gap-1.5 text-[11px] text-amber-500">
                    <AlertCircle className="h-3 w-3" />
                    API key required to translate
                  </p>
                )}
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <SidebarSeparator className="my-4 opacity-50 group-data-[collapsible=icon]:hidden" />

        {/* Astro ASO Settings — local MCP server, useless outside localhost/Tauri */}
        {isLocalEnvironment() && (
        <Collapsible open={astroSettingsOpen} onOpenChange={setAstroSettingsOpen} className="group-data-[collapsible=icon]:hidden">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between px-2 py-2 rounded-lg hover:bg-muted/40 transition-colors [&[data-state=open]>svg.chevron-icon]:rotate-180">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-orange-500" />
                  <span className="text-[13px] font-medium">Astro ASO</span>
                  {astroConfig?.enabled && (
                    <span className="h-1.5 w-1.5 rounded-full bg-orange-500" title="Enabled" />
                  )}
                </div>
                <ChevronDown className="chevron-icon h-4 w-4 text-muted-foreground transition-transform duration-200" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent className="px-2 pt-3 space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">Enable Astro</Label>
                    <button
                      onClick={() => onAstroConfigChange(prev => ({ ...prev, enabled: !prev.enabled }))}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${astroConfig?.enabled ? 'bg-orange-500' : 'bg-muted-foreground/30'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${astroConfig?.enabled ? 'translate-x-4.5' : 'translate-x-0.5'}`} />
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
                      <><Loader2 className="h-3 w-3 animate-spin mr-1.5" />Testing...</>
                    ) : 'Test Connection'}
                  </Button>
                  {astroTestResult && (
                    <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium ${astroTestResult.success ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                      {astroTestResult.success ? <CheckCircle2 className="h-3.5 w-3.5" /> : <AlertCircle className="h-3.5 w-3.5" />}
                      {astroTestResult.message}
                    </div>
                  )}
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Connect to Astro for keyword suggestions. Open Astro → Settings → MCP Server to enable.
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
              <CollapsibleTrigger className="flex w-full items-center justify-between px-2 py-2 rounded-lg hover:bg-muted/40 transition-colors [&[data-state=open]>svg.chevron-icon]:rotate-180">
                <div className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-sky-500" />
                  <span className="text-[13px] font-medium">AppCompete Keyword Review</span>
                  {appCompeteConfig?.apiKey && (
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" title="API key configured" />
                  )}
                </div>
                <ChevronDown className="chevron-icon h-4 w-4 text-muted-foreground transition-transform duration-200" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent className="px-2 pt-3 space-y-3">
                {/* Link to get the key */}
                <a
                  href="https://appcompete.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-sky-500/10 text-sky-500 text-xs font-medium hover:bg-sky-500/20 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Get API Key from AppCompete</span>
                </a>

                {/* How-to */}
                <ol className="space-y-1 pl-4 text-[10px] text-muted-foreground leading-relaxed list-decimal">
                  <li>Sign in on appcompete.com</li>
                  <li>Open <span className="text-foreground/80">“Connect AppCompete to your AI client”</span></li>
                  <li>Click <span className="text-foreground/80">Generate</span> — the key (<code className="text-[9px]">ac_live_…</code>) is shown only once, copy it right away</li>
                  <li>Paste it below — you can revoke or rotate it anytime from the same page</li>
                </ol>

                {/* API Key */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">API Key</Label>
                  <Input
                    type="password"
                    placeholder="ac_live_…"
                    value={appCompeteConfig?.apiKey || ''}
                    onChange={(e) => onAppCompeteConfigChange(prev => ({ ...prev, apiKey: e.target.value.trim() }))}
                    className="h-9 text-sm bg-muted/30 border-border/50 focus:border-primary/50"
                    autoComplete="off"
                    data-1p-ignore
                  />
                </div>

                {appCompeteConfig?.apiKey ? (
                  <p className="flex items-center gap-1.5 text-[11px] text-emerald-500">
                    <CheckCircle2 className="h-3 w-3" />
                    Key saved — Rank Tracker & keyword review ready
                  </p>
                ) : (
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    Track keyword rankings, mine competitor keywords and review ASO opportunities with AppCompete.
                  </p>
                )}
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <SidebarSeparator className="my-4 opacity-50 group-data-[collapsible=icon]:hidden" />

        {/* App Store Connect Settings */}
        <Collapsible open={ascSettingsOpen} onOpenChange={setAscSettingsOpen} className="group-data-[collapsible=icon]:hidden">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between px-2 py-2 rounded-lg hover:bg-muted/40 transition-colors [&[data-state=open]>svg.chevron-icon]:rotate-180">
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-blue-500" />
                  <span className="text-[13px] font-medium">App Store Connect</span>
                </div>
                <ChevronDown className="chevron-icon h-4 w-4 text-muted-foreground transition-transform duration-200" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent className="px-2 pt-3 space-y-4">
                {/* Link to create API key */}
                <a
                  href="https://appstoreconnect.apple.com/access/integrations/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 text-blue-500 text-xs font-medium hover:bg-blue-500/20 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Get API Key from Apple</span>
                </a>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Key ID</Label>
                  <Input
                    placeholder="XXXXXXXXXX"
                    value={ascCredentials.keyId}
                    onChange={(e) => onAscCredentialsChange(prev => ({ ...prev, keyId: e.target.value }))}
                    className="h-9 text-sm bg-muted/30 border-border/50 focus:border-primary/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Issuer ID</Label>
                  <Input
                    placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                    value={ascCredentials.issuerId}
                    onChange={(e) => onAscCredentialsChange(prev => ({ ...prev, issuerId: e.target.value }))}
                    className="h-9 text-sm bg-muted/30 border-border/50 focus:border-primary/50"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Private Key (.p8)</Label>
                  <Input
                    type="file"
                    accept=".p8"
                    onChange={handleKeyUpload}
                    className="hidden"
                    id="sidebar-p8-input"
                  />
                  <label
                    htmlFor="sidebar-p8-input"
                    onDragOver={handleKeyDragOver}
                    onDragLeave={handleKeyDragLeave}
                    onDrop={handleKeyDrop}
                    className={`
                      flex flex-col items-center justify-center h-20 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 text-xs
                      ${isDraggingKey
                        ? 'border-primary bg-primary/10 text-primary scale-[1.02]'
                        : ascCredentials.privateKey
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500'
                          : 'border-border/50 hover:border-primary/50 hover:bg-muted/30 text-muted-foreground'
                      }
                    `}
                  >
                    {isDraggingKey ? (
                      <>
                        <Key className="h-5 w-5 mb-1 animate-bounce" />
                        <span className="font-medium">Drop your key here</span>
                      </>
                    ) : ascCredentials.privateKey ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 mb-1" />
                        <span className="font-medium">Private key loaded</span>
                      </>
                    ) : (
                      <>
                        <Key className="h-5 w-5 mb-1 opacity-50" />
                        <span className="font-medium">Drop .p8 file here</span>
                      </>
                    )}
                  </label>

                  {/* Save/Load encrypted key buttons */}
                  <div className="flex gap-2 pt-2">
                    {ascCredentials.privateKey && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs gap-1.5"
                        onClick={() => {
                          setPasswordMode('save')
                          setKeyError('')
                          setKeyPassword('')
                          setShowPasswordInput(true)
                        }}
                      >
                        <Save className="h-3.5 w-3.5" />
                        {hasStoredKey ? 'Change Password' : 'Save Encrypted'}
                      </Button>
                    )}
                    {ascCredentials.privateKey && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs gap-1.5"
                        onClick={handleExportPrivateKey}
                        title="Download the decrypted .p8 key"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Export
                      </Button>
                    )}
                    {hasStoredKey && !ascCredentials.privateKey && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs gap-1.5"
                        onClick={() => {
                          setPasswordMode('load')
                          setKeyError('')
                          setKeyPassword('')
                          setShowPasswordInput(true)
                        }}
                      >
                        <Unlock className="h-3.5 w-3.5" />
                        Load Saved Key
                      </Button>
                    )}
                    {hasStoredKey && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            title="Delete saved key"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Saved Key?</AlertDialogTitle>
                            <AlertDialogDescription>
                              This will permanently delete the encrypted key from storage. You'll need to upload the .p8 file again.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDeleteStoredKey}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>

                {/* Status & Clear */}
                <div className="flex items-center justify-between pt-2">
                  {ascCredentials.keyId && ascCredentials.issuerId && ascCredentials.privateKey ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-500 flex-1">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs font-medium">Ready to connect</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-muted-foreground flex-1">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-xs font-medium">Credentials incomplete</span>
                    </div>
                  )}
                  {(ascCredentials.keyId || ascCredentials.issuerId || ascCredentials.privateKey) && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Clear ASC Credentials?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will clear your Key ID, Issuer ID, and loaded private key. You'll need to enter them again to connect.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onAscCredentialsChange({ keyId: '', issuerId: '', privateKey: '' })}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Clear
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <SidebarSeparator className="my-4 opacity-50 group-data-[collapsible=icon]:hidden" />

        {/* Google Play Settings */}
        <Collapsible open={gpSettingsOpen} onOpenChange={setGpSettingsOpen} className="group-data-[collapsible=icon]:hidden">
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between px-2 py-2 rounded-lg hover:bg-muted/40 transition-colors [&[data-state=open]>svg.chevron-icon]:rotate-180">
                <div className="flex items-center gap-2">
                  <Play className="h-4 w-4 text-green-500" />
                  <span className="text-[13px] font-medium">Google Play</span>
                </div>
                <ChevronDown className="chevron-icon h-4 w-4 text-muted-foreground transition-transform duration-200" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent className="px-2 pt-3 space-y-4">
                {/* Link to create service account */}
                <a
                  href="https://developers.google.com/android-publisher/getting_started"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/10 text-green-500 text-xs font-medium hover:bg-green-500/20 transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Setup Guide</span>
                </a>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">Service Account JSON</Label>
                  <Input
                    type="file"
                    accept=".json"
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        const content = await file.text()
                        onGpCredentialsChange(prev => ({ ...prev, serviceAccountJson: content }))
                      }
                    }}
                    className="hidden"
                    id="sidebar-gp-json-input"
                  />
                  <label
                    htmlFor="sidebar-gp-json-input"
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingGpKey(true) }}
                    onDragLeave={(e) => { e.preventDefault(); e.stopPropagation(); setIsDraggingGpKey(false) }}
                    onDrop={async (e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setIsDraggingGpKey(false)
                      const file = e.dataTransfer.files[0]
                      if (file?.name.endsWith('.json')) {
                        const content = await file.text()
                        onGpCredentialsChange(prev => ({ ...prev, serviceAccountJson: content }))
                      }
                    }}
                    className={`
                      flex flex-col items-center justify-center h-20 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-200 text-xs
                      ${isDraggingGpKey
                        ? 'border-green-500 bg-green-500/10 text-green-500 scale-[1.02]'
                        : gpCredentials?.serviceAccountJson
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-500'
                          : 'border-border/50 hover:border-green-500/50 hover:bg-muted/30 text-muted-foreground'
                      }
                    `}
                  >
                    {isDraggingGpKey ? (
                      <>
                        <Key className="h-5 w-5 mb-1 animate-bounce" />
                        <span className="font-medium">Drop JSON here</span>
                      </>
                    ) : gpCredentials?.serviceAccountJson ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 mb-1" />
                        <span className="font-medium">Service account loaded</span>
                      </>
                    ) : (
                      <>
                        <Key className="h-5 w-5 mb-1 opacity-50" />
                        <span className="font-medium">Drop .json file here</span>
                      </>
                    )}
                  </label>
                </div>

                {/* Status & Clear */}
                <div className="flex items-center justify-between pt-2">
                  {gpCredentials?.serviceAccountJson ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-500 flex-1">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs font-medium">Ready to connect</span>
                    </div>
                  ) : hasStoredGpKey ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-500/10 text-blue-500 flex-1">
                      <Lock className="h-4 w-4" />
                      <span className="text-xs font-medium">Saved (encrypted)</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 text-muted-foreground flex-1">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-xs font-medium">Upload service account</span>
                    </div>
                  )}
                  {gpCredentials?.serviceAccountJson && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 ml-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Clear Google Play Credentials?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will clear your service account JSON. You'll need to upload it again to connect.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => onGpCredentialsChange({ serviceAccountJson: '' })}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Clear
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>

                {/* Encrypted Storage for Google Play */}
                <div className="flex gap-2">
                  {gpCredentials?.serviceAccountJson && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setGpPasswordMode('save')
                        setGpKeyError('')
                        setGpKeyPassword('')
                        setShowGpPasswordInput(true)
                      }}
                      className="flex-1 h-8 text-xs"
                    >
                      <Save className="h-3.5 w-3.5 mr-1.5" />
                      {hasStoredGpKey ? 'Change Password' : 'Save Encrypted'}
                    </Button>
                  )}
                  {gpCredentials?.serviceAccountJson && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={handleExportServiceAccount}
                      className="h-8 text-xs"
                      title="Download the decrypted service account JSON"
                    >
                      <Download className="h-3.5 w-3.5 mr-1.5" />
                      Export
                    </Button>
                  )}
                  {hasStoredGpKey && !gpCredentials?.serviceAccountJson && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setGpPasswordMode('load')
                        setGpKeyError('')
                        setGpKeyPassword('')
                        setShowGpPasswordInput(true)
                      }}
                      className="flex-1 h-8 text-xs"
                    >
                      <Unlock className="h-3.5 w-3.5 mr-1.5" />
                      Load Saved
                    </Button>
                  )}
                  {hasStoredGpKey && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Saved Service Account?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete the encrypted service account from your browser storage.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={handleDeleteStoredGpKey} className="bg-destructive text-destructive-foreground">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 group-data-[collapsible=icon]:hidden">
        <div className="flex items-center justify-between px-3 py-2.5">
          {/* Theme segmented control */}
          <div className="flex items-center gap-0.5 rounded-lg bg-muted/40 p-0.5">
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
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
                title={label}
              >
                <ThemeIcon className="h-3.5 w-3.5" />
              </button>
            ))}
          </div>

          <span className="text-[11px] text-muted-foreground">
            Crafted with <span className="text-red-500">♥</span> by{' '}
            <span className="font-medium text-foreground">Fayhe</span>
          </span>
        </div>
      </SidebarFooter>

      {/* ASC Password Dialog */}
      <Dialog open={showPasswordInput} onOpenChange={(open) => { if (!open) handleCancelPassword() }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {passwordMode === 'save' ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              {passwordMode === 'save' ? (hasStoredKey ? 'Change Password' : 'Encrypt & Save Key') : 'Decrypt Saved Key'}
            </DialogTitle>
            <DialogDescription>
              {passwordMode === 'save'
                ? (hasStoredKey
                  ? 'Enter a new password. This will re-encrypt your .p8 key with the new password.'
                  : 'Choose a password to encrypt your .p8 key. It will be stored securely in your browser.')
                : 'Enter your password to decrypt the saved key.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              type="password"
              placeholder={passwordMode === 'save' ? 'Password (min 4 chars)' : 'Enter password...'}
              value={keyPassword}
              onChange={(e) => { setKeyPassword(e.target.value); setKeyError('') }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  passwordMode === 'save' ? handleSaveKeyEncrypted() : handleLoadKeyEncrypted()
                }
              }}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
            {keyError && <p className="text-sm text-destructive">{keyError}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={handleCancelPassword}>Cancel</Button>
            <Button
              onClick={passwordMode === 'save' ? handleSaveKeyEncrypted : handleLoadKeyEncrypted}
              disabled={isSavingKey}
            >
              {isSavingKey ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {passwordMode === 'save' ? (hasStoredKey ? 'Update Password' : 'Save Encrypted') : 'Decrypt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* GP Password Dialog */}
      <Dialog open={showGpPasswordInput} onOpenChange={(open) => { if (!open) handleCancelGpPassword() }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {gpPasswordMode === 'save' ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
              {gpPasswordMode === 'save' ? (hasStoredGpKey ? 'Change Password' : 'Encrypt & Save Service Account') : 'Decrypt Service Account'}
            </DialogTitle>
            <DialogDescription>
              {gpPasswordMode === 'save'
                ? (hasStoredGpKey
                  ? 'Enter a new password. This will re-encrypt your service account with the new password.'
                  : 'Choose a password to encrypt your service account JSON. It will be stored securely in your browser.')
                : 'Enter your password to decrypt the saved service account.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Input
              type="password"
              placeholder={gpPasswordMode === 'save' ? 'Password (min 4 chars)' : 'Enter password...'}
              value={gpKeyPassword}
              onChange={(e) => setGpKeyPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  gpPasswordMode === 'save' ? handleSaveGpKeyEncrypted() : handleLoadGpKeyEncrypted()
                }
              }}
              autoComplete="off"
              data-1p-ignore
              data-lpignore="true"
              data-form-type="other"
            />
            {gpKeyError && <p className="text-sm text-destructive">{gpKeyError}</p>}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={handleCancelGpPassword}>Cancel</Button>
            <Button
              onClick={gpPasswordMode === 'save' ? handleSaveGpKeyEncrypted : handleLoadGpKeyEncrypted}
              disabled={isSavingGpKey}
            >
              {isSavingGpKey ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              {gpPasswordMode === 'save' ? (hasStoredGpKey ? 'Update Password' : 'Save Encrypted') : 'Decrypt'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  )
}
