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
  getScreenshotSets,
  getAllScreenshotsForVersion,
  createScreenshotSet,
  uploadScreenshot,
  deleteAllScreenshotsInSet,
  normalizeLocaleCode,
  hasValidToken,
  getTokenTimeLeft,
  SCREENSHOT_DISPLAY_TYPES,
  ASC_LOCALES,
} from '@/services/appStoreConnectService'
import { PROVIDERS } from '@/services/translationService'
import { decrypt } from '@/utils/crypto'

const ENCRYPTED_KEY_STORAGE = 'asc-encrypted-p8-key'

export default function useAppStoreConnect({ credentials, onCredentialsChange, aiConfig }) {
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

  const [editedAppInfo, setEditedAppInfo] = useState({})
  const [isSavingAppInfo, setIsSavingAppInfo] = useState(false)
  const [isTranslatingAppInfo, setIsTranslatingAppInfo] = useState(null)
  const [appInfoProtectedWords, setAppInfoProtectedWords] = useState('')

  const [sourceLocale, setSourceLocale] = useState('en-US')
  const [targetLocales, setTargetLocales] = useState([])
  const [fieldsToTranslate, setFieldsToTranslate] = useState(['description', 'whatsNew', 'promotionalText', 'keywords'])
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

  const [screenshotsByLocale, setScreenshotsByLocale] = useState({})
  const [isLoadingScreenshots, setIsLoadingScreenshots] = useState(false)
  const [expandedScreenshotLocales, setExpandedScreenshotLocales] = useState([])
  const [screenshotPreview, setScreenshotPreview] = useState({ open: false, screenshot: null, locale: '', deviceType: '' })

  const [isDraggingScreenshots, setIsDraggingScreenshots] = useState(false)
  const [screenshotUploadQueue, setScreenshotUploadQueue] = useState([])
  const [isUploadingScreenshots, setIsUploadingScreenshots] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0, currentFile: '' })
  const [selectedDisplayType, setSelectedDisplayType] = useState('APP_IPHONE_67')
  const [deleteExistingScreenshots, setDeleteExistingScreenshots] = useState(true)

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

  const handleCopyFromPreviousVersion = async () => {
    if (previousVersionLocalizations.length === 0) {
      addLog('No previous version localizations available', 'error')
      return
    }

    setIsCopyingFromPrevious(true)
    let copiedCount = 0
    let errorCount = 0

    for (const currentLoc of versionLocalizations) {
      const prevLoc = previousVersionLocalizations.find(p => p.locale === currentLoc.locale)
      if (!prevLoc) continue

      const needsWhatsNew = !currentLoc.whatsNew && prevLoc.whatsNew
      const needsPromoText = !currentLoc.promotionalText && prevLoc.promotionalText

      if (needsWhatsNew || needsPromoText) {
        const updateData = {}
        if (needsWhatsNew) updateData.whatsNew = prevLoc.whatsNew
        if (needsPromoText) updateData.promotionalText = prevLoc.promotionalText

        try {
          await updateVersionLocalization(credentials, currentLoc.id, updateData)
          copiedCount++
          addLog(`Copied to ${currentLoc.locale}: ${needsWhatsNew ? 'What\'s New' : ''}${needsWhatsNew && needsPromoText ? ' & ' : ''}${needsPromoText ? 'Promo Text' : ''}`, 'success')
        } catch (error) {
          errorCount++
          addLog(`Failed to copy to ${currentLoc.locale}: ${error.message}`, 'error')
        }
      }
    }

    if (copiedCount > 0) {
      const versionLocs = await getVersionLocalizations(credentials, selectedVersion.id)
      setVersionLocalizations(versionLocs)
    }

    addLog(`Copied content to ${copiedCount} locale(s)${errorCount > 0 ? `, ${errorCount} error(s)` : ''}`, copiedCount > 0 ? 'success' : 'error')
    setIsCopyingFromPrevious(false)
  }

  const localesNeedingCopy = versionLocalizations.filter(loc => {
    const prevLoc = previousVersionLocalizations.find(p => p.locale === loc.locale)
    if (!prevLoc) return false
    return (!loc.whatsNew && prevLoc.whatsNew) || (!loc.promotionalText && prevLoc.promotionalText)
  })

  const handleGenerateASOKeywords = async (locale) => {
    if (!currentAiApiKey) {
      addLog('Please configure your AI provider API key', 'error')
      return
    }

    const localization = versionLocalizations.find(l => l.locale === locale)
    if (!localization) {
      addLog(`No localization found for ${locale}`, 'error')
      return
    }

    const description = localization.description || versionLocalizations.find(l => l.locale === sourceLocale)?.description
    if (!description) {
      addLog(`No description found to generate keywords from`, 'error')
      return
    }

    const localeInfo = ASC_LOCALES.find(l => l.code === locale)
    const localeName = localeInfo?.name || locale
    const country = localeInfo?.country || localeName

    setGeneratingKeywordsFor(locale)
    addLog(`Generating optimized keywords for ${localeName}...`, 'info')

    try {
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

      if (!generatedKeywords) {
        throw new Error('No keywords generated from AI')
      }

      let cleanedKeywords = generatedKeywords
        .replace(/^["']|["']$/g, '')
        .replace(/\n/g, ',')
        .replace(/\s*,\s*/g, ',')
        .replace(/,+/g, ',')
        .replace(/^,|,$/g, '')
        .trim()

      if (cleanedKeywords.length > 100) {
        const keywords = cleanedKeywords.split(',')
        cleanedKeywords = ''
        for (const kw of keywords) {
          const newLength = cleanedKeywords ? cleanedKeywords.length + 1 + kw.length : kw.length
          if (newLength <= 100) {
            cleanedKeywords = cleanedKeywords ? `${cleanedKeywords},${kw}` : kw
          } else {
            break
          }
        }
      }

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

  const readDirectoryRecursive = async (dirEntry, path = '') => {
    const files = []
    const reader = dirEntry.createReader()

    const readEntries = () => new Promise((resolve, reject) => {
      reader.readEntries(resolve, reject)
    })

    let entries = await readEntries()
    while (entries.length > 0) {
      for (const entry of entries) {
        const entryPath = path ? `${path}/${entry.name}` : entry.name
        if (entry.isFile) {
          const file = await new Promise((resolve) => entry.file(resolve))
          files.push({ file, path: entryPath })
        } else if (entry.isDirectory) {
          const subFiles = await readDirectoryRecursive(entry, entryPath)
          files.push(...subFiles)
        }
      }
      entries = await readEntries()
    }

    return files
  }

  const handleScreenshotDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDraggingScreenshots(false)

    const items = e.dataTransfer.items
    const queue = []

    for (const item of items) {
      if (item.kind === 'file') {
        const entry = item.webkitGetAsEntry?.()
        if (entry) {
          if (entry.isDirectory) {
            const files = await readDirectoryRecursive(entry)

            const filesByLocale = {}
            for (const { file, path } of files) {
              const pathParts = path.split('/')
              const localeFolder = pathParts.length > 1 ? pathParts[0] : entry.name
              const normalizedLocale = normalizeLocaleCode(localeFolder)

              if (!filesByLocale[normalizedLocale]) {
                filesByLocale[normalizedLocale] = []
              }
              if (file.type.startsWith('image/')) {
                filesByLocale[normalizedLocale].push(file)
              }
            }

            for (const [locale, files] of Object.entries(filesByLocale)) {
              if (files.length > 0) {
                files.sort((a, b) => a.name.localeCompare(b.name))
                queue.push({ locale, files, status: 'pending' })
              }
            }
          } else {
            const file = item.getAsFile()
            if (file?.type.startsWith('image/')) {
              const locale = sourceLocale || 'en-US'
              const existing = queue.find(q => q.locale === locale)
              if (existing) {
                existing.files.push(file)
              } else {
                queue.push({ locale, files: [file], status: 'pending' })
              }
            }
          }
        }
      }
    }

    if (queue.length > 0) {
      setScreenshotUploadQueue(queue)
      addLog(`Detected ${queue.length} locale(s) with screenshots to upload`, 'info')
    } else {
      addLog('No valid screenshot images found in dropped items', 'error')
    }
  }

  const removeFromUploadQueue = (locale) => {
    setScreenshotUploadQueue(prev => prev.filter(q => q.locale !== locale))
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  const handleUploadScreenshots = async () => {
    if (screenshotUploadQueue.length === 0) return

    setIsUploadingScreenshots(true)
    const totalFiles = screenshotUploadQueue.reduce((sum, q) => sum + q.files.length, 0)
    let uploadedCount = 0

    for (const queueItem of screenshotUploadQueue) {
      const { locale, files } = queueItem

      const localization = versionLocalizations.find(l => l.locale === locale)
      if (!localization) {
        addLog(`Locale ${locale} not found in current version, skipping`, 'error')
        setScreenshotUploadQueue(prev =>
          prev.map(q => q.locale === locale ? { ...q, status: 'error' } : q)
        )
        continue
      }

      setScreenshotUploadQueue(prev =>
        prev.map(q => q.locale === locale ? { ...q, status: 'uploading' } : q)
      )

      try {
        const existingSets = await getScreenshotSets(credentials, localization.id)
        let screenshotSetId = existingSets.find(s => s.displayType === selectedDisplayType)?.id

        if (!screenshotSetId) {
          addLog(`Creating screenshot set for ${locale} (${SCREENSHOT_DISPLAY_TYPES[selectedDisplayType]?.name})...`, 'info')
          screenshotSetId = await createScreenshotSet(credentials, localization.id, selectedDisplayType)
        } else if (deleteExistingScreenshots) {
          const existingSet = existingSets.find(s => s.displayType === selectedDisplayType)
          if (existingSet && existingSet.screenshots.length > 0) {
            addLog(`Deleting ${existingSet.screenshots.length} existing screenshot(s) for ${locale}...`, 'info')
            const deletedCount = await deleteAllScreenshotsInSet(credentials, screenshotSetId)
            addLog(`Deleted ${deletedCount} screenshot(s) for ${locale}`, 'success')
          }
        }

        for (const file of files) {
          setUploadProgress({ current: uploadedCount + 1, total: totalFiles, currentFile: file.name })

          addLog(`Uploading ${file.name} to ${locale} (${formatFileSize(file.size)})...`, 'info')

          const result = await uploadScreenshot(credentials, screenshotSetId, file, (progress) => {
            if (progress.status === 'error') {
              addLog(`Error uploading ${file.name}: ${progress.error}`, 'error')
            }
          })

          if (result.success) {
            addLog(`Uploaded ${file.name} to ${locale}`, 'success')
          } else {
            addLog(`Failed to upload ${file.name}: ${result.error}`, 'error')
          }

          uploadedCount++
        }

        setScreenshotUploadQueue(prev =>
          prev.map(q => q.locale === locale ? { ...q, status: 'done' } : q)
        )
      } catch (error) {
        addLog(`Error uploading to ${locale}: ${error.message}`, 'error')
        setScreenshotUploadQueue(prev =>
          prev.map(q => q.locale === locale ? { ...q, status: 'error' } : q)
        )
      }
    }

    setIsUploadingScreenshots(false)
    setUploadProgress({ current: 0, total: 0, currentFile: '' })
    addLog(`Screenshot upload complete! ${uploadedCount} files uploaded.`, 'success')

    handleLoadScreenshots()
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

    const sourceLoc = versionLocalizations.find(l => l.locale === sourceLocale)
    if (!sourceLoc) {
      addLog(`No source localization found for ${sourceLocale}`, 'error')
      return
    }

    setIsTranslating(true)
    setTranslationAlert({ show: false, success: true, message: '', errorCount: 0 })
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
          fieldsToTranslate,
          (progress) => {
            setTranslationProgress(prev => ({
              ...prev,
              status: `${targetLocale}: ${progress.field} (${progress.current}/${progress.total})${progress.error ? ' - ERROR' : ''}`
            }))
            if (progress.error) {
              addLog(`  ${progress.field}: ${progress.error}`, 'error')
            }
          }
        )

        if (translationErrors && translationErrors.length > 0) {
          addLog(`${targetLocale}: ${translationErrors.length} field(s) failed to translate (kept original)`, 'error')
          totalErrors += translationErrors.length
        }

        const existingLoc = versionLocalizations.find(l => l.locale === targetLocale)

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

    setIsCopyingSupportUrl(false)
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
    if (editedAppInfo[loc.id]?.hasOwnProperty(field)) {
      return editedAppInfo[loc.id][field]
    }
    return loc[field] || ''
  }

  const isFieldEdited = (locId, field) => {
    return editedAppInfo[locId]?.hasOwnProperty(field)
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
    screenshotsByLocale,
    isLoadingScreenshots,
    expandedScreenshotLocales,
    screenshotPreview,
    setScreenshotPreview,
    isDraggingScreenshots,
    setIsDraggingScreenshots,
    screenshotUploadQueue,
    setScreenshotUploadQueue,
    isUploadingScreenshots,
    uploadProgress,
    selectedDisplayType,
    setSelectedDisplayType,
    deleteExistingScreenshots,
    setDeleteExistingScreenshots,
    logs,
    addLog,
    currentAiApiKey,
    currentAiModel,
    isCopyingSupportUrl,
    handleTestConnection,
    handleAppSelect,
    handleVersionSelect,
    handleCopyFromPreviousVersion,
    localesNeedingCopy,
    handleGenerateASOKeywords,
    toggleAsoLocale,
    startEditingKeywords,
    cancelEditingKeywords,
    saveEditedKeywords,
    handleLoadScreenshots,
    toggleScreenshotLocale,
    handleScreenshotDrop,
    removeFromUploadQueue,
    formatFileSize,
    handleUploadScreenshots,
    handleLocaleToggle,
    handleFieldToggle,
    handleTranslate,
    handleCreateVersion,
    handleEditLocalization,
    handleSaveEdit,
    handleCopySupportUrl,
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
