import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import {
  testConnection,
  createEdit,
  commitEdit,
  deleteEdit,
  listListings,
  updateListing,
  translateAllFields,
  hasValidToken,
  getTokenTimeLeft,
  fetchDeveloperApps,
  fetchAppMeta,
  GP_LOCALES,
} from '@/services/googlePlayService'
import { PROVIDERS } from '@/services/translationService'
import { decrypt } from '@/utils/crypto'
import useGooglePlayImages from '@/hooks/useGooglePlayImages'

const ENCRYPTED_GP_KEY_STORAGE = 'gp-encrypted-service-account'
const SAVED_APPS_KEY = 'gp-saved-apps'
const LAST_PACKAGE_KEY = 'gp-last-package'

function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw === null ? fallback : JSON.parse(raw)
  } catch {
    return fallback
  }
}

function writeStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* storage unavailable */ }
}

export default function useGooglePlayConnect({ credentials, onCredentialsChange, aiConfig }) {
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [sessionTimeLeft, setSessionTimeLeft] = useState(0)

  useEffect(() => {
    const updateTimer = () => {
      setSessionTimeLeft(getTokenTimeLeft())
    }
    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [])

  const formatTimeLeft = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Package names the user has loaded before (with name + icon), so they never retype them
  const [savedApps, setSavedApps] = useState(() => {
    const apps = readStorage(SAVED_APPS_KEY, [])
    return Array.isArray(apps) ? apps : []
  })
  const [packageName, setPackageName] = useState(() => {
    const last = readStorage(LAST_PACKAGE_KEY, '')
    return typeof last === 'string' ? last : ''
  })

  useEffect(() => { writeStorage(SAVED_APPS_KEY, savedApps) }, [savedApps])
  useEffect(() => { writeStorage(LAST_PACKAGE_KEY, packageName) }, [packageName])

  const upsertSavedApp = useCallback((app) => {
    setSavedApps((prev) => {
      const existing = prev.find((a) => a.packageName === app.packageName)
      const merged = {
        ...existing,
        ...Object.fromEntries(Object.entries(app).filter(([, v]) => v)),
        lastUsed: Date.now(),
      }
      return [merged, ...prev.filter((a) => a.packageName !== app.packageName)]
    })
  }, [])

  const handleRemoveSavedApp = (pkg) => {
    setSavedApps((prev) => prev.filter((a) => a.packageName !== pkg))
  }
  const [editId, setEditId] = useState(null)
  const [isCreatingEdit, setIsCreatingEdit] = useState(false)

  const [developerUrl, setDeveloperUrl] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('gp-developer-id') || ''
    }
    return ''
  })
  const [developerApps, setDeveloperApps] = useState([])
  const [isLoadingDevApps, setIsLoadingDevApps] = useState(false)

  const [listings, setListings] = useState([])
  const [isLoadingListings, setIsLoadingListings] = useState(false)

  const [sourceLocale, setSourceLocale] = useState('en-US')
  const [targetLocales, setTargetLocales] = useState([])
  const [fieldsToTranslate, setFieldsToTranslate] = useState(['title', 'shortDescription', 'fullDescription'])
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationProgress, setTranslationProgress] = useState({ current: 0, total: 0, status: '' })

  const [editDialog, setEditDialog] = useState({
    open: false,
    locale: '',
    listing: null,
  })

  const [translationAlert, setTranslationAlert] = useState({
    show: false,
    success: true,
    message: '',
    errorCount: 0,
  })

  const [fullscreenImage, setFullscreenImage] = useState(null)

  const [logs, setLogs] = useState([])

  const [hasStoredGpKey, setHasStoredGpKey] = useState(() => {
    if (typeof window === 'undefined') return false
    return !!window.localStorage.getItem(ENCRYPTED_GP_KEY_STORAGE)
  })
  const [decryptPassword, setDecryptPassword] = useState('')
  const [isDecrypting, setIsDecrypting] = useState(false)
  const [decryptError, setDecryptError] = useState('')

  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev.slice(-100), { message, type, timestamp }])
    if (type === 'error') toast.error(message)
    else if (type === 'success') toast.success(message)
  }, [])

  const media = useGooglePlayImages({
    credentials,
    packageName: packageName.trim(),
    editId,
    listings,
    log: addLog,
  })

  const handleDecryptServiceAccount = async () => {
    if (!decryptPassword) {
      setDecryptError('Please enter your password')
      return
    }

    const stored = localStorage.getItem(ENCRYPTED_GP_KEY_STORAGE)
    if (!stored) {
      setDecryptError('No stored service account found')
      return
    }

    setIsDecrypting(true)
    setDecryptError('')

    const result = await decrypt(stored, decryptPassword)

    if (result.success) {
      onCredentialsChange(prev => ({ ...prev, serviceAccountJson: result.data }))
      setDecryptPassword('')
      addLog('Service account decrypted successfully', 'success')
    } else {
      setDecryptError('Wrong password')
    }

    setIsDecrypting(false)
  }

  const currentAiApiKey = aiConfig.apiKeys[aiConfig.provider] || ''
  const currentAiModel = aiConfig.models[aiConfig.provider] || PROVIDERS[aiConfig.provider]?.defaultModel || ''

  const handleTestConnection = async () => {
    if (!credentials.serviceAccountJson) {
      addLog('Please upload your service account JSON file', 'error')
      return
    }

    setIsConnecting(true)
    setConnectionStatus(null)

    const result = await testConnection(credentials, packageName.trim() || null)
    setConnectionStatus(result)

    if (result.success) {
      addLog(result.message, 'success')
    } else {
      addLog(`Connection failed: ${result.message}`, 'error')
    }

    setIsConnecting(false)
  }

  // `pkgOverride` lets a saved-app click load straight away; as a button handler it receives an event
  const handleCreateEdit = async (pkgOverride) => {
    const pkg = (typeof pkgOverride === 'string' ? pkgOverride : packageName).trim()
    if (!pkg) {
      addLog('Please enter a package name', 'error')
      return
    }
    if (pkg !== packageName) setPackageName(pkg)

    setIsCreatingEdit(true)
    try {
      const newEditId = await createEdit(credentials, pkg)
      setEditId(newEditId)
      addLog(`Created edit session: ${newEditId}`, 'success')

      // Remember the app; name/icon come from the developer profile list when known,
      // otherwise from the public store page (best effort, never blocks the load)
      const known = developerApps.find((a) => a.packageName === pkg)
      upsertSavedApp({ packageName: pkg, name: known?.name !== pkg ? known?.name : null, icon: known?.icon })
      fetchAppMeta(pkg)
        .then((meta) => upsertSavedApp({ packageName: pkg, name: meta.name, icon: meta.icon }))
        .catch(() => { /* icon is optional */ })

      await loadListings(newEditId)
    } catch (error) {
      addLog(`Error creating edit: ${error.message}`, 'error')
    }
    setIsCreatingEdit(false)
  }

  const handleFetchDeveloperApps = async () => {
    if (!developerUrl.trim()) {
      addLog('Please enter a developer profile URL or ID', 'error')
      return
    }

    setIsLoadingDevApps(true)
    try {
      const { apps, developerId } = await fetchDeveloperApps(developerUrl.trim())
      setDeveloperApps(apps)
      localStorage.setItem('gp-developer-id', developerId)
      addLog(`Found ${apps.length} app(s) from developer profile`, 'success')
    } catch (error) {
      addLog(`Error fetching developer apps: ${error.message}`, 'error')
      setDeveloperApps([])
    }
    setIsLoadingDevApps(false)
  }

  const handleSelectDeveloperApp = (app) => {
    setPackageName(app.packageName)
    addLog(`Selected: ${app.name} (${app.packageName})`, 'info')
  }

  const loadListings = async (currentEditId) => {
    setIsLoadingListings(true)
    try {
      const listingsData = await listListings(credentials, packageName.trim(), currentEditId || editId)
      setListings(listingsData)
      addLog(`Loaded ${listingsData.length} listings`, 'success')
    } catch (error) {
      addLog(`Error loading listings: ${error.message}`, 'error')
    }
    setIsLoadingListings(false)
  }

  const handleCommitEdit = async () => {
    if (!editId) return

    try {
      await commitEdit(credentials, packageName.trim(), editId)
      addLog('Changes committed successfully!', 'success')
      setEditId(null)
      setListings([])
    } catch (error) {
      addLog(`Error committing changes: ${error.message}`, 'error')
    }
  }

  const handleDiscardEdit = async () => {
    if (!editId) return

    try {
      await deleteEdit(credentials, packageName.trim(), editId)
      addLog('Edit discarded', 'info')
      setEditId(null)
      setListings([])
    } catch (error) {
      addLog(`Error discarding edit: ${error.message}`, 'error')
    }
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

    const sourceListing = listings.find(l => l.language === sourceLocale)
    if (!sourceListing) {
      addLog(`No source listing found for ${sourceLocale}`, 'error')
      return
    }

    const emptySourceFields = fieldsToTranslate.filter(f => !sourceListing[f] || sourceListing[f].trim() === '')
    const fieldsWithContent = fieldsToTranslate.filter(f => !emptySourceFields.includes(f))

    if (fieldsWithContent.length === 0) {
      addLog(`Nothing to translate: ${emptySourceFields.join(', ')} is empty in the source language (${sourceLocale})`, 'error')
      setTranslationAlert({
        show: true,
        success: false,
        message: `Nothing to translate — ${emptySourceFields.join(', ')} is empty in ${sourceLocale}. Add the source text first, then translate.`,
        errorCount: 0,
      })
      return
    }

    if (emptySourceFields.length > 0) {
      addLog(`Skipping field(s) with no source text in ${sourceLocale}: ${emptySourceFields.join(', ')}`, 'info')
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
        status: `Translating to ${GP_LOCALES.find(l => l.code === targetLocale)?.name || targetLocale}...`
      })

      addLog(`Translating to ${targetLocale}...`, 'info')

      try {
        const { results: translatedFields, errors: translationErrors } = await translateAllFields(
          sourceListing,
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
          }
        )

        if (translationErrors?.length > 0) {
          addLog(`${targetLocale}: ${translationErrors.length} field(s) failed`, 'error')
          totalErrors += translationErrors.length
        }

        await updateListing(credentials, packageName.trim(), editId, targetLocale, {
          language: targetLocale,
          ...translatedFields
        })
        addLog(`Updated ${targetLocale} listing`, 'success')
        successCount++
      } catch (error) {
        addLog(`Error translating ${targetLocale}: ${error.message}`, 'error')
        totalErrors++
      }

      if (currentLocale < totalLocales) {
        await new Promise(resolve => setTimeout(resolve, 500))
      }
    }

    await loadListings()

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
        message: `Translation completed with ${totalErrors} error${totalErrors !== 1 ? 's' : ''}.`,
        errorCount: totalErrors,
      })
    }
    addLog('Translation completed!', 'success')
  }

  const handleEditListing = (listing) => {
    setEditDialog({
      open: true,
      locale: listing.language,
      listing: { ...listing },
    })
  }

  const handleSaveEdit = async () => {
    if (!editDialog.listing) return

    try {
      await updateListing(
        credentials,
        packageName.trim(),
        editId,
        editDialog.locale,
        editDialog.listing
      )
      addLog(`Saved ${editDialog.locale} listing`, 'success')
      await loadListings()
    } catch (error) {
      addLog(`Error saving: ${error.message}`, 'error')
    }

    setEditDialog({ open: false, locale: '', listing: null })
  }

  const existingLocales = listings.map(l => l.language)
  const availableTargetLocales = GP_LOCALES.filter(locale => locale.code !== sourceLocale)

  const canConnect = !!credentials.serviceAccountJson
  const hasCachedSession = hasValidToken()

  return {
    isConnecting,
    connectionStatus,
    sessionTimeLeft,
    formatTimeLeft,
    packageName,
    setPackageName,
    savedApps,
    handleRemoveSavedApp,
    editId,
    isCreatingEdit,
    developerUrl,
    setDeveloperUrl,
    developerApps,
    isLoadingDevApps,
    listings,
    isLoadingListings,
    sourceLocale,
    setSourceLocale,
    targetLocales,
    setTargetLocales,
    fieldsToTranslate,
    isTranslating,
    translationProgress,
    editDialog,
    setEditDialog,
    translationAlert,
    media,
    fullscreenImage,
    setFullscreenImage,
    logs,
    hasStoredGpKey,
    decryptPassword,
    setDecryptPassword,
    isDecrypting,
    decryptError,
    setDecryptError,
    currentAiApiKey,
    handleDecryptServiceAccount,
    handleTestConnection,
    handleCreateEdit,
    handleFetchDeveloperApps,
    handleSelectDeveloperApp,
    loadListings,
    handleCommitEdit,
    handleDiscardEdit,
    handleLocaleToggle,
    handleFieldToggle,
    handleTranslate,
    handleEditListing,
    handleSaveEdit,
    existingLocales,
    availableTargetLocales,
    canConnect,
    hasCachedSession,
  }
}
