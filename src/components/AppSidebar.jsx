import { useState } from 'react'
import { FileText, Globe, ChevronDown, Key, Cpu, Trash2, ExternalLink, Lock, Unlock, Save, Languages, Store, Sparkles, CheckCircle2, AlertCircle, Link2, AppWindow, Layers, TrendingUp, Terminal, Image, Moon, Sun, Monitor, DollarSign, Play } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
import { PROVIDERS } from '@/services/translationService'
import { encrypt, decrypt } from '@/utils/crypto'

const ENCRYPTED_KEY_STORAGE = 'asc-encrypted-p8-key'

export function AppSidebar({
  activePage,
  onPageChange,
  providerConfig,
  onProviderConfigChange,
  ascCredentials,
  onAscCredentialsChange,
  gpCredentials,
  onGpCredentialsChange
}) {
  const { theme, setTheme } = useTheme()
  const [isDraggingKey, setIsDraggingKey] = useState(false)
  const [isDraggingGpKey, setIsDraggingGpKey] = useState(false)
  const [aiSettingsOpen, setAiSettingsOpen] = useState(true)
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
      setShowPasswordInput(false)
      setKeyPassword('')
      setPasswordMode('')
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
      setShowPasswordInput(false)
      setKeyPassword('')
      setPasswordMode('')
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
      setShowGpPasswordInput(false)
      setGpKeyPassword('')
      setGpPasswordMode('')
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
      setShowGpPasswordInput(false)
      setGpKeyPassword('')
      setGpPasswordMode('')
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
    <Sidebar variant="inset" collapsible="offcanvas">
      <SidebarHeader className="border-b border-sidebar-border/50 bg-gradient-to-b from-sidebar to-sidebar/80">
        <div className="flex items-center gap-3 px-3 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 shadow-lg shadow-violet-500/25">
            <Globe className="h-5 w-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-base font-bold tracking-tight">Localizer</span>
            <span className="text-xs text-muted-foreground">App Store & Play Store</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2">
        {/* Navigation */}
        <SidebarGroup className="pt-4">
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70 px-2 mb-2">Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activePage === 'xcstrings'}
                  onClick={() => onPageChange('xcstrings')}
                  tooltip="XCStrings Translator"
                  className={`rounded-xl h-11 px-3 transition-all duration-200 ${
                    activePage === 'xcstrings'
                      ? 'bg-primary/10 text-primary font-medium shadow-sm'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <Languages className={`h-5 w-5 ${activePage === 'xcstrings' ? 'text-primary' : ''}`} />
                  <span>XCStrings</span>
                  {activePage === 'xcstrings' && (
                    <div className="ml-auto h-2 w-2 rounded-full bg-primary animate-pulse" />
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activePage === 'appstore'}
                  onClick={() => onPageChange('appstore')}
                  tooltip="App Store Connect"
                  className={`rounded-xl h-11 px-3 transition-all duration-200 ${
                    activePage === 'appstore'
                      ? 'bg-primary/10 text-primary font-medium shadow-sm'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <Store className={`h-5 w-5 ${activePage === 'appstore' ? 'text-primary' : ''}`} />
                  <span>App Store Connect</span>
                  {activePage === 'appstore' && (
                    <div className="ml-auto h-2 w-2 rounded-full bg-primary animate-pulse" />
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activePage === 'googleplay'}
                  onClick={() => onPageChange('googleplay')}
                  tooltip="Google Play Console"
                  className={`rounded-xl h-11 px-3 transition-all duration-200 ${
                    activePage === 'googleplay'
                      ? 'bg-primary/10 text-primary font-medium shadow-sm'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <Play className={`h-5 w-5 ${activePage === 'googleplay' ? 'text-primary' : ''}`} />
                  <span>Google Play</span>
                  {activePage === 'googleplay' && (
                    <div className="ml-auto h-2 w-2 rounded-full bg-primary animate-pulse" />
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activePage === 'screenshots'}
                  onClick={() => onPageChange('screenshots')}
                  tooltip="Screenshot Maker"
                  className={`rounded-xl h-11 px-3 transition-all duration-200 ${
                    activePage === 'screenshots'
                      ? 'bg-primary/10 text-primary font-medium shadow-sm'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <Image className={`h-5 w-5 ${activePage === 'screenshots' ? 'text-primary' : ''}`} />
                  <span>Screenshots</span>
                  {activePage === 'screenshots' && (
                    <div className="ml-auto h-2 w-2 rounded-full bg-primary animate-pulse" />
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  isActive={activePage === 'subscriptions'}
                  onClick={() => onPageChange('subscriptions')}
                  tooltip="Subscription Pricing & Translations"
                  className={`rounded-xl h-11 px-3 transition-all duration-200 ${
                    activePage === 'subscriptions'
                      ? 'bg-primary/10 text-primary font-medium shadow-sm'
                      : 'hover:bg-muted/50'
                  }`}
                >
                  <DollarSign className={`h-5 w-5 ${activePage === 'subscriptions' ? 'text-primary' : ''}`} />
                  <span>Subscriptions</span>
                  {activePage === 'subscriptions' && (
                    <div className="ml-auto h-2 w-2 rounded-full bg-primary animate-pulse" />
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>

            {/* App Store Connect Quick Nav - only show when on appstore page */}
            {activePage === 'appstore' && (
              <div className="mt-3 ml-3 pl-3 border-l-2 border-primary/20 space-y-1">
                <button
                  onClick={() => document.getElementById('asc-connection')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Link2 className="h-3.5 w-3.5" />
                  <span>Connection</span>
                </button>
                <button
                  onClick={() => document.getElementById('asc-app-version')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <AppWindow className="h-3.5 w-3.5" />
                  <span>App & Version</span>
                </button>
                <button
                  onClick={() => document.getElementById('asc-localizations')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Layers className="h-3.5 w-3.5" />
                  <span>Localizations</span>
                </button>
                <button
                  onClick={() => document.getElementById('asc-aso-keywords')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <TrendingUp className="h-3.5 w-3.5" />
                  <span>ASO Keywords</span>
                </button>
                <button
                  onClick={() => document.getElementById('asc-screenshots')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Image className="h-3.5 w-3.5" />
                  <span>Screenshots</span>
                </button>
                <button
                  onClick={() => document.getElementById('asc-translation')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  <span>AI Translation</span>
                </button>
                <button
                  onClick={() => document.getElementById('asc-logs')?.scrollIntoView({ behavior: 'smooth' })}
                  className="flex items-center gap-2 w-full px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                >
                  <Terminal className="h-3.5 w-3.5" />
                  <span>Activity Log</span>
                </button>
              </div>
            )}

            {/* Google Play Quick Nav - only show when on googleplay page */}
            {activePage === 'googleplay' && (
              <div className="mt-3 ml-3 pl-3 border-l-2 border-primary/20 space-y-1">
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

        <SidebarSeparator className="my-4 opacity-50" />

        {/* AI Provider Settings */}
        <Collapsible open={aiSettingsOpen} onOpenChange={setAiSettingsOpen}>
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between px-2 py-2 rounded-xl hover:bg-muted/50 transition-colors [&[data-state=open]>svg]:rotate-180">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-500/10">
                    <Sparkles className="h-4 w-4 text-violet-500" />
                  </div>
                  <span className="font-medium">AI Provider</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <CollapsibleContent>
              <SidebarGroupContent className="px-2 pt-3 space-y-4">
                {/* Provider Pills */}
                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(PROVIDERS).map(([key, provider]) => (
                    <button
                      key={key}
                      onClick={() => handleProviderChange(key)}
                      className={`
                        px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200
                        ${providerConfig.provider === key
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
                        }
                      `}
                    >
                      {provider.name}
                    </button>
                  ))}
                </div>

                {/* API Key */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground">API Key</Label>
                  <Input
                    type="password"
                    placeholder={providerConfig.provider === 'openai' ? 'sk-...' : 'Enter your API key...'}
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
                        {PROVIDERS[providerConfig.provider]?.models.map(model => (
                          <option key={model} value={model} />
                        ))}
                      </datalist>
                    </>
                  ) : (
                    <select
                      value={currentModel}
                      onChange={(e) => handleModelChange(e.target.value)}
                      className="w-full h-9 rounded-lg bg-muted/30 border border-border/50 px-3 text-sm focus:border-primary/50 focus:outline-none transition-colors"
                    >
                      {PROVIDERS[providerConfig.provider]?.models.map(model => (
                        <option key={model} value={model}>{getModelDisplayName(model)}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Service Tier for OpenAI */}
                {PROVIDERS[providerConfig.provider]?.serviceTiers && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Service Tier</Label>
                    <select
                      value={providerConfig.serviceTier || 'auto'}
                      onChange={(e) => onProviderConfigChange(prev => ({ ...prev, serviceTier: e.target.value }))}
                      className="w-full h-9 rounded-lg bg-muted/30 border border-border/50 px-3 text-sm focus:border-primary/50 focus:outline-none transition-colors"
                    >
                      {PROVIDERS[providerConfig.provider].serviceTiers.map(tier => (
                        <option key={tier} value={tier}>
                          {tier === 'auto' ? 'Auto (default)' : tier === 'priority' ? 'Priority (faster)' : tier === 'flex' ? 'Flex (cheaper)' : tier.charAt(0).toUpperCase() + tier.slice(1)}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground">
                      Priority = faster, Flex = cheaper batch processing
                    </p>
                  </div>
                )}

                {/* Endpoint URL for Azure */}
                {PROVIDERS[providerConfig.provider]?.needsEndpoint && (
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-muted-foreground">Endpoint URL</Label>
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

                {/* Status */}
                <div className="pt-1">
                  {currentApiKey ? (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                      <CheckCircle2 className="h-4 w-4" />
                      <span className="text-xs font-medium">Ready to translate</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 text-amber-500">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-xs font-medium">API key required</span>
                    </div>
                  )}
                </div>
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>

        <SidebarSeparator className="my-4 opacity-50" />

        {/* App Store Connect Settings */}
        <Collapsible open={ascSettingsOpen} onOpenChange={setAscSettingsOpen}>
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between px-2 py-2 rounded-xl hover:bg-muted/50 transition-colors [&[data-state=open]>svg]:rotate-180">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10">
                    <Key className="h-4 w-4 text-blue-500" />
                  </div>
                  <span className="font-medium">App Store Connect</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
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
                    {ascCredentials.privateKey && !showPasswordInput && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs gap-1.5"
                        onClick={() => {
                          setShowPasswordInput(true)
                          setPasswordMode('save')
                          setKeyError('')
                        }}
                      >
                        <Save className="h-3.5 w-3.5" />
                        Save Encrypted
                      </Button>
                    )}
                    {hasStoredKey && !ascCredentials.privateKey && !showPasswordInput && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1 h-8 text-xs gap-1.5"
                        onClick={() => {
                          setShowPasswordInput(true)
                          setPasswordMode('load')
                          setKeyError('')
                        }}
                      >
                        <Unlock className="h-3.5 w-3.5" />
                        Load Saved Key
                      </Button>
                    )}
                    {hasStoredKey && !showPasswordInput && (
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

                  {/* Password input for save/load */}
                  {showPasswordInput && (
                    <div className="space-y-3 p-3 rounded-xl bg-muted/30 border border-border/50 mt-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Lock className="h-3.5 w-3.5" />
                        <span className="font-medium">{passwordMode === 'save' ? 'Encrypt & save key' : 'Enter password to decrypt'}</span>
                      </div>
                      <Input
                        type="password"
                        placeholder="Enter password..."
                        value={keyPassword}
                        onChange={(e) => {
                          setKeyPassword(e.target.value)
                          setKeyError('')
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            passwordMode === 'save' ? handleSaveKeyEncrypted() : handleLoadKeyEncrypted()
                          } else if (e.key === 'Escape') {
                            handleCancelPassword()
                          }
                        }}
                        className="h-9 text-sm"
                        autoFocus
                      />
                      {keyError && (
                        <p className="text-xs text-destructive font-medium">{keyError}</p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="flex-1 h-8 text-xs"
                          onClick={passwordMode === 'save' ? handleSaveKeyEncrypted : handleLoadKeyEncrypted}
                          disabled={isSavingKey}
                        >
                          {isSavingKey ? 'Processing...' : passwordMode === 'save' ? 'Save Key' : 'Unlock'}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={handleCancelPassword}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
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

        <SidebarSeparator className="my-4 opacity-50" />

        {/* Google Play Settings */}
        <Collapsible open={gpSettingsOpen} onOpenChange={setGpSettingsOpen}>
          <SidebarGroup>
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between px-2 py-2 rounded-xl hover:bg-muted/50 transition-colors [&[data-state=open]>svg]:rotate-180">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500/10">
                    <Play className="h-4 w-4 text-green-500" />
                  </div>
                  <span className="font-medium">Google Play</span>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
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
                {showGpPasswordInput ? (
                  <div className="space-y-2 p-3 rounded-xl bg-muted/30 border border-border/50">
                    <Label className="text-xs font-medium text-muted-foreground">
                      {gpPasswordMode === 'save' ? 'Set password to encrypt' : 'Enter password to decrypt'}
                    </Label>
                    <Input
                      type="password"
                      placeholder="Password (min 4 chars)"
                      value={gpKeyPassword}
                      onChange={(e) => setGpKeyPassword(e.target.value)}
                      className="h-8 text-sm"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          gpPasswordMode === 'save' ? handleSaveGpKeyEncrypted() : handleLoadGpKeyEncrypted()
                        }
                      }}
                    />
                    {gpKeyError && <p className="text-xs text-red-500">{gpKeyError}</p>}
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={gpPasswordMode === 'save' ? handleSaveGpKeyEncrypted : handleLoadGpKeyEncrypted}
                        disabled={isSavingGpKey}
                        className="flex-1 h-8 text-xs"
                      >
                        {isSavingGpKey ? 'Processing...' : gpPasswordMode === 'save' ? 'Save Encrypted' : 'Decrypt & Load'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={handleCancelGpPassword} className="h-8 text-xs">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {gpCredentials?.serviceAccountJson && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setShowGpPasswordInput(true); setGpPasswordMode('save'); setGpKeyError('') }}
                        className="flex-1 h-8 text-xs"
                      >
                        <Save className="h-3.5 w-3.5 mr-1.5" />
                        Save Encrypted
                      </Button>
                    )}
                    {hasStoredGpKey && !gpCredentials?.serviceAccountJson && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { setShowGpPasswordInput(true); setGpPasswordMode('load'); setGpKeyError('') }}
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
                )}
              </SidebarGroupContent>
            </CollapsibleContent>
          </SidebarGroup>
        </Collapsible>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/50 bg-gradient-to-t from-sidebar to-transparent">
        <div className="px-4 py-4 space-y-4">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-muted/30">
            <span className="text-xs font-medium text-muted-foreground">Theme</span>
            <div className="flex gap-1">
              <button
                onClick={() => setTheme('light')}
                className={`p-2 rounded-lg transition-all ${
                  theme === 'light' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
                title="Light mode"
              >
                <Sun className="h-4 w-4" />
              </button>
              <button
                onClick={() => setTheme('dark')}
                className={`p-2 rounded-lg transition-all ${
                  theme === 'dark' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
                title="Dark mode"
              >
                <Moon className="h-4 w-4" />
              </button>
              <button
                onClick={() => setTheme('system')}
                className={`p-2 rounded-lg transition-all ${
                  theme === 'system' 
                    ? 'bg-primary text-primary-foreground' 
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
                title="System theme"
              >
                <Monitor className="h-4 w-4" />
              </button>
            </div>
          </div>
          
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs text-muted-foreground">Crafted with</span>
            <span className="text-red-500">♥</span>
            <span className="text-xs text-muted-foreground">by</span>
            <span className="text-xs font-semibold text-foreground">Fayhe</span>
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
