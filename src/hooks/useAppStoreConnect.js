import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import {
  testConnection,
  listApps,
  listVersions,
  getVersionLocalizations,
  getAppInfoLocalizations,
  updateVersionLocalization,
  createVersionLocalization,
  updateAppInfoLocalization,
  createAppInfoLocalization,
  translateAllFields,
  createVersion,
  getAllScreenshotsForVersion,
  hasValidToken,
  getTokenTimeLeft,
  ASC_LOCALES,
} from '@/services/appStoreConnectService'
import { PROVIDERS } from '@/services/translationService'
import { decrypt } from '@/utils/crypto'

const ENCRYPTED_KEY_STORAGE = 'asc-encrypted-p8-key'

// Version-localization fields that can be carried over from the previous version
const COPYABLE_VERSION_FIELDS = ['description', 'keywords', 'promotionalText', 'whatsNew', 'supportUrl', 'marketingUrl']

export default function useAppStoreConnect({ credentials, onCredentialsChange, aiConfig, astroConfig, appCompeteConfig, translationPrompts }) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [sessionTimeLeft, setSessionTimeLeft] = useState(0)

  useEffect(() => {
    const updateTimer = () => {
      if (credentials.keyId && credentials.issuerId) {
        setSessionTimeLeft(getTokenTimeLeft(credentials.keyId, credentials.issuerId))
      }
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [credentials.keyId, credentials.issuerId])

  const formatTimeLeft = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const [hasStoredKey] = useState(() => {
    if (typeof window === 'undefined') return false
    return !!window.localStorage.getItem(ENCRYPTED_KEY_STORAGE)
  })
  const [unlockPassword, setUnlockPassword] = useState('')
  const [isUnlocking, setIsUnlocking] = useState(false)
  const [unlockError, setUnlockError] = useState('')

  const handleUnlockKey = async () => {
    if (!unlockPassword) {
      setUnlockError('Enter password')
      return
    }

    const stored = localStorage.getItem(ENCRYPTED_KEY_STORAGE)
    if (!stored) {
      setUnlockError('No stored key found')
      return
    }

    setIsUnlocking(true)
    setUnlockError('')

    const result = await decrypt(stored, unlockPassword)

    if (result.success) {
      onCredentialsChange(prev => ({ ...prev, privateKey: result.data }))
      setUnlockPassword('')
      toast.success('Private key unlocked!')
    } else {
      setUnlockError('Wrong password')
    }

    setIsUnlocking(false)
  }

  const [apps, setApps] = useState([])
  const [selectedApp, setSelectedApp] = useState(null)
  const [appPickerOpen, setAppPickerOpen] = useState(false)
  const [versions, setVersions] = useState([])
  const [selectedVersion, setSelectedVersion] = useState(null)
  const [isLoadingApps, setIsLoadingApps] = useState(false)
  const [isLoadingVersions, setIsLoadingVersions] = useState(false)

  useEffect(() => {
    if (selectedApp) {
      sessionStorage.setItem('asc-selected-app', JSON.stringify({ id: selectedApp.id, name: selectedApp.name, bundleId: selectedApp.bundleId }))
    }
  }, [selectedApp])

  useEffect(() => {
    if (selectedVersion) {
      sessionStorage.setItem('asc-selected-version', JSON.stringify({ id: selectedVersion.id, versionString: selectedVersion.versionString }))
    }
  }, [selectedVersion])

  const [versionLocalizations, setVersionLocalizations] = useState([])
  const [appInfoLocalizations, setAppInfoLocalizations] = useState({ appInfoId: null, localizations: [] })
  const [isLoadingLocalizations, setIsLoadingLocalizations] = useState(false)

  const [previousVersionLocalizations, setPreviousVersionLocalizations] = useState([])
  const [isCopyingFromPrevious, setIsCopyingFromPrevious] = useState(false)
  const [copyConfirm, setCopyConfirm] = useState({ open: false, locales: 0, fields: [] })

  const [editedAppInfo, setEditedAppInfo] = useState({})
  const [isSavingAppInfo, setIsSavingAppInfo] = useState(false)
  const [isTranslatingAppInfo, setIsTranslatingAppInfo] = useState(null)
  const [appInfoProtectedWords, setAppInfoProtectedWords] = useState('')

  const [sourceLocale, setSourceLocale] = useState('en-US')
  const [targetLocales, setTargetLocales] = useState([])
  // Only What's New by default — translating description/keywords by accident
  // can overwrite curated store metadata in every target language.
  const [fieldsToTranslate, setFieldsToTranslate] = useState(['whatsNew'])
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationProgress, setTranslationProgress] = useState({ current: 0, total: 0, status: '' })

  const [editDialog, setEditDialog] = useState({
    open: false,
    locale: '',
    localization: null,
    type: 'version'
  })

  const [createVersionDialog, setCreateVersionDialog] = useState({
    open: false,
    versionString: '',
    platform: 'IOS',
    isCreating: false,
  })

  const [translationAlert, setTranslationAlert] = useState({
    show: false,
    success: true,
    message: '',
    errorCount: 0,
  })

  const [generatingKeywordsFor, setGeneratingKeywordsFor] = useState(null)
  const [asoExpandedLocales, setAsoExpandedLocales] = useState([])
  const [editingKeywordsFor, setEditingKeywordsFor] = useState(null)
  const [editedKeywords, setEditedKeywords] = useState('')
  const [isSavingKeywords, setIsSavingKeywords] = useState(false)
  const [astroSuggestions, setAstroSuggestions] = useState(null)
  // AppCompete (Rank Tracker / ASO) state
  const [appCompetePicker, setAppCompetePicker] = useState(null) // { locale, apps: [...] }
  const [keywordReview, setKeywordReview] = useState(null) // { locale, localeName, items: [...] }
  const [appCompeteLoadingFor, setAppCompeteLoadingFor] = useState(null) // `${locale}:${action}`

  const [screenshotsByLocale, setScreenshotsByLocale] = useState({})
  const [isLoadingScreenshots, setIsLoadingScreenshots] = useState(false)
  const [expandedScreenshotLocales, setExpandedScreenshotLocales] = useState([])
  const [screenshotPreview, setScreenshotPreview] = useState({ open: false, screenshot: null, locale: '', deviceType: '' })

  const [logs, setLogs] = useState([])

  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev.slice(-100), { message, type, timestamp }])

    if (type === 'error') {
      toast.error(message)
    } else if (type === 'success') {
      toast.success(message)
    }
  }, [])

  const currentAiApiKey = aiConfig.apiKeys[aiConfig.provider] || ''
  const currentAiModel = aiConfig.models[aiConfig.provider] || PROVIDERS[aiConfig.provider]?.defaultModel || ''

  const [isCopyingSupportUrl, setIsCopyingSupportUrl] = useState(false)
  const [isCopyingMarketingUrl, setIsCopyingMarketingUrl] = useState(false)

  useEffect(() => {
    const canAutoConnect = credentials.keyId && credentials.issuerId && hasValidToken(credentials.keyId, credentials.issuerId)

    if (canAutoConnect && apps.length === 0 && !isConnecting && !isLoadingApps) {
      console.log('[Auto-connect] Valid JWT found, connecting automatically...')
      const timer = setTimeout(() => {
        handleAutoConnect()
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAutoConnect = async () => {
    setIsConnecting(true)
    try {
      const result = await testConnection(credentials)
      if (result.success) {
        setConnectionStatus(result)
        const appsList = await listApps(credentials)
        setApps(appsList)
        addLog(`Auto-connected! Loaded ${appsList.length} apps`, 'success')

        const savedApp = sessionStorage.getItem('asc-selected-app')
        if (savedApp) {
          try {
            const appData = JSON.parse(savedApp)
            const foundApp = appsList.find(a => a.id === appData.id)
            if (foundApp) {
              setSelectedApp(foundApp)

              const versionsList = await listVersions(credentials, foundApp.id)
              setVersions(versionsList)

              const savedVersion = sessionStorage.getItem('asc-selected-version')
              if (savedVersion) {
                const versionData = JSON.parse(savedVersion)
                const foundVersion = versionsList.find(v => v.id === versionData.id)
                if (foundVersion) {
                  setSelectedVersion(foundVersion)

                  const [versionLocs, appInfoLocs] = await Promise.all([
                    getVersionLocalizations(credentials, foundVersion.id),
                    getAppInfoLocalizations(credentials, foundApp.id)
                  ])
                  setVersionLocalizations(versionLocs)
                  setAppInfoLocalizations(appInfoLocs)
                  addLog(`Restored selection: ${foundApp.name} v${foundVersion.versionString}`, 'success')
                }
              }
            }
          } catch (e) {
            console.log('[Auto-connect] Could not restore selection:', e)
          }
        }
      }
    } catch (error) {
      console.log('[Auto-connect] Failed:', error.message)
    }
    setIsConnecting(false)
  }

  const loadApps = async () => {
    setIsLoadingApps(true)
    try {
      const appsList = await listApps(credentials)
      setApps(appsList)
      addLog(`Loaded ${appsList.length} apps`, 'success')
    } catch (error) {
      addLog(`Error loading apps: ${error.message}`, 'error')
    }
    setIsLoadingApps(false)
  }

  const handleTestConnection = async () => {
    const hasPrivateKey = credentials.privateKey && credentials.privateKey.trim() !== ''
    const hasCachedToken = hasValidToken(credentials.keyId, credentials.issuerId)

    if (!credentials.keyId || !credentials.issuerId) {
      addLog('Please fill in Key ID and Issuer ID', 'error')
      return
    }

    if (!hasPrivateKey && !hasCachedToken) {
      addLog('Please upload your .p8 key or wait for a valid session', 'error')
      return
    }

    setIsConnecting(true)
    setConnectionStatus(null)

    const result = await testConnection(credentials)
    setConnectionStatus(result)

    if (result.success) {
      addLog('Successfully connected to App Store Connect!', 'success')
      loadApps()
    } else {
      addLog(`Connection failed: ${result.message}`, 'error')
    }

    setIsConnecting(false)
  }

  const handleAppSelect = async (appId) => {
    const app = apps.find(a => a.id === appId)
    setSelectedApp(app)
    setSelectedVersion(null)
    setVersionLocalizations([])
    setAppInfoLocalizations({ appInfoId: null, localizations: [] })

    if (!app) return

    setIsLoadingVersions(true)
    try {
      const versionsList = await listVersions(credentials, appId)
      setVersions(versionsList)
      addLog(`Loaded ${versionsList.length} versions for ${app.name}`, 'success')
    } catch (error) {
      addLog(`Error loading versions: ${error.message}`, 'error')
    }
    setIsLoadingVersions(false)
  }

  const handleVersionSelect = async (versionId) => {
    const version = versions.find(v => v.id === versionId)
    setSelectedVersion(version)
    setPreviousVersionLocalizations([])

    if (!version) return

    setIsLoadingLocalizations(true)
    try {
      const [versionLocs, appInfoLocs] = await Promise.all([
        getVersionLocalizations(credentials, versionId),
        getAppInfoLocalizations(credentials, selectedApp.id)
      ])
      setVersionLocalizations(versionLocs)
      setAppInfoLocalizations(appInfoLocs)
      addLog(`Loaded localizations for v${version.versionString}`, 'success')

      const versionIndex = versions.findIndex(v => v.id === versionId)
      if (versionIndex < versions.length - 1) {
        const previousVersion = versions[versionIndex + 1]
        try {
          const prevLocs = await getVersionLocalizations(credentials, previousVersion.id)
          setPreviousVersionLocalizations(prevLocs)
          addLog(`Loaded previous version (v${previousVersion.versionString}) for copying`, 'info')
        } catch {
          // Silently fail - previous version may not have localizations
        }
      }
    } catch (error) {
      addLog(`Error loading localizations: ${error.message}`, 'error')
    }
    setIsLoadingLocalizations(false)
  }

  // Copy everything (description, keywords, promo text, What's New, URLs) from
  // the previous version, overwriting current content. If existing text would be
  // replaced, a confirmation dialog is shown first (see copyConfirm state).
  const computeCopyOverwrites = () => {
    const fields = new Set()
    let locales = 0
    for (const prevLoc of previousVersionLocalizations) {
      const currentLoc = versionLocalizations.find(c => c.locale === prevLoc.locale)
      if (!currentLoc) continue
      let localeHasOverwrite = false
      for (const field of COPYABLE_VERSION_FIELDS) {
        const prevFilled = prevLoc[field] && prevLoc[field].trim() !== ''
        const currentFilled = currentLoc[field] && currentLoc[field].trim() !== ''
        if (prevFilled && currentFilled && prevLoc[field] !== currentLoc[field]) {
          fields.add(field)
          localeHasOverwrite = true
        }
      }
      if (localeHasOverwrite) locales++
    }
    return { locales, fields: [...fields] }
  }

  const handleCopyFromPreviousVersion = () => {
    if (previousVersionLocalizations.length === 0) {
      addLog('No previous version localizations available', 'error')
      return
    }

    const { locales, fields } = computeCopyOverwrites()
    if (locales > 0) {
      setCopyConfirm({ open: true, locales, fields })
      return
    }
    performCopyFromPreviousVersion()
  }

  const confirmCopyFromPreviousVersion = () => {
    setCopyConfirm({ open: false, locales: 0, fields: [] })
    performCopyFromPreviousVersion()
  }

  const performCopyFromPreviousVersion = async () => {
    setIsCopyingFromPrevious(true)
    try {
      let updatedCount = 0
      let createdCount = 0
      let errorCount = 0

      for (const prevLoc of previousVersionLocalizations) {
        const currentLoc = versionLocalizations.find(c => c.locale === prevLoc.locale)

        try {
          if (!currentLoc) {
            const content = {}
            for (const field of COPYABLE_VERSION_FIELDS) {
              if (prevLoc[field] && prevLoc[field].trim() !== '') content[field] = prevLoc[field]
            }
            if (Object.keys(content).length === 0) continue

            await createVersionLocalization(credentials, selectedVersion.id, prevLoc.locale, content)
            createdCount++
            addLog(`Created ${prevLoc.locale} with: ${Object.keys(content).join(', ')}`, 'success')
          } else {
            const updates = {}
            for (const field of COPYABLE_VERSION_FIELDS) {
              const prevFilled = prevLoc[field] && prevLoc[field].trim() !== ''
              // Overwrite with the previous version's text; skip identical values
              // to avoid useless API calls. Fields empty in the previous version
              // are left untouched (copying can't blank anything).
              if (prevFilled && prevLoc[field] !== currentLoc[field]) updates[field] = prevLoc[field]
            }
            if (Object.keys(updates).length === 0) continue

            await updateVersionLocalization(credentials, currentLoc.id, updates)
            updatedCount++
            addLog(`Copied to ${prevLoc.locale}: ${Object.keys(updates).join(', ')}`, 'success')
          }
        } catch (error) {
          errorCount++
          addLog(`Failed to copy to ${prevLoc.locale}: ${error.message}`, 'error')
        }
      }

      if (updatedCount > 0 || createdCount > 0) {
        const versionLocs = await getVersionLocalizations(credentials, selectedVersion.id)
        setVersionLocalizations(versionLocs)
      }

      const parts = []
      if (updatedCount > 0) parts.push(`${updatedCount} locale(s) updated`)
      if (createdCount > 0) parts.push(`${createdCount} locale(s) created`)
      if (parts.length === 0) parts.push('nothing to copy — all fields already filled')
      addLog(`Copy from previous version: ${parts.join(', ')}${errorCount > 0 ? `, ${errorCount} error(s)` : ''}`, errorCount > 0 ? 'error' : 'success')
    } catch (error) {
      addLog(`Error copying from previous version: ${error.message}`, 'error')
    } finally {
      setIsCopyingFromPrevious(false)
    }
  }

  const localesNeedingCopy = versionLocalizations.filter(loc => {
    const prevLoc = previousVersionLocalizations.find(p => p.locale === loc.locale)
    if (!prevLoc) return false
    return COPYABLE_VERSION_FIELDS.some(field =>
      (!loc[field] || loc[field].trim() === '') && prevLoc[field] && prevLoc[field].trim() !== ''
    )
  })

  const cleanAndTruncateKeywords = (raw) => {
    let cleaned = raw
      .replace(/^["']|["']$/g, '')
      .replace(/\n/g, ',')
      .replace(/\s*,\s*/g, ',')
      .replace(/,+/g, ',')
      .replace(/^,|,$/g, '')
      .trim()

    if (cleaned.length > 100) {
      const parts = cleaned.split(',')
      cleaned = ''
      for (const kw of parts) {
        const newLength = cleaned ? cleaned.length + 1 + kw.length : kw.length
        if (newLength <= 100) {
          cleaned = cleaned ? `${cleaned},${kw}` : kw
        } else {
          break
        }
      }
    }
    return cleaned
  }

  const parseAstroSuggestions = (result) => {
    if (!result?.content) return []

    const text = result.content
      .filter(c => c.type === 'text')
      .map(c => c.text)
      .join('')

    if (!text) return []

    try {
      const data = JSON.parse(text)
      if (!Array.isArray(data)) return []

      return data
        .map(item => ({
          keyword: item.text,
          popularity: item.popularity ?? null,
          difficulty: item.difficulty ?? null,
          appsCount: item.appsCount ?? null,
          store: item.store ?? null,
          selected: false,
        }))
        .filter(s => s.keyword && s.keyword.length > 0)
        .sort((a, b) => (b.popularity || 0) - (a.popularity || 0))
    } catch {
      return []
    }
  }

  const fetchAstroSuggestions = async (locale, localization, localeName) => {
    if (!astroConfig?.enabled || !selectedApp) return false

    try {
      const { getKeywordSuggestions } = await import('@/services/astroService')
      const store = locale.split('-').pop()?.toLowerCase() || 'us'
      addLog(`Fetching Astro suggestions for ${localeName} (${store})...`, 'info')
      const result = await getKeywordSuggestions(selectedApp.id, store, astroConfig.port || 8089)

      const suggestions = parseAstroSuggestions(result)
      if (suggestions.length === 0) return false

      const currentKeywords = (localization.keywords || '').split(',').map(k => k.trim()).filter(Boolean)
      for (const s of suggestions) {
        s.selected = false
        s.existing = currentKeywords.some(k => k.toLowerCase() === s.keyword.toLowerCase())
      }

      setAstroSuggestions({
        locale,
        localeName,
        localizationId: localization.id,
        currentKeywords: localization.keywords || '',
        suggestions
      })
      addLog(`Astro returned ${suggestions.length} keyword suggestions for ${localeName}`, 'success')
      return true
    } catch (error) {
      addLog(`Astro unavailable for ${localeName}, falling back to AI: ${error.message}`, 'info')
      return false
    }
  }

  const handleApplyAstroSuggestions = async (selectedKeywords) => {
    if (!astroSuggestions) return

    const { localizationId, currentKeywords, localeName } = astroSuggestions
    const existing = currentKeywords ? currentKeywords.split(',').map(k => k.trim()).filter(Boolean) : []
    const merged = [...existing]

    for (const kw of selectedKeywords) {
      if (!merged.some(m => m.toLowerCase() === kw.toLowerCase())) {
        merged.push(kw)
      }
    }

    const cleaned = cleanAndTruncateKeywords(merged.join(','))
    const charCount = cleaned.length

    try {
      setIsSavingKeywords(true)
      await updateVersionLocalization(credentials, localizationId, { keywords: cleaned })
      addLog(`Applied Astro keywords for ${localeName} (${charCount}/100 chars): ${cleaned}`, 'success')

      const versionLocs = await getVersionLocalizations(credentials, selectedVersion.id)
      setVersionLocalizations(versionLocs)
    } catch (error) {
      addLog(`Error saving keywords: ${error.message}`, 'error')
    }

    setIsSavingKeywords(false)
    setAstroSuggestions(null)
  }

  // ---------------------------------------------------------------------------
  // AppCompete — keyword suggestions, competitor keywords, keyword review
  // ---------------------------------------------------------------------------

  const appCompeteKey = appCompeteConfig?.apiKey || ''
  const countryFromLocale = (locale) => locale.split('-').pop()?.toLowerCase() || 'us'

  const fetchAppCompeteSuggestions = async (locale, localization, localeName) => {
    if (!appCompeteKey || !selectedApp) return false

    try {
      const { getKeywordSuggestions } = await import('@/services/appCompeteService')
      const country = countryFromLocale(locale)
      addLog(`Fetching AppCompete suggestions for ${localeName} (${country})...`, 'info')
      const suggestions = await getKeywordSuggestions(appCompeteKey, selectedApp.id, country)
      if (suggestions.length === 0) {
        addLog(`AppCompete returned no suggestions for ${localeName}`, 'info')
        return false
      }

      const currentKeywords = (localization.keywords || '').split(',').map(k => k.trim()).filter(Boolean)
      for (const s of suggestions) {
        s.selected = false
        s.existing = currentKeywords.some(k => k.toLowerCase() === s.keyword.toLowerCase())
      }

      setAstroSuggestions({
        locale,
        localeName,
        localizationId: localization.id,
        currentKeywords: localization.keywords || '',
        suggestions,
        title: 'AppCompete Suggestions',
      })
      addLog(`AppCompete returned ${suggestions.length} keyword suggestions for ${localeName}`, 'success')
      return true
    } catch (error) {
      addLog(`AppCompete suggestions failed for ${localeName}: ${error.message}`, 'error')
      return false
    }
  }

  const handleAppCompeteCompetitors = async (locale) => {
    if (!appCompeteKey) return
    setAppCompeteLoadingFor(`${locale}:competitors`)
    try {
      const { listApps } = await import('@/services/appCompeteService')
      const apps = await listApps(appCompeteKey)
      const competitors = apps.filter(a => String(a.appleId) !== String(selectedApp?.id))
      if (competitors.length === 0) {
        addLog('No competitor apps tracked on AppCompete — add them from your AppCompete dashboard', 'info')
      } else {
        setAppCompetePicker({ locale, apps: competitors })
      }
    } catch (error) {
      addLog(`AppCompete: ${error.message}`, 'error')
    }
    setAppCompeteLoadingFor(null)
  }

  const handlePickCompetitor = async (app) => {
    if (!appCompetePicker) return
    const { locale } = appCompetePicker
    const localization = versionLocalizations.find(l => l.locale === locale)
    const localeInfo = ASC_LOCALES.find(l => l.code === locale)
    const localeName = localeInfo?.name || locale
    setAppCompetePicker(null)
    setAppCompeteLoadingFor(`${locale}:competitors`)

    try {
      const { getAppKeywords, extractCompetitorKeywords } = await import('@/services/appCompeteService')
      const country = countryFromLocale(locale)
      addLog(`Fetching keywords of "${app.name}" from AppCompete...`, 'info')
      // Tracked keywords first (richer: position + metrics); fall back to NLP mining.
      let keywords = []
      try { keywords = await getAppKeywords(appCompeteKey, app.appleId, country) } catch { /* fall through */ }
      if (keywords.length === 0) {
        keywords = await extractCompetitorKeywords(appCompeteKey, app.appleId, country)
      }
      if (keywords.length === 0) {
        addLog(`No keywords found for "${app.name}"`, 'info')
        setAppCompeteLoadingFor(null)
        return
      }

      const currentKeywords = (localization?.keywords || '').split(',').map(k => k.trim()).filter(Boolean)
      for (const s of keywords) {
        s.selected = false
        s.existing = currentKeywords.some(k => k.toLowerCase() === s.keyword.toLowerCase())
      }

      setAstroSuggestions({
        locale,
        localeName,
        localizationId: localization?.id,
        currentKeywords: localization?.keywords || '',
        suggestions: keywords,
        title: `Competitor — ${app.name}`,
      })
      addLog(`AppCompete returned ${keywords.length} keywords for "${app.name}"`, 'success')
    } catch (error) {
      addLog(`AppCompete competitor keywords failed: ${error.message}`, 'error')
    }
    setAppCompeteLoadingFor(null)
  }

  const handleReviewKeywords = async (locale) => {
    if (!appCompeteKey || !selectedApp) return
    const localization = versionLocalizations.find(l => l.locale === locale)
    const localeInfo = ASC_LOCALES.find(l => l.code === locale)
    const localeName = localeInfo?.name || locale
    const current = (localization?.keywords || '').split(',').map(k => k.trim()).filter(Boolean)
    if (current.length === 0) {
      addLog(`No keywords to review for ${localeName}`, 'info')
      return
    }

    setAppCompeteLoadingFor(`${locale}:review`)
    try {
      const { getAppKeywords, reviewKeywords } = await import('@/services/appCompeteService')
      const country = countryFromLocale(locale)
      addLog(`Reviewing ${current.length} keywords for ${localeName} via AppCompete...`, 'info')
      const tracked = await getAppKeywords(appCompeteKey, selectedApp.id, country)
      const items = reviewKeywords(current, tracked)
      setKeywordReview({ locale, localeName, items })
      const weak = items.filter(i => i.verdict === 'weak' || i.verdict === 'hard').length
      addLog(`Keyword review for ${localeName}: ${weak} keyword(s) need attention`, weak > 0 ? 'info' : 'success')
    } catch (error) {
      addLog(`AppCompete review failed: ${error.message}`, 'error')
    }
    setAppCompeteLoadingFor(null)
  }

  const handleTrackKeywords = async (keywords) => {
    if (!appCompeteKey || !selectedApp || keywords.length === 0) return
    const locale = keywordReview?.locale
    try {
      const { addKeywords } = await import('@/services/appCompeteService')
      await addKeywords(appCompeteKey, selectedApp.id, keywords, locale ? countryFromLocale(locale) : 'us')
      addLog(`Now tracking ${keywords.length} keyword(s) on AppCompete`, 'success')
      // Refresh the review with the newly tracked keywords
      if (locale) await handleReviewKeywords(locale)
    } catch (error) {
      addLog(`AppCompete tracking failed: ${error.message}`, 'error')
    }
  }

  const generateKeywordsWithAI = async (locale, localization, localeName, country, description) => {
    if (!currentAiApiKey) {
      throw new Error('No AI API key configured')
    }

    const { translateText } = await import('@/services/translationService')

    const asoPrompt = `You are an App Store Optimization (ASO) expert. Generate keywords for an iOS/macOS app.

CRITICAL: You MUST use between 95-100 characters total (including commas). This is mandatory - do not use less than 95 characters.

RULES:
1. Language: ${localeName} (${country} market)
2. Format: comma-separated, NO spaces after commas
3. Character count: MUST be 95-100 characters total. Count carefully!
4. Use high-search-volume terms users would search for
5. Mix short keywords with longer phrases to fill the space
6. NO app name, NO generic words (app, best, free), NO trademarks
7. NO duplicate words across keywords

APP DESCRIPTION:
${description}

${localization.keywords ? `CURRENT KEYWORDS (improve these, but use 95-100 chars):
${localization.keywords}` : ''}

IMPORTANT: Count your characters! You have 100 max, use at least 95. Add more keywords if under 95 chars.

Respond with ONLY the keywords, nothing else:`

    const config = {
      provider: aiConfig.provider,
      apiKey: currentAiApiKey,
      model: currentAiModel,
      region: aiConfig.region,
      endpoint: aiConfig.endpoint
    }

    const generatedKeywords = await translateText(asoPrompt, 'en-US', locale, config)
    if (!generatedKeywords) throw new Error('No keywords generated from AI')

    return cleanAndTruncateKeywords(generatedKeywords)
  }

  const handleGenerateASOKeywords = async (locale, source) => {
    const localization = versionLocalizations.find(l => l.locale === locale)
    if (!localization) {
      addLog(`No localization found for ${locale}`, 'error')
      return
    }

    const localeInfo = ASC_LOCALES.find(l => l.code === locale)
    const localeName = localeInfo?.name || locale
    const country = localeInfo?.country || localeName

    setGeneratingKeywordsFor(locale)

    try {
      if (source === 'appcompete') {
        await fetchAppCompeteSuggestions(locale, localization, localeName)
        setGeneratingKeywordsFor(null)
        return
      }

      if (source !== 'ai') {
        const usedAstro = await fetchAstroSuggestions(locale, localization, localeName)
        if (usedAstro) {
          setGeneratingKeywordsFor(null)
          return
        }
        if (source === 'astro') {
          addLog(`Astro unavailable for ${localeName}`, 'error')
          setGeneratingKeywordsFor(null)
          return
        }
      }

      addLog(`Generating AI keywords for ${localeName}...`, 'info')

      if (!currentAiApiKey) {
        addLog('Please configure your AI provider API key', 'error')
        setGeneratingKeywordsFor(null)
        return
      }
      const description = localization.description || versionLocalizations.find(l => l.locale === sourceLocale)?.description
      if (!description) {
        addLog(`No description found to generate keywords from`, 'error')
        setGeneratingKeywordsFor(null)
        return
      }
      const cleanedKeywords = await generateKeywordsWithAI(locale, localization, localeName, country, description)

      const charCount = cleanedKeywords.length
      if (charCount < 95) {
        addLog(`Warning: Only ${charCount}/100 chars used for ${localeName}. Consider adding more keywords manually.`, 'error')
      }

      await updateVersionLocalization(credentials, localization.id, { keywords: cleanedKeywords })
      addLog(`Generated keywords for ${localeName} (${charCount}/100 chars): ${cleanedKeywords}`, 'success')

      const versionLocs = await getVersionLocalizations(credentials, selectedVersion.id)
      setVersionLocalizations(versionLocs)

    } catch (error) {
      addLog(`Error generating keywords for ${localeName}: ${error.message}`, 'error')
    }

    setGeneratingKeywordsFor(null)
  }

  const toggleAsoLocale = (locale) => {
    setAsoExpandedLocales(prev =>
      prev.includes(locale) ? prev.filter(l => l !== locale) : [...prev, locale]
    )
  }

  const startEditingKeywords = (locale, currentKeywords) => {
    setEditingKeywordsFor(locale)
    setEditedKeywords(currentKeywords || '')
  }

  const cancelEditingKeywords = () => {
    setEditingKeywordsFor(null)
    setEditedKeywords('')
  }

  const saveEditedKeywords = async (locale) => {
    const localization = versionLocalizations.find(l => l.locale === locale)
    if (!localization) return

    setIsSavingKeywords(true)
    try {
      const cleanedKeywords = editedKeywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0)
        .join(',')

      await updateVersionLocalization(credentials, localization.id, { keywords: cleanedKeywords })
      addLog(`Saved keywords for ${ASC_LOCALES.find(l => l.code === locale)?.name || locale}`, 'success')

      const versionLocs = await getVersionLocalizations(credentials, selectedVersion.id)
      setVersionLocalizations(versionLocs)

      setEditingKeywordsFor(null)
      setEditedKeywords('')
    } catch (error) {
      addLog(`Error saving keywords: ${error.message}`, 'error')
    }
    setIsSavingKeywords(false)
  }

  const handleLoadScreenshots = async () => {
    if (versionLocalizations.length === 0) return

    setIsLoadingScreenshots(true)
    addLog('Loading screenshots for all localizations...', 'info')

    try {
      const screenshots = await getAllScreenshotsForVersion(credentials, versionLocalizations)
      setScreenshotsByLocale(screenshots)

      const totalScreenshots = Object.values(screenshots).reduce((sum, loc) => sum + loc.totalScreenshots, 0)
      addLog(`Loaded ${totalScreenshots} screenshots across ${Object.keys(screenshots).length} locales`, 'success')
    } catch (error) {
      addLog(`Error loading screenshots: ${error.message}`, 'error')
    }

    setIsLoadingScreenshots(false)
  }

  const toggleScreenshotLocale = (locale) => {
    setExpandedScreenshotLocales(prev =>
      prev.includes(locale) ? prev.filter(l => l !== locale) : [...prev, locale]
    )
  }

  const handleLocaleToggle = (localeCode) => {
    setTargetLocales(prev =>
      prev.includes(localeCode)
        ? prev.filter(l => l !== localeCode)
        : [...prev, localeCode]
    )
  }

  const handleFieldToggle = (field) => {
    setFieldsToTranslate(prev =>
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    )
  }

  const handleTranslate = async () => {
    if (!currentAiApiKey) {
      addLog('Please configure your AI provider API key', 'error')
      return
    }

    if (targetLocales.length === 0) {
      addLog('Please select at least one target language', 'error')
      return
    }

    if (fieldsToTranslate.length === 0) {
      addLog('Please select at least one field to translate', 'error')
      return
    }

    setIsTranslating(true)
    setTranslationAlert({ show: false, success: true, message: '', errorCount: 0 })

    // Re-fetch localizations so the source text reflects what is in App Store
    // Connect right now (e.g. a What's New typed on the ASC website after this
    // page loaded would otherwise be missed and every field translated as '').
    let currentLocalizations = versionLocalizations
    try {
      currentLocalizations = await getVersionLocalizations(credentials, selectedVersion.id)
      setVersionLocalizations(currentLocalizations)
    } catch (error) {
      addLog(`Could not refresh localizations, using loaded data: ${error.message}`, 'info')
    }

    const sourceLoc = currentLocalizations.find(l => l.locale === sourceLocale)
    if (!sourceLoc) {
      addLog(`No source localization found for ${sourceLocale}`, 'error')
      setIsTranslating(false)
      return
    }

    const fieldLabel = (key) => TRANSLATABLE_FIELDS.find(f => f.key === key)?.label || key
    const emptySourceFields = fieldsToTranslate.filter(f => !sourceLoc[f] || sourceLoc[f].trim() === '')
    const fieldsWithContent = fieldsToTranslate.filter(f => !emptySourceFields.includes(f))

    if (fieldsWithContent.length === 0) {
      const labels = emptySourceFields.map(fieldLabel).join(', ')
      addLog(`Nothing to translate: ${labels} is empty in the source language (${sourceLocale})`, 'error')
      setTranslationAlert({
        show: true,
        success: false,
        message: `Nothing to translate — ${labels} is empty in ${sourceLocale}. Add the source text first (Edit button in Current Localizations), then translate.`,
        errorCount: 0,
      })
      setIsTranslating(false)
      return
    }

    if (emptySourceFields.length > 0) {
      addLog(`Skipping field(s) with no source text in ${sourceLocale}: ${emptySourceFields.map(fieldLabel).join(', ')}`, 'info')
    }

    // Show exactly which source text was fetched, so a stale/wrong source is
    // immediately visible in the log instead of silently mistranslating.
    for (const f of fieldsWithContent) {
      const text = sourceLoc[f]
      addLog(`Source ${sourceLocale} ${fieldLabel(f)}: "${text.substring(0, 80)}${text.length > 80 ? '…' : ''}"`, 'info')
    }

    const totalLocales = targetLocales.length
    let currentLocale = 0
    let totalErrors = 0
    let successCount = 0

    const config = {
      provider: aiConfig.provider,
      apiKey: currentAiApiKey,
      model: currentAiModel,
      region: aiConfig.region,
      endpoint: aiConfig.endpoint
    }

    for (const targetLocale of targetLocales) {
      currentLocale++
      setTranslationProgress({
        current: currentLocale,
        total: totalLocales,
        status: `Translating to ${ASC_LOCALES.find(l => l.code === targetLocale)?.name || targetLocale}...`
      })

      addLog(`Translating to ${targetLocale}...`, 'info')

      try {
        const { results: translatedFields, errors: translationErrors } = await translateAllFields(
          sourceLoc,
          targetLocale,
          config,
          fieldsWithContent,
          (progress) => {
            setTranslationProgress(prev => ({
              ...prev,
              status: `${targetLocale}: ${progress.field} (${progress.current}/${progress.total})${progress.error ? ' - ERROR' : ''}`
            }))
            if (progress.error) {
              addLog(`  ${progress.field}: ${progress.error}`, 'error')
            }
          },
          translationPrompts
        )

        if (translationErrors && translationErrors.length > 0) {
          addLog(`${targetLocale}: ${translationErrors.length} field(s) failed to translate (kept original)`, 'error')
          totalErrors += translationErrors.length
        }

        const existingLoc = currentLocalizations.find(l => l.locale === targetLocale)

        if (existingLoc) {
          await updateVersionLocalization(credentials, existingLoc.id, translatedFields)
          addLog(`Updated ${targetLocale} localization`, 'success')
        } else {
          await createVersionLocalization(credentials, selectedVersion.id, targetLocale, translatedFields)
          addLog(`Created ${targetLocale} localization`, 'success')

          if (appInfoLocalizations.appInfoId) {
            const existingAppInfoLoc = appInfoLocalizations.localizations.find(l => l.locale === targetLocale)
            if (!existingAppInfoLoc) {
              const sourceAppInfoLoc = appInfoLocalizations.localizations.find(l => l.locale === sourceLocale)
              if (sourceAppInfoLoc?.privacyPolicyUrl) {
                try {
                  await createAppInfoLocalization(credentials, appInfoLocalizations.appInfoId, targetLocale, {
                    privacyPolicyUrl: sourceAppInfoLoc.privacyPolicyUrl,
                  })
                  addLog(`Copied privacy policy URL to ${targetLocale}`, 'success')
                } catch (appInfoError) {
                  addLog(`Note: Could not copy privacy URL to ${targetLocale}: ${appInfoError.message}`, 'info')
                }
              }
            }
          }
        }
        successCount++
      } catch (error) {
        addLog(`Error translating ${targetLocale}: ${error.message}`, 'error')
        totalErrors++
      }

      if (currentLocale < totalLocales) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    await handleVersionSelect(selectedVersion.id)

    setIsTranslating(false)
    setTranslationProgress({ current: 0, total: 0, status: '' })

    if (totalErrors === 0) {
      setTranslationAlert({
        show: true,
        success: true,
        message: `Successfully translated to ${successCount} language${successCount !== 1 ? 's' : ''}!`,
        errorCount: 0,
      })
    } else {
      setTranslationAlert({
        show: true,
        success: false,
        message: `Translation completed with ${totalErrors} error${totalErrors !== 1 ? 's' : ''}. Some fields kept original text.`,
        errorCount: totalErrors,
      })
    }
    addLog('Translation completed!', 'success')
  }

  const handleCreateVersion = async () => {
    if (!createVersionDialog.versionString.trim()) {
      addLog('Please enter a version number', 'error')
      return
    }

    setCreateVersionDialog(prev => ({ ...prev, isCreating: true }))

    try {
      const newVersion = await createVersion(
        credentials,
        selectedApp.id,
        createVersionDialog.versionString.trim(),
        createVersionDialog.platform
      )

      addLog(`Created version ${newVersion.versionString} (${newVersion.platform})`, 'success')

      const versionsList = await listVersions(credentials, selectedApp.id)
      setVersions(versionsList)
      setSelectedVersion(newVersion)

      await handleVersionSelect(newVersion.id)

      setCreateVersionDialog({ open: false, versionString: '', platform: 'IOS', isCreating: false })
    } catch (error) {
      addLog(`Error creating version: ${error.message}`, 'error')
      setCreateVersionDialog(prev => ({ ...prev, isCreating: false }))
    }
  }

  const handleEditLocalization = (localization, type = 'version') => {
    setEditDialog({
      open: true,
      locale: localization.locale,
      localization: { ...localization },
      type
    })
  }

  const handleSaveEdit = async () => {
    if (!editDialog.localization) return

    try {
      if (editDialog.type === 'version') {
        const updates = {
          description: editDialog.localization.description,
          keywords: editDialog.localization.keywords,
          promotionalText: editDialog.localization.promotionalText,
          whatsNew: editDialog.localization.whatsNew,
        }
        if (editDialog.localization.supportUrl) {
          updates.supportUrl = editDialog.localization.supportUrl
        }
        if (editDialog.localization.marketingUrl) {
          updates.marketingUrl = editDialog.localization.marketingUrl
        }
        await updateVersionLocalization(credentials, editDialog.localization.id, updates)
      } else {
        const updates = {
          name: editDialog.localization.name,
          subtitle: editDialog.localization.subtitle,
        }
        if (editDialog.localization.privacyPolicyUrl) {
          updates.privacyPolicyUrl = editDialog.localization.privacyPolicyUrl
        }
        await updateAppInfoLocalization(credentials, editDialog.localization.id, updates)
      }

      addLog(`Saved ${editDialog.locale} localization`, 'success')

      await handleVersionSelect(selectedVersion.id)
    } catch (error) {
      addLog(`Error saving: ${error.message}`, 'error')
    }

    setEditDialog({ open: false, locale: '', localization: null, type: 'version' })
  }

  const handleCopySupportUrl = async () => {
    const sourceLoc = versionLocalizations.find(l => l.locale === sourceLocale)
    if (!sourceLoc?.supportUrl) {
      addLog(`No Support URL found in source locale (${sourceLocale})`, 'error')
      return
    }

    setIsCopyingSupportUrl(true)
    try {
      let copiedCount = 0
      let errorCount = 0

      for (const loc of versionLocalizations) {
        if (loc.locale === sourceLocale) continue
        if (loc.supportUrl === sourceLoc.supportUrl) continue

        try {
          await updateVersionLocalization(credentials, loc.id, {
            supportUrl: sourceLoc.supportUrl
          })
          copiedCount++
        } catch (error) {
          errorCount++
          addLog(`Failed to copy Support URL to ${loc.locale}: ${error.message}`, 'error')
        }
      }

      if (copiedCount > 0) {
        addLog(`Copied Support URL to ${copiedCount} locale(s)`, 'success')
        const versionLocs = await getVersionLocalizations(credentials, selectedVersion.id)
        setVersionLocalizations(versionLocs)
      }

      if (errorCount > 0) {
        addLog(`${errorCount} error(s) while copying Support URL`, 'error')
      }
    } catch (error) {
      addLog(`Failed to copy Support URL: ${error.message}`, 'error')
    } finally {
      setIsCopyingSupportUrl(false)
    }
  }

  const handleCopyMarketingUrl = async () => {
    const sourceLoc = versionLocalizations.find(l => l.locale === sourceLocale)
    if (!sourceLoc?.marketingUrl) {
      addLog(`No Marketing URL found in source locale (${sourceLocale})`, 'error')
      return
    }

    setIsCopyingMarketingUrl(true)
    try {
      let copiedCount = 0
      let errorCount = 0

      for (const loc of versionLocalizations) {
        if (loc.locale === sourceLocale) continue
        if (loc.marketingUrl === sourceLoc.marketingUrl) continue

        try {
          await updateVersionLocalization(credentials, loc.id, {
            marketingUrl: sourceLoc.marketingUrl
          })
          copiedCount++
        } catch (error) {
          errorCount++
          addLog(`Failed to copy Marketing URL to ${loc.locale}: ${error.message}`, 'error')
        }
      }

      if (copiedCount > 0) {
        addLog(`Copied Marketing URL to ${copiedCount} locale(s)`, 'success')
        const versionLocs = await getVersionLocalizations(credentials, selectedVersion.id)
        setVersionLocalizations(versionLocs)
      }

      if (errorCount > 0) {
        addLog(`${errorCount} error(s) while copying Marketing URL`, 'error')
      }
    } catch (error) {
      addLog(`Failed to copy Marketing URL: ${error.message}`, 'error')
    } finally {
      setIsCopyingMarketingUrl(false)
    }
  }

  const handleAppInfoChange = (locId, field, value) => {
    setEditedAppInfo(prev => ({
      ...prev,
      [locId]: {
        ...(prev[locId] || {}),
        [field]: value
      }
    }))
  }

  const getAppInfoValue = (loc, field) => {
    if (editedAppInfo[loc.id] && Object.prototype.hasOwnProperty.call(editedAppInfo[loc.id], field)) {
      return editedAppInfo[loc.id][field]
    }
    return loc[field] || ''
  }

  const isFieldEdited = (locId, field) => {
    return editedAppInfo[locId] && Object.prototype.hasOwnProperty.call(editedAppInfo[locId], field)
  }

  const hasAppInfoChanges = Object.keys(editedAppInfo).length > 0

  const editedFieldsCount = Object.values(editedAppInfo).reduce(
    (count, fields) => count + Object.keys(fields).length, 0
  )

  const handleSaveAllAppInfo = async () => {
    if (!hasAppInfoChanges) return

    setIsSavingAppInfo(true)
    let savedFields = 0
    let failedFields = 0

    for (const [locId, fields] of Object.entries(editedAppInfo)) {
      const localeInfo = appInfoLocalizations.localizations.find(l => l.id === locId)
      const localeName = ASC_LOCALES.find(l => l.code === localeInfo?.locale)?.name || localeInfo?.locale || locId

      for (const [field, value] of Object.entries(fields)) {
        try {
          await updateAppInfoLocalization(credentials, locId, { [field]: value })
          savedFields++
        } catch (error) {
          failedFields++
          if (error.message.includes('can not be modified')) {
            addLog(`${localeName}: "${field}" locked (app not in editable state)`, 'error')
          } else {
            addLog(`${localeName}: Failed to save "${field}" - ${error.message}`, 'error')
          }
        }
      }
    }

    if (savedFields > 0) {
      addLog(`Saved ${savedFields} field(s)${failedFields > 0 ? `, ${failedFields} failed` : ''}`, savedFields > 0 ? 'success' : 'error')
    }

    setEditedAppInfo({})
    await handleVersionSelect(selectedVersion.id)
    setIsSavingAppInfo(false)
  }

  const handleTranslateAppInfo = async (targetLocaleCode = null) => {
    if (!currentAiApiKey) {
      addLog('Please configure your AI provider API key', 'error')
      return
    }

    const sourceLoc = appInfoLocalizations.localizations.find(l => l.locale === sourceLocale)
    if (!sourceLoc) {
      addLog(`No source App Info found for ${sourceLocale}`, 'error')
      return
    }

    if (!sourceLoc.name && !sourceLoc.subtitle) {
      addLog('Source locale has no name or subtitle to translate', 'error')
      return
    }

    const protectedWords = appInfoProtectedWords
      .split(',')
      .map(w => w.trim())
      .filter(w => w.length > 0)

    const protectedWordsInstruction = protectedWords.length > 0
      ? `\nCRITICAL: Do NOT translate these words, keep them exactly as-is: ${protectedWords.join(', ')}`
      : ''

    setIsTranslatingAppInfo(targetLocaleCode || 'all')

    const localestoTranslate = targetLocaleCode
      ? appInfoLocalizations.localizations.filter(l => l.locale === targetLocaleCode)
      : appInfoLocalizations.localizations.filter(l => l.locale !== sourceLocale)

    if (localestoTranslate.length === 0) {
      setIsTranslatingAppInfo(null)
      return
    }

    addLog(`Translating App Info to ${localestoTranslate.length} locale(s)...`, 'info')

    const config = {
      provider: aiConfig.provider,
      apiKey: currentAiApiKey,
      model: currentAiModel,
      region: aiConfig.region,
      endpoint: aiConfig.endpoint
    }

    const { translateText } = await import('@/services/translationService')

    const providerDelays = {
      github: 1500,
      openai: 200,
      azure: 200,
      bedrock: 300,
      anthropic: 200,
    }
    const requestDelay = providerDelays[config.provider] || 200

    let successCount = 0
    let errorCount = 0

    for (const targetLoc of localestoTranslate) {
      if (targetLoc.locale === sourceLocale) continue

      const localeInfo = ASC_LOCALES.find(l => l.code === targetLoc.locale)
      const localeName = localeInfo?.name || targetLoc.locale

      try {
        const updates = {}

        if (sourceLoc.name || sourceLoc.subtitle) {
          const prompt = `Translate to ${localeName}. Max 30 chars each. Keep short & catchy.${protectedWordsInstruction}
Return ONLY a JSON object like: {"name": "...", "subtitle": "..."}

${sourceLoc.name ? `Name: ${sourceLoc.name}` : ''}
${sourceLoc.subtitle ? `Subtitle: ${sourceLoc.subtitle}` : ''}`

          const result = await translateText(prompt, sourceLocale, targetLoc.locale, config)

          let parsed
          try {
            const jsonMatch = result.match(/\{[\s\S]*\}/)
            parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : {}
          } catch {
            parsed = {}
          }

          if (parsed.name && sourceLoc.name) {
            updates.name = parsed.name.replace(/^["']|["']$/g, '').trim().substring(0, 30)
          }
          if (parsed.subtitle && sourceLoc.subtitle) {
            updates.subtitle = parsed.subtitle.replace(/^["']|["']$/g, '').trim().substring(0, 30)
          }
        }

        if (Object.keys(updates).length > 0) {
          setEditedAppInfo(prev => ({
            ...prev,
            [targetLoc.id]: {
              ...(prev[targetLoc.id] || {}),
              ...updates
            }
          }))
          addLog(`Translated App Info for ${localeName}`, 'success')
          successCount++
        } else {
          errorCount++
        }

        await new Promise(resolve => setTimeout(resolve, requestDelay))
      } catch (error) {
        addLog(`Error translating App Info for ${localeName}: ${error.message}`, 'error')
        errorCount++
      }
    }

    setIsTranslatingAppInfo(null)
    if (successCount > 0) {
      addLog(`Done! ${successCount} locale(s) ready for review. Click "Save All Changes" to confirm.`, 'info')
    }
    if (errorCount > 0) {
      addLog(`${errorCount} locale(s) failed to translate`, 'error')
    }
  }

  const availableTargetLocales = ASC_LOCALES.filter(
    locale => locale.code !== sourceLocale
  )

  const existingLocales = versionLocalizations.map(l => l.locale)

  const TRANSLATABLE_FIELDS = [
    { key: 'description', label: 'Description', limit: 4000 },
    { key: 'whatsNew', label: "What's New", limit: 4000 },
    { key: 'promotionalText', label: 'Promotional Text', limit: 170 },
    { key: 'keywords', label: 'Keywords', limit: 100 },
  ]

  const isCredentialsComplete = credentials.keyId && credentials.issuerId && credentials.privateKey

  const hasCachedSession = credentials.keyId && credentials.issuerId && hasValidToken(credentials.keyId, credentials.issuerId)
  const canConnect = isCredentialsComplete || hasCachedSession

  return {
    isConnecting,
    connectionStatus,
    sessionTimeLeft,
    formatTimeLeft,
    hasStoredKey,
    unlockPassword,
    setUnlockPassword,
    isUnlocking,
    unlockError,
    setUnlockError,
    handleUnlockKey,
    apps,
    selectedApp,
    appPickerOpen,
    setAppPickerOpen,
    versions,
    selectedVersion,
    isLoadingApps,
    isLoadingVersions,
    versionLocalizations,
    appInfoLocalizations,
    isLoadingLocalizations,
    isCopyingFromPrevious,
    editedAppInfo,
    isSavingAppInfo,
    isTranslatingAppInfo,
    appInfoProtectedWords,
    setAppInfoProtectedWords,
    sourceLocale,
    setSourceLocale,
    targetLocales,
    setTargetLocales,
    fieldsToTranslate,
    isTranslating,
    translationProgress,
    editDialog,
    setEditDialog,
    createVersionDialog,
    setCreateVersionDialog,
    translationAlert,
    setTranslationAlert,
    generatingKeywordsFor,
    asoExpandedLocales,
    editingKeywordsFor,
    editedKeywords,
    setEditedKeywords,
    isSavingKeywords,
    astroSuggestions,
    setAstroSuggestions,
    handleApplyAstroSuggestions,
    appCompetePicker,
    setAppCompetePicker,
    handleAppCompeteCompetitors,
    handlePickCompetitor,
    keywordReview,
    setKeywordReview,
    handleReviewKeywords,
    handleTrackKeywords,
    appCompeteLoadingFor,
    screenshotsByLocale,
    isLoadingScreenshots,
    expandedScreenshotLocales,
    screenshotPreview,
    setScreenshotPreview,
    logs,
    addLog,
    currentAiApiKey,
    currentAiModel,
    isCopyingSupportUrl,
    isCopyingMarketingUrl,
    handleTestConnection,
    handleAppSelect,
    handleVersionSelect,
    handleCopyFromPreviousVersion,
    confirmCopyFromPreviousVersion,
    copyConfirm,
    setCopyConfirm,
    localesNeedingCopy,
    hasPreviousVersion: previousVersionLocalizations.length > 0,
    handleGenerateASOKeywords,
    toggleAsoLocale,
    startEditingKeywords,
    cancelEditingKeywords,
    saveEditedKeywords,
    handleLoadScreenshots,
    toggleScreenshotLocale,
    handleLocaleToggle,
    handleFieldToggle,
    handleTranslate,
    handleCreateVersion,
    handleEditLocalization,
    handleSaveEdit,
    handleCopySupportUrl,
    handleCopyMarketingUrl,
    handleAppInfoChange,
    getAppInfoValue,
    isFieldEdited,
    hasAppInfoChanges,
    editedFieldsCount,
    handleSaveAllAppInfo,
    handleTranslateAppInfo,
    availableTargetLocales,
    existingLocales,
    TRANSLATABLE_FIELDS,
    canConnect,
    credentials,
    aiConfig,
  }
}
