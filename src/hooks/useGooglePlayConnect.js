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
  listImages,
  uploadImage,
  deleteImage,
  deleteAllImages,
  fetchDeveloperApps,
  GP_LOCALES,
  GP_IMAGE_TYPES,
} from '@/services/googlePlayService'
import { PROVIDERS } from '@/services/translationService'
import { decrypt } from '@/utils/crypto'

const ENCRYPTED_GP_KEY_STORAGE = 'gp-encrypted-service-account'

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

  const [packageName, setPackageName] = useState('')
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

  const [selectedImageLocale, setSelectedImageLocale] = useState('')
  const [selectedImageType, setSelectedImageType] = useState('phoneScreenshots')
  const [images, setImages] = useState([])
  const [isLoadingImages, setIsLoadingImages] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
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

  const handleCreateEdit = async () => {
    if (!packageName.trim()) {
      addLog('Please enter a package name', 'error')
      return
    }

    setIsCreatingEdit(true)
    try {
      const newEditId = await createEdit(credentials, packageName.trim())
      setEditId(newEditId)
      addLog(`Created edit session: ${newEditId}`, 'success')

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

  const loadImages = async () => {
    if (!selectedImageLocale || !selectedImageType) return

    setIsLoadingImages(true)
    try {
      const imageList = await listImages(credentials, packageName.trim(), editId, selectedImageLocale, selectedImageType)
      setImages(imageList)
      addLog(`Loaded ${imageList.length} ${selectedImageType} for ${selectedImageLocale}`, 'success')
    } catch (error) {
      addLog(`Error loading images: ${error.message}`, 'error')
      setImages([])
    }
    setIsLoadingImages(false)
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      addLog('Please select an image file', 'error')
      return
    }

    setIsUploadingImage(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      await uploadImage(credentials, packageName.trim(), editId, selectedImageLocale, selectedImageType, arrayBuffer)
      addLog(`Uploaded ${file.name} to ${selectedImageLocale}/${selectedImageType}`, 'success')
      await loadImages()
    } catch (error) {
      addLog(`Upload failed: ${error.message}`, 'error')
    }
    setIsUploadingImage(false)
    e.target.value = ''
  }

  const handleDeleteImage = async (imageId) => {
    try {
      await deleteImage(credentials, packageName.trim(), editId, selectedImageLocale, selectedImageType, imageId)
      addLog(`Deleted image ${imageId}`, 'success')
      await loadImages()
    } catch (error) {
      addLog(`Delete failed: ${error.message}`, 'error')
    }
  }

  const handleDeleteAllImages = async () => {
    if (!confirm(`Delete all ${GP_IMAGE_TYPES[selectedImageType]?.name} for ${selectedImageLocale}?`)) return

    try {
      await deleteAllImages(credentials, packageName.trim(), editId, selectedImageLocale, selectedImageType)
      addLog(`Deleted all ${selectedImageType} for ${selectedImageLocale}`, 'success')
      setImages([])
    } catch (error) {
      addLog(`Delete all failed: ${error.message}`, 'error')
    }
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
    selectedImageLocale,
    setSelectedImageLocale,
    selectedImageType,
    setSelectedImageType,
    images,
    setImages,
    isLoadingImages,
    isUploadingImage,
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
    loadImages,
    handleImageUpload,
    handleDeleteImage,
    handleDeleteAllImages,
    handleSaveEdit,
    existingLocales,
    availableTargetLocales,
    canConnect,
    hasCachedSession,
  }
}
