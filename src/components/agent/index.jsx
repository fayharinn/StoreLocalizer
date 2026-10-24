import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { toast } from 'sonner'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import {
  Bot,
  Send,
  Square,
  Trash2,
  Wrench,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Minus,
  Loader2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  KeyRound,
  Unlock,
  X,
  Sparkles,
  AlertTriangle,
  Terminal,
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Separator } from '@/components/ui/separator'
import { PROVIDERS } from '@/services/translationService'
import { TOOL_CAPABLE_PROVIDERS, runAgentLoop, trimHistory } from '@/services/agentService'
import { buildAgentTools, buildAgentSystemPrompt, truncateToolResult, AGENT_TOOL_COUNT, WRITE_TOOL_NAMES, fetchScreenshotsForLocale, NotConfiguredError } from '@/services/agentTools'
import { hasValidToken as ascHasValidToken, getVersionLocalizations as ascGetVersionLocalizations } from '@/services/appStoreConnectService'
import { decrypt } from '@/utils/crypto'
import ApprovalPanel from './ApprovalPanel'
import { AGENT_COMMANDS, isCommand, matchCommands, runCommand } from './commands'

// Same key as AppSidebar / useAppStoreConnect — the .p8 saved encrypted with a password
const ENCRYPTED_KEY_STORAGE = 'asc-encrypted-p8-key'

const AGENT_MESSAGES_KEY = 'xcstrings-localizer-agent-messages'
const AGENT_SETTINGS_KEY = 'xcstrings-localizer-agent-settings'

const SUGGESTIONS = [
  'List my App Store Connect apps',
  'Show the localizations of the latest version of my app',
  'Translate the "What\'s New" of my latest version to French and German, then update those locales',
  'Which languages are missing translations in my loaded .xcstrings file?',
]

function loadStoredMessages() {
  try {
    const raw = window.localStorage.getItem(AGENT_MESSAGES_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function loadStoredSettings() {
  try {
    const raw = window.localStorage.getItem(AGENT_SETTINGS_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

// Pick a model that is actually selectable for the provider. Providers without
// a free-form model input fall back to their default when the stored/configured
// model is no longer in their list.
function resolveModel(providerId, preferred, configuredModel) {
  const cfg = PROVIDERS[providerId]
  const list = cfg?.models || []
  if (cfg?.customModelInput) return preferred || configuredModel || cfg?.defaultModel || ''
  if (preferred && list.includes(preferred)) return preferred
  if (configuredModel && list.includes(configuredModel)) return configuredModel
  return cfg?.defaultModel || list[0] || ''
}

// Markdown rendering for assistant messages (react-markdown is safe by
// default — raw HTML in model output is escaped, not injected).
const markdownComponents = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  ul: ({ children }) => <ul className="list-disc pl-5 mb-2 space-y-1 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-5 mb-2 space-y-1 last:mb-0">{children}</ol>,
  li: ({ children }) => <li className="marker:text-muted-foreground">{children}</li>,
  h1: ({ children }) => <p className="font-semibold mt-3 mb-1 first:mt-0">{children}</p>,
  h2: ({ children }) => <p className="font-semibold mt-3 mb-1 first:mt-0">{children}</p>,
  h3: ({ children }) => <p className="font-semibold mt-3 mb-1 first:mt-0">{children}</p>,
  h4: ({ children }) => <p className="font-semibold mt-3 mb-1 first:mt-0">{children}</p>,
  h5: ({ children }) => <p className="font-semibold mt-3 mb-1 first:mt-0">{children}</p>,
  h6: ({ children }) => <p className="font-semibold mt-3 mb-1 first:mt-0">{children}</p>,
  a: ({ href, children }) => (
    <a href={href} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">
      {children}
    </a>
  ),
  code: ({ children }) => (
    <code className="rounded border border-border/50 bg-background/70 px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
  ),
  pre: ({ children }) => (
    <pre className="mb-2 last:mb-0 overflow-x-auto rounded-md border border-border/50 bg-background/70 p-3 text-xs [&_code]:border-0 [&_code]:bg-transparent [&_code]:p-0">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-2 border-border pl-3 text-muted-foreground mb-2 last:mb-0">{children}</blockquote>
  ),
  table: ({ children }) => (
    <div className="overflow-x-auto mb-2 last:mb-0">
      <table className="w-full border-collapse text-xs">{children}</table>
    </div>
  ),
  th: ({ children }) => <th className="border border-border/50 bg-muted/60 px-2 py-1 text-left font-semibold">{children}</th>,
  td: ({ children }) => <td className="border border-border/50 px-2 py-1 align-top">{children}</td>,
  hr: () => <hr className="my-3 border-border/60" />,
}

function Markdown({ children }) {
  return <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{children}</ReactMarkdown>
}

function prettyJson(value) {
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2)
    } catch {
      return value
    }
  }
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

// Screenshot gallery shown under an asc_list_screenshots tool call. The user
// can switch locale locally — the gallery re-fetches without touching the
// conversation history.
function ScreenshotGallery({ call, result, ascCredentials }) {
  const versionId = call.args?.versionId
  const [locale, setLocale] = useState(call.args?.locale || '')
  const [images, setImages] = useState(result.images || [])
  const [locales, setLocales] = useState(null)
  const [isSwitching, setIsSwitching] = useState(false)
  const [previewIndex, setPreviewIndex] = useState(null)

  // Arrow-key navigation while the preview modal is open
  useEffect(() => {
    if (previewIndex === null) return undefined
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') setPreviewIndex((i) => (i > 0 ? i - 1 : images.length - 1))
      if (e.key === 'ArrowRight') setPreviewIndex((i) => (i < images.length - 1 ? i + 1 : 0))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [previewIndex, images.length])

  useEffect(() => {
    let cancelled = false
    if (!versionId || !ascCredentials?.keyId) return undefined
    ascGetVersionLocalizations(ascCredentials, versionId)
      .then((locs) => { if (!cancelled) setLocales(locs.map((l) => l.locale)) })
      .catch(() => { /* switcher just stays hidden */ })
    return () => { cancelled = true }
  }, [versionId, ascCredentials])

  const handleSwitch = async (next) => {
    setLocale(next)
    setPreviewIndex(null)
    setIsSwitching(true)
    try {
      const { images: nextImages } = await fetchScreenshotsForLocale(ascCredentials, versionId, next)
      setImages(nextImages)
    } catch (error) {
      toast.error(error.message || 'Failed to load screenshots')
    } finally {
      setIsSwitching(false)
    }
  }

  return (
    <div className="border-t border-border/60 px-3 py-2 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted-foreground">
          {images.length ? `${images.length} screenshot${images.length > 1 ? 's' : ''}` : 'No screenshots'}
        </span>
        {isSwitching && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
        {locales?.length > 0 && (
          <Select value={locale} onValueChange={handleSwitch} disabled={isSwitching}>
            <SelectTrigger className="ml-auto h-7 w-[130px] text-xs" aria-label="Screenshot locale">
              <SelectValue placeholder="Locale" />
            </SelectTrigger>
            <SelectContent>
              {locales.map((l) => (
                <SelectItem key={l} value={l} className="text-xs">{l}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
      {images.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {images.map((img, i) => (
            <button
              key={`${locale}-${i}`}
              type="button"
              onClick={() => setPreviewIndex(i)}
              title={img.name}
              className="shrink-0 cursor-zoom-in"
            >
              <img
                src={img.url}
                alt={img.name}
                loading="lazy"
                onError={(e) => { e.currentTarget.style.display = 'none' }}
                className="h-36 w-auto rounded-md border border-border/50 hover:border-primary/60 transition-colors"
              />
            </button>
          ))}
        </div>
      )}

      <Dialog open={previewIndex !== null} onOpenChange={(open) => { if (!open) setPreviewIndex(null) }}>
        <DialogContent
          className="w-auto max-w-[95vw] sm:max-w-[95vw] gap-0 border-none bg-black/95 p-0 [&>button]:text-white [&>button]:z-10"
          aria-describedby={undefined}
        >
          <DialogTitle className="sr-only">Screenshot preview</DialogTitle>
          {previewIndex !== null && images[previewIndex] && (
            <div className="relative flex items-center justify-center">
              <img
                src={images[previewIndex].fullUrl || images[previewIndex].url}
                alt={images[previewIndex].name}
                className="max-h-[85vh] w-auto max-w-[90vw] rounded-lg object-contain"
              />
              {images.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() => setPreviewIndex((i) => (i > 0 ? i - 1 : images.length - 1))}
                    aria-label="Previous screenshot"
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/80"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewIndex((i) => (i < images.length - 1 ? i + 1 : 0))}
                    aria-label="Next screenshot"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/80"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
              <div className="absolute bottom-0 left-0 right-0 rounded-b-lg bg-gradient-to-t from-black/70 to-transparent p-3 text-center">
                <p className="truncate text-xs text-white/85">{images[previewIndex].name}</p>
                <p className="text-[11px] text-white/50">{previewIndex + 1} / {images.length}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Dismissible "service not configured" card shown under a failed tool call.
const CONFIG_CARDS = {
  asc: {
    name: 'App Store Connect',
    hint: 'Enter your Key ID, Issuer ID and .p8 private key in the sidebar (App Store Connect section), then try again.',
  },
  gp: {
    name: 'Google Play',
    hint: 'Load your service account JSON in the sidebar (Google Play section), then try again.',
  },
  appcompete: {
    name: 'AppCompete',
    hint: 'Enter your AppCompete API key in the sidebar (AppCompete section), then try again.',
  },
}

// When a service isn't configured, the model often answers "please connect X in
// the sidebar" without calling any tool (the system prompt told it). Detect that
// case from the assistant's text so the config card still shows in the chat.
function detectUnconfiguredService(content, { ascReady, gpReady, appCompeteReady }) {
  if (!content) return null
  if (!/not configured|n't configured|connect your|add your|enter your|load your|in the sidebar/i.test(content)) return null
  if (!ascReady && /app store connect/i.test(content)) return 'asc'
  if (!gpReady && /google play/i.test(content)) return 'gp'
  if (!appCompeteReady && /appcompete/i.test(content)) return 'appcompete'
  return null
}

function ConfigNeededCard({ service, ready, unlockable, onUnlockKey, onRetry }) {
  const [dismissed, setDismissed] = useState(false)
  const [password, setPassword] = useState('')
  const [unlockError, setUnlockError] = useState('')
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const info = CONFIG_CARDS[service]
  if (dismissed || !info) return null

  const handleUnlock = async () => {
    if (!password || isUnlocking) return
    setIsUnlocking(true)
    setUnlockError('')
    try {
      const stored = window.localStorage.getItem(ENCRYPTED_KEY_STORAGE)
      const result = stored ? await decrypt(stored, password) : { success: false }
      if (result.success) {
        onUnlockKey?.(result.data)
        setUnlocked(true)
        toast.success('App Store Connect key unlocked')
      } else {
        setUnlockError('Wrong password')
      }
    } catch {
      setUnlockError('Failed to decrypt the key')
    } finally {
      setIsUnlocking(false)
    }
  }

  // Service became ready (just unlocked, or credentials added in the sidebar)
  // — offer to re-run the failed request right away.
  if (unlocked || ready) {
    return (
      <div className="relative rounded-lg border border-emerald-500/40 bg-emerald-500/5 px-3 py-2.5 pr-9">
        <div className="flex items-center gap-2 text-xs font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          {unlocked ? `${info.name} key unlocked` : `${info.name} is ready`}
        </div>
        {onRetry && (
          <div className="mt-2">
            <Button size="sm" className="h-7 text-xs" onClick={() => { setDismissed(true); onRetry() }}>
              Try again
            </Button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss"
          className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2.5 pr-9">
      <div className="flex items-center gap-2 text-xs font-medium text-amber-600 dark:text-amber-400">
        <KeyRound className="h-3.5 w-3.5 shrink-0" />
        {unlockable ? `${info.name} key is locked` : `${info.name} isn't configured`}
      </div>
      {unlockable ? (
        <div className="mt-2 space-y-1.5">
          <div className="flex items-center gap-2 max-w-sm">
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleUnlock() }}
              placeholder="Key password"
              autoComplete="off"
              className="h-8 text-xs"
            />
            <Button size="sm" className="h-8 shrink-0" onClick={handleUnlock} disabled={!password || isUnlocking}>
              {isUnlocking
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : <Unlock className="h-3.5 w-3.5 mr-1.5" />}
              Unlock
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {unlockError
              ? <span className="text-destructive">{unlockError}</span>
              : 'Enter the password you used to save your .p8 key.'}
          </p>
        </div>
      ) : (
        <p className="mt-1 text-[11px] text-muted-foreground">{info.hint}</p>
      )}
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss"
        className="absolute right-2 top-2 rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-muted hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

// How a write tool call got its green light, shown as a small badge on the card
const APPROVAL_LABELS = {
  once: 'allowed once',
  always: 'always allowed',
  batch: 'batch allowed',
  auto: 'auto-approved',
}

function ToolCallCard({ call, result, isAwaitingApproval, isRunning, writeTool, ascCredentials, ascUnlockable, onUnlockKey, serviceReady, onRetry }) {
  let StatusIcon = Minus
  let statusClass = 'text-muted-foreground/50'
  let statusLabel = 'cancelled'
  if (isAwaitingApproval) {
    StatusIcon = ShieldAlert
    statusClass = 'text-amber-500'
    statusLabel = 'awaiting approval'
  } else if (result?.approval === 'rejected') {
    StatusIcon = XCircle
    statusClass = 'text-muted-foreground'
    statusLabel = 'rejected'
  } else if (result) {
    StatusIcon = result.isError ? XCircle : CheckCircle2
    statusClass = result.isError ? 'text-destructive' : 'text-emerald-500'
    statusLabel = result.isError ? 'error' : 'done'
  } else if (isRunning) {
    StatusIcon = Loader2
    statusClass = 'text-muted-foreground animate-spin'
    statusLabel = 'running'
  }

  return (
    <div className="space-y-2">
      <Collapsible className="rounded-lg border border-border/60 bg-muted/30">
      <CollapsibleTrigger className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted/50 rounded-lg transition-colors">
        <Wrench className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="font-mono font-medium truncate">{call.name}</span>
        {writeTool && (
          <Badge variant="outline" className="h-4 px-1.5 text-[10px] border-amber-500/50 text-amber-600 dark:text-amber-400">
            write
          </Badge>
        )}
        {writeTool && APPROVAL_LABELS[result?.approval] && (
          <Badge variant="outline" className="h-4 px-1.5 text-[10px] text-muted-foreground font-normal">
            {APPROVAL_LABELS[result.approval]}
          </Badge>
        )}
        <span className="ml-auto flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0">
          {statusLabel}
          <StatusIcon className={`h-3.5 w-3.5 ${statusClass}`} />
          <ChevronDown className="h-3 w-3" />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="border-t border-border/60 px-3 py-2 space-y-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Arguments</div>
            <pre className="text-[11px] font-mono bg-background/60 rounded-md p-2 overflow-x-auto max-h-40 overflow-y-auto whitespace-pre-wrap break-all">{prettyJson(call.args || {})}</pre>
          </div>
          {result && (
            <div>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Result</div>
              <pre className={`text-[11px] font-mono rounded-md p-2 overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap break-all ${result.isError ? 'bg-destructive/10 text-destructive' : 'bg-background/60'}`}>{prettyJson(result.content)}</pre>
            </div>
          )}
        </div>
      </CollapsibleContent>
      {call.name === 'asc_list_screenshots' && result && !result.isError && (
        <ScreenshotGallery call={call} result={result} ascCredentials={ascCredentials} />
      )}
      </Collapsible>
      {result?.configError && (
        <ConfigNeededCard
          service={result.configError}
          ready={serviceReady?.(result.configError)}
          unlockable={result.configError === 'asc' && ascUnlockable}
          onUnlockKey={onUnlockKey}
          onRetry={onRetry}
        />
      )}
    </div>
  )
}

export default function AgentPage({ aiConfig, ascCredentials, onAscCredentialsChange, gpCredentials, appCompeteConfig, xcstringsData, fileName }) {
  const storedSettings = useMemo(loadStoredSettings, [])

  const capableProviders = useMemo(
    () => TOOL_CAPABLE_PROVIDERS.filter((id) => PROVIDERS[id]),
    []
  )

  const [provider, setProvider] = useState(() => {
    if (storedSettings.provider && capableProviders.includes(storedSettings.provider)) return storedSettings.provider
    if (capableProviders.includes(aiConfig.provider) && aiConfig.apiKeys[aiConfig.provider]) return aiConfig.provider
    const firstWithKey = capableProviders.find((id) => aiConfig.apiKeys[id])
    return firstWithKey || capableProviders[0]
  })
  const [model, setModel] = useState(() =>
    resolveModel(provider, storedSettings.model, aiConfig.models[provider])
  )
  const [autoApprove, setAutoApprove] = useState(() => !!storedSettings.autoApprove)
  // Write tools the user chose to never be asked about again ("Always allow")
  const [alwaysAllow, setAlwaysAllow] = useState(() => {
    const stored = Array.isArray(storedSettings.alwaysAllow) ? storedSettings.alwaysAllow : []
    return new Set(stored.filter((name) => WRITE_TOOL_NAMES.has(name)))
  })

  const [messages, setMessages] = useState(loadStoredMessages)
  const [input, setInput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [pendingApproval, setPendingApproval] = useState(null) // { call, batch, resolve }

  const abortRef = useRef(null)
  const autoApproveRef = useRef(autoApprove)
  const alwaysAllowRef = useRef(alwaysAllow)
  // "Allow all in this turn" decision, scoped to one batch of tool calls
  const batchDecisionRef = useRef(null) // { key, decision: 'allow' | 'reject' }
  const pendingApprovalRef = useRef(null)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    autoApproveRef.current = autoApprove
  }, [autoApprove])

  // The ref is written synchronously (not via the effect above) because a
  // decision taken mid-run must apply to the very next tool call, before React
  // has re-rendered.
  const allowTools = (names) => {
    const next = new Set(alwaysAllowRef.current)
    for (const name of names) next.add(name)
    alwaysAllowRef.current = next
    setAlwaysAllow(next)
  }

  const askTools = (names) => {
    const next = names ? new Set(alwaysAllowRef.current) : new Set()
    if (names) for (const name of names) next.delete(name)
    alwaysAllowRef.current = next
    setAlwaysAllow(next)
  }

  useEffect(() => {
    pendingApprovalRef.current = pendingApproval
  }, [pendingApproval])

  // Persist conversation + settings
  useEffect(() => {
    try {
      window.localStorage.setItem(AGENT_MESSAGES_KEY, JSON.stringify(messages.slice(-200)))
    } catch { /* storage full — conversation just won't persist */ }
  }, [messages])

  useEffect(() => {
    try {
      window.localStorage.setItem(
        AGENT_SETTINGS_KEY,
        JSON.stringify({ provider, model, autoApprove, alwaysAllow: [...alwaysAllow] })
      )
    } catch { /* non-fatal */ }
  }, [provider, model, autoApprove, alwaysAllow])

  // Abort any in-flight run when leaving the page
  useEffect(() => {
    return () => {
      pendingApprovalRef.current?.resolve('reject')
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, pendingApproval, isRunning])

  const apiKey = aiConfig.apiKeys[provider] || ''
  const agentConfig = useMemo(
    () => ({
      provider,
      apiKey,
      model,
      region: aiConfig.region,
      endpoint: aiConfig.endpoint,
      serviceTier: aiConfig.serviceTier,
    }),
    [provider, apiKey, model, aiConfig.region, aiConfig.endpoint, aiConfig.serviceTier]
  )

  const modelOptions = useMemo(() => {
    const cfg = PROVIDERS[provider]
    const base = cfg?.models || []
    if (!cfg?.customModelInput) return base
    const extra = [...new Set([aiConfig.models[provider], model].filter((m) => m && !base.includes(m)))]
    return [...base, ...extra]
  }, [provider, aiConfig.models, model])

  const ascReady = !!(
    ascCredentials?.keyId &&
    ascCredentials?.issuerId &&
    (ascCredentials?.privateKey || ascHasValidToken(ascCredentials.keyId, ascCredentials.issuerId))
  )
  const gpReady = !!gpCredentials?.serviceAccountJson
  const appCompeteReady = !!appCompeteConfig?.apiKey
  // Key ID + Issuer ID are saved and an encrypted .p8 exists — the user only
  // needs to unlock it with their password (no need to re-enter credentials).
  const ascUnlockable = !ascReady &&
    !!ascCredentials?.keyId &&
    !!ascCredentials?.issuerId &&
    !!onAscCredentialsChange &&
    !!window.localStorage.getItem(ENCRYPTED_KEY_STORAGE)
  const handleUnlockKey = (privateKey) => {
    onAscCredentialsChange?.((prev) => ({ ...prev, privateKey }))
  }
  const serviceReady = (s) => (s === 'asc' ? ascReady : s === 'gp' ? gpReady : appCompeteReady)

  // Map tool results to their originating call for rendering
  const resultsByCallId = useMemo(() => {
    const map = {}
    for (const m of messages) {
      if (m.role === 'tool' && m.toolCallId) map[m.toolCallId] = m
    }
    return map
  }, [messages])

  // Services that already show a config card via a failed tool call — don't
  // duplicate the card under the assistant's text message.
  const servicesWithConfigError = useMemo(() => {
    const set = new Set()
    for (const m of messages) {
      if (m.role === 'tool' && m.configError) set.add(m.configError)
    }
    return set
  }, [messages])

  const handleProviderChange = (next) => {
    setProvider(next)
    setModel(resolveModel(next, null, aiConfig.models[next]))
  }

  const handleClear = () => {
    if (isRunning) return
    setMessages([])
    toast.success('Conversation cleared')
  }

  const handleStop = () => {
    pendingApprovalRef.current?.resolve('reject')
    setPendingApproval(null)
    abortRef.current?.abort()
  }

  // decision: 'once' | 'always' | 'batch' | 'reject' | 'reject-batch'
  const handleApproval = useCallback((decision) => {
    pendingApprovalRef.current?.resolve(decision)
    setPendingApproval(null)
  }, [])

  // Decide whether a write call may run: auto-approve > always-allowed tool >
  // a batch decision already taken for this turn > ask the user.
  // Returns 'auto' | 'always' | 'batch' | 'once' | 'rejected' | 'rejected-batch'.
  const resolveApproval = async (tool, call, batch, signal) => {
    if (!tool.write) return 'auto'
    if (autoApproveRef.current) return 'auto'
    if (alwaysAllowRef.current.has(call.name)) return 'always'

    const batchDecision = batch?.key && batchDecisionRef.current?.key === batch.key
      ? batchDecisionRef.current.decision
      : null
    if (batchDecision) return batchDecision === 'allow' ? 'batch' : 'rejected-batch'

    const decision = await new Promise((resolve) => setPendingApproval({ call, batch, resolve }))
    if (signal.aborted) throw new DOMException('The agent run was stopped', 'AbortError')

    if (decision === 'always') {
      allowTools([call.name])
      return 'always'
    }
    if (decision === 'batch') {
      if (batch?.key) batchDecisionRef.current = { key: batch.key, decision: 'allow' }
      return 'batch'
    }
    if (decision === 'reject-batch') {
      if (batch?.key) batchDecisionRef.current = { key: batch.key, decision: 'reject' }
      return 'rejected-batch'
    }
    return decision === 'once' ? 'once' : 'rejected'
  }

  const executeToolCall = async (call, toolMap, signal, batch) => {
    const tool = toolMap[call.name]
    if (!tool) {
      return { content: JSON.stringify({ error: `Unknown tool: ${call.name}` }), isError: true }
    }

    const approval = await resolveApproval(tool, call, batch, signal)
    if (approval === 'rejected' || approval === 'rejected-batch') {
      const error = approval === 'rejected-batch'
        ? 'The user rejected this action and every remaining action of this turn. Do not retry — ask the user what to do instead.'
        : 'Action rejected by the user. Do not retry — ask the user what to do instead.'
      return { content: JSON.stringify({ error }), isError: true, approval: 'rejected' }
    }

    try {
      const result = await tool.execute(call.args || {})
      // Tools may attach images (screenshots) alongside their JSON payload
      const images = Array.isArray(result?.images) ? result.images : undefined
      const data = images ? { ...result, images: undefined } : result
      return { content: truncateToolResult(JSON.stringify(data ?? { success: true })), isError: false, images, approval }
    } catch (error) {
      return {
        content: JSON.stringify({ error: error.message || String(error) }),
        isError: true,
        approval,
        configError: error instanceof NotConfiguredError ? error.service : undefined,
      }
    }
  }

  const runMessage = async (text, baseMessages) => {
    if (!text || isRunning) return
    if (!agentConfig.apiKey) {
      toast.error(`Add an API key for ${PROVIDERS[provider]?.name || provider} in the sidebar first`)
      return
    }

    const userMessage = { role: 'user', content: text }
    // `note` messages are local (command output) — never sent to the model
    const history = trimHistory([...baseMessages, userMessage].filter((m) => m.role !== 'note'))
    setMessages([...baseMessages, userMessage])
    setIsRunning(true)

    const controller = new AbortController()
    abortRef.current = controller
    batchDecisionRef.current = null

    const ctx = { ascCredentials, gpCredentials, appCompeteConfig, aiConfig: agentConfig, xcstringsData, fileName }
    const tools = buildAgentTools(ctx)
    const toolMap = Object.fromEntries(tools.map((t) => [t.name, t]))

    try {
      await runAgentLoop({
        config: agentConfig,
        systemPrompt: buildAgentSystemPrompt({
          ascConfigured: ascReady,
          gpConfigured: gpReady,
          appCompeteConfigured: appCompeteReady,
          xcstringsFileName: xcstringsData ? fileName : null,
        }),
        history,
        tools,
        executeTool: (call, batch) => executeToolCall(call, toolMap, controller.signal, batch),
        onEvent: ({ message }) => {
          // Tag assistant messages that point at an unconfigured service, so the
          // config card stays mounted after the service is unlocked (and can
          // offer "Try again") instead of disappearing mid-conversation.
          if (message.role === 'assistant' && !message.toolCalls?.length) {
            const needed = detectUnconfiguredService(message.content, { ascReady, gpReady, appCompeteReady })
            if (needed) message = { ...message, configNeeded: needed }
          }
          setMessages((prev) => [...prev, message])
        },
        signal: controller.signal,
      })
    } catch (error) {
      if (error.name === 'AbortError') {
        setMessages((prev) => [...prev, { role: 'assistant', content: '⏹️ Stopped.', toolCalls: [] }])
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: `❌ ${error.message}`, toolCalls: [] }])
      }
    } finally {
      setIsRunning(false)
      abortRef.current = null
      batchDecisionRef.current = null
      setPendingApproval(null)
    }
  }

  // Slash commands never reach the model — they are answered locally with a
  // `note` message in the transcript.
  const handleCommand = (text) => {
    const result = runCommand(text, {
      autoApprove,
      alwaysAllow: alwaysAllowRef.current,
      setAutoApprove,
      allowTools,
      askTools,
      clearConversation: () => {
        setMessages([])
        toast.success('Conversation cleared')
      },
    })
    if (result) {
      setMessages((prev) => [...prev, { role: 'note', command: text, content: result.note, tone: result.tone }])
    }
  }

  const handleSend = () => {
    const text = input.trim()
    if (!text) return
    if (isCommand(text)) {
      setInput('')
      handleCommand(text)
      return
    }
    setInput('')
    runMessage(text, messages)
  }

  // Re-run the last user request, dropping the failed exchange that followed it
  const handleRetry = () => {
    if (isRunning) return
    const lastUserIdx = messages.map((m) => m.role).lastIndexOf('user')
    if (lastUserIdx === -1) return
    runMessage(messages[lastUserIdx].content, messages.slice(0, lastUserIdx))
  }

  // Command suggestions shown above the composer while typing "/…"
  const commandMatches = useMemo(() => matchCommands(input), [input])

  const completeCommand = (command) => {
    setInput(`${command.name} `)
    textareaRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Tab' && commandMatches.length > 0 && !/\s/.test(input.trim())) {
      e.preventDefault()
      completeCommand(commandMatches[0])
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  // Grow the composer with its content (capped by max-h) so long prompts stay visible
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }, [input])

  const noProviderConfigured = !capableProviders.some((id) => aiConfig.apiKeys[id])

  const approvalMode = autoApprove
    ? { label: 'Auto-approve', icon: <ShieldCheck className="h-3.5 w-3.5 text-amber-500" /> }
    : alwaysAllow.size > 0
      ? { label: `${alwaysAllow.size} always allowed`, icon: <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> }
      : { label: 'Ask every write', icon: <ShieldAlert className="h-3.5 w-3.5 text-muted-foreground" /> }

  return (
    <div className="flex h-full min-h-[480px] flex-col gap-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 shrink-0">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold leading-tight tracking-tight">Agent</h1>
            <p className="text-[11px] leading-tight text-muted-foreground">{AGENT_TOOL_COUNT} tools available to the model</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {[
            ['App Store Connect', ascReady],
            ['Google Play', gpReady],
            ['AppCompete', appCompeteReady],
            [xcstringsData && fileName ? fileName : '.xcstrings', !!xcstringsData],
          ].map(([label, ready]) => (
            <Badge key={label} variant="outline" className={`h-6 gap-1.5 font-normal ${ready ? 'text-foreground' : 'text-muted-foreground'}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${ready ? 'bg-emerald-500' : 'bg-muted-foreground/40'}`} />
              <span className="max-w-[160px] truncate">{label}</span>
            </Badge>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Select value={provider} onValueChange={handleProviderChange} disabled={isRunning}>
            <SelectTrigger className="h-8 w-[150px] text-xs" aria-label="Provider">
              <SelectValue placeholder="Provider" />
            </SelectTrigger>
            <SelectContent>
              {capableProviders.map((id) => (
                <SelectItem key={id} value={id}>
                  {PROVIDERS[id].name}
                  {!aiConfig.apiKeys[id] && <span className="text-muted-foreground"> — no API key</span>}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={model} onValueChange={setModel} disabled={isRunning}>
            <SelectTrigger className="h-8 w-[180px] text-xs" aria-label="Model">
              <SelectValue placeholder="Model" />
            </SelectTrigger>
            <SelectContent>
              {modelOptions.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-8 gap-1.5 font-normal" aria-label="Write approvals">
              {approvalMode.icon}
              <span className="text-xs">{approvalMode.label}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-[330px] p-0">
            <div className="px-3 py-2.5">
              <p className="text-sm font-medium">Write approvals</p>
              <p className="text-[11px] text-muted-foreground">
                Which actions on App Store Connect / Google Play can run without asking.
              </p>
            </div>
            <Separator />
            <div className="flex items-start gap-3 px-3 py-2.5">
              <Switch id="agent-auto-approve" className="mt-0.5" checked={autoApprove} onCheckedChange={setAutoApprove} />
              <div className="min-w-0 space-y-0.5">
                <Label htmlFor="agent-auto-approve" className="cursor-pointer text-xs font-medium">
                  {autoApprove ? <ShieldCheck className="h-3.5 w-3.5 text-amber-500" /> : <ShieldAlert className="h-3.5 w-3.5" />}
                  Auto-approve every write
                </Label>
                <p className="text-[11px] text-muted-foreground">
                  Skips the prompt for all {WRITE_TOOL_NAMES.size} write tools, including ones you never allowed.
                </p>
              </div>
            </div>
            <Separator />
            <div className="px-3 py-2.5 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium">Always allowed</p>
                {alwaysAllow.size > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-[11px] text-muted-foreground"
                    onClick={() => askTools(null)}
                  >
                    Revoke all
                  </Button>
                )}
              </div>
              {alwaysAllow.size === 0 ? (
                <p className="text-[11px] text-muted-foreground">
                  Nothing yet. Hit <span className="font-medium">Always allow</span> on an approval, or type{' '}
                  <code className="rounded bg-muted px-1 py-0.5 font-mono">/allow &lt;tool&gt;</code>.
                </p>
              ) : (
                <div className="max-h-44 space-y-1 overflow-y-auto">
                  {[...alwaysAllow].sort().map((name) => (
                    <div key={name} className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1">
                      <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      <span className="truncate font-mono text-[11px]">{name}</span>
                      <button
                        type="button"
                        onClick={() => askTools([name])}
                        aria-label={`Ask again for ${name}`}
                        className="ml-auto rounded p-0.5 text-muted-foreground/70 transition-colors hover:bg-background hover:text-foreground"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-muted-foreground"
            onClick={handleClear}
            disabled={isRunning || messages.length === 0}
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Clear
          </Button>
        </div>
      </div>

      {!agentConfig.apiKey && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-600 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>
            {noProviderConfigured
              ? 'No function-calling provider has an API key yet. Add one in the sidebar (OpenAI, Anthropic, Gemini, xAI, Mistral, OpenRouter, Azure, Bedrock, GitHub Models or DeepSeek).'
              : `No API key configured for ${PROVIDERS[provider]?.name || provider}. Add it in the sidebar or pick another provider.`}
          </span>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-border/60 bg-card">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="mx-auto w-full max-w-3xl space-y-4 p-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
                  <Bot className="h-6 w-6 text-primary" />
                </div>
                <p className="text-sm font-medium mb-1">Ask the agent to do something</p>
                <p className="text-xs text-muted-foreground mb-5 max-w-sm">
                  It can list your apps, read and update store metadata, translate content, and more — with your approval on every write.
                </p>
                <div className="flex flex-col gap-2 w-full max-w-md">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => setInput(s)}
                      className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-left text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <p className="mt-4 text-[11px] text-muted-foreground">
                  Type <code className="rounded bg-muted px-1 py-0.5 font-mono">/help</code> for commands
                  ({AGENT_COMMANDS.map((c) => c.name).join(', ')}).
                </p>
              </div>
            )}

            {messages.map((m, i) => {
              if (m.role === 'note') {
                return (
                  <div key={i} className="flex justify-center">
                    <div
                      className={`w-full max-w-[92%] rounded-lg border px-3 py-2 text-xs ${
                        m.tone === 'error'
                          ? 'border-destructive/40 bg-destructive/5 text-destructive'
                          : 'border-border/60 bg-muted/30 text-muted-foreground'
                      }`}
                    >
                      {m.command && (
                        <div className="mb-1 flex items-center gap-1.5 font-mono text-[11px] text-foreground/70">
                          <Terminal className="h-3 w-3" />
                          {m.command}
                        </div>
                      )}
                      <Markdown>{m.content}</Markdown>
                    </div>
                  </div>
                )
              }
              if (m.role === 'user') {
                return (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground whitespace-pre-wrap break-words">
                      {m.content}
                    </div>
                  </div>
                )
              }
              if (m.role === 'assistant') {
                const unconfigured = m.configNeeded || detectUnconfiguredService(m.content, { ascReady, gpReady, appCompeteReady })
                return (
                  <div key={i} className="flex gap-3">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 shrink-0 mt-0.5">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="min-w-0 flex-1 space-y-2">
                      {m.content && (
                        <div className="rounded-2xl rounded-tl-sm bg-muted/50 px-4 py-2.5 text-sm break-words max-w-[90%]">
                          <Markdown>{m.content}</Markdown>
                        </div>
                      )}
                      {unconfigured && !servicesWithConfigError.has(unconfigured) && (
                        <ConfigNeededCard
                          service={unconfigured}
                          ready={serviceReady(unconfigured)}
                          unlockable={unconfigured === 'asc' && ascUnlockable}
                          onUnlockKey={handleUnlockKey}
                          onRetry={handleRetry}
                        />
                      )}
                      {(m.toolCalls || []).map((call) => (
                        <ToolCallCard
                          key={call.id}
                          call={call}
                          result={resultsByCallId[call.id]}
                          isAwaitingApproval={pendingApproval?.call?.id === call.id}
                          isRunning={isRunning}
                          writeTool={WRITE_TOOL_NAMES.has(call.name)}
                          ascCredentials={ascCredentials}
                          ascUnlockable={ascUnlockable}
                          onUnlockKey={handleUnlockKey}
                          serviceReady={serviceReady}
                          onRetry={handleRetry}
                        />
                      ))}
                    </div>
                  </div>
                )
              }
              return null // tool results are rendered inside their ToolCallCard
            })}

            {isRunning && !pendingApproval && (
              <div className="flex items-center gap-2 pl-10 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                Thinking…
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>

        <div className="shrink-0 space-y-2 border-t border-border/60 bg-card/80 p-3">
          <div className="mx-auto w-full max-w-3xl space-y-2">
            {pendingApproval && (
              <div className="max-h-[45vh] overflow-y-auto">
                <ApprovalPanel
                  pending={pendingApproval}
                  alwaysAllow={alwaysAllow}
                  onDecide={handleApproval}
                  prettyJson={prettyJson}
                />
              </div>
            )}

            <div className="rounded-xl border border-border/60 bg-muted/30 transition-colors focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20">
              {commandMatches.length > 0 && (
                <div className="border-b border-border/60 p-1">
                  {commandMatches.map((c, idx) => (
                    <button
                      key={c.name}
                      type="button"
                      onClick={() => completeCommand(c)}
                      className={`flex w-full items-baseline gap-2 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-muted ${idx === 0 ? 'bg-muted/60' : ''}`}
                    >
                      <span className="font-mono text-xs">{c.usage}</span>
                      <span className="truncate text-[11px] text-muted-foreground">{c.description}</span>
                      {idx === 0 && (
                        <kbd className="ml-auto shrink-0 rounded border border-border px-1 text-[9px] leading-[14px] text-muted-foreground">Tab</kbd>
                      )}
                    </button>
                  ))}
                </div>
              )}
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder='e.g. "Translate the description of my latest version to Spanish and update it" — or / for commands'
                rows={1}
                className="max-h-40 min-h-[44px] resize-none border-0 bg-transparent shadow-none text-sm focus-visible:ring-0"
                disabled={isRunning}
              />
              <div className="flex items-center justify-between gap-2 px-3 pb-2.5">
                <span className="text-[11px] text-muted-foreground">
                  Enter to send · Shift+Enter for a new line · <span className="font-mono">/</span> for commands
                </span>
                {isRunning ? (
                  <Button variant="destructive" size="sm" className="h-8" onClick={handleStop}>
                    <Square className="h-3.5 w-3.5 mr-1.5" />
                    Stop
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="h-8"
                    onClick={handleSend}
                    disabled={!input.trim() || !agentConfig.apiKey}
                  >
                    <Send className="h-3.5 w-3.5 mr-1.5" />
                    Send
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
