import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Store, Link2, AppWindow, Layers, Languages, Sparkles, CheckCircle2, AlertCircle,
  Clock, Terminal, Edit3, Globe, Loader2, ChevronDown, RefreshCw, Upload, X, Save, Image, Trash2
} from 'lucide-react'
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
  GP_LOCALES,
  GP_IMAGE_TYPES,
} from '@/services/googlePlayService'
import { PROVIDERS } from '@/services/translationService'

export default function GooglePlayConnect({ credentials, onCredentialsChange, aiConfig }) {
  // Connection state
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState(null)
  const [sessionTimeLeft, setSessionTimeLeft] = useState(0)

  // Timer for session countdown
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

  // Package name (app identifier)
  const [packageName, setPackageName] = useState('')
  const [editId, setEditId] = useState(null)
  const [isCreatingEdit, setIsCreatingEdit] = useState(false)

  // Listings
  const [listings, setListings] = useState([])
  const [isLoadingListings, setIsLoadingListings] = useState(false)

  // Translation state
  const [sourceLocale, setSourceLocale] = useState('en-US')
  const [targetLocales, setTargetLocales] = useState([])
  const [fieldsToTranslate, setFieldsToTranslate] = useState(['title', 'shortDescription', 'fullDescription'])
  const [isTranslating, setIsTranslating] = useState(false)
  const [translationProgress, setTranslationProgress] = useState({ current: 0, total: 0, status: '' })

  // Edit dialog
  const [editDialog, setEditDialog] = useState({
    open: false,
    locale: '',
    listing: null,
  })

  // Translation alert
  const [translationAlert, setTranslationAlert] = useState({
    show: false,
    success: true,
    message: '',
    errorCount: 0,
  })

  // Image management state
  const [selectedImageLocale, setSelectedImageLocale] = useState('')
  const [selectedImageType, setSelectedImageType] = useState('phoneScreenshots')
  const [images, setImages] = useState([])
  const [isLoadingImages, setIsLoadingImages] = useState(false)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const [fullscreenImage, setFullscreenImage] = useState(null)

  // Logs
  const [logs, setLogs] = useState([])

  const addLog = useCallback((message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev.slice(-100), { message, type, timestamp }])
    if (type === 'error') toast.error(message)
    else if (type === 'success') toast.success(message)
  }, [])

  // Get current AI config
  const currentAiApiKey = aiConfig.apiKeys[aiConfig.provider] || ''
  const currentAiModel = aiConfig.models[aiConfig.provider] || PROVIDERS[aiConfig.provider]?.defaultModel || ''

  // Test connection
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

  // Create edit session
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
      
      // Load listings
      await loadListings(newEditId)
    } catch (error) {
      addLog(`Error creating edit: ${error.message}`, 'error')
    }
    setIsCreatingEdit(false)
  }


  // Load listings
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

  // Commit changes
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

  // Discard changes
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

  // Toggle target locale
  const handleLocaleToggle = (localeCode) => {
    setTargetLocales(prev =>
      prev.includes(localeCode)
        ? prev.filter(l => l !== localeCode)
        : [...prev, localeCode]
    )
  }

  // Toggle field to translate
  const handleFieldToggle = (field) => {
    setFieldsToTranslate(prev =>
      prev.includes(field)
        ? prev.filter(f => f !== field)
        : [...prev, field]
    )
  }

  // Translate all selected locales
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

    // Find source listing
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

        // Update listing
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

    // Reload listings
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

  // Open edit dialog
  const handleEditListing = (listing) => {
    setEditDialog({
      open: true,
      locale: listing.language,
      listing: { ...listing },
    })
  }

  // Load images for selected locale and type
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

  // Handle image upload
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

  // Delete single image
  const handleDeleteImage = async (imageId) => {
    try {
      await deleteImage(credentials, packageName.trim(), editId, selectedImageLocale, selectedImageType, imageId)
      addLog(`Deleted image ${imageId}`, 'success')
      await loadImages()
    } catch (error) {
      addLog(`Delete failed: ${error.message}`, 'error')
    }
  }

  // Delete all images for current locale/type
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

  // Save edited listing
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

  const TRANSLATABLE_FIELDS = [
    { key: 'title', label: 'Title', limit: 30 },
    { key: 'shortDescription', label: 'Short Description', limit: 80 },
    { key: 'fullDescription', label: 'Full Description', limit: 4000 },
  ]

  const canConnect = !!credentials.serviceAccountJson
  const hasCachedSession = hasValidToken()


  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-2xl gradient-card border border-border/50 p-8 shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex flex-col md:flex-row md:items-center gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 shadow-lg">
                <Store className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-foreground">Google Play Console</h1>
                <p className="text-sm text-muted-foreground">Translate your app listings</p>
              </div>
            </div>
            <p className="text-muted-foreground max-w-xl">
              Connect to Google Play Developer API to automatically translate your app title,
              descriptions, and other store listing content across all locales.
            </p>
          </div>
          {listings.length > 0 && (
            <div className="flex gap-4">
              <div className="text-center px-4 py-3 rounded-xl bg-background/50 border border-border/50">
                <div className="text-2xl font-bold text-green-500">{listings.length}</div>
                <div className="text-xs text-muted-foreground">Listings</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Connection Status */}
      <Card id="gp-connection" className="border-border/50 shadow-sm card-hover scroll-mt-6">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-500/10">
              <Link2 className="h-5 w-5 text-green-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Connect to Google Play</CardTitle>
              <CardDescription>Verify your service account and API access</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 flex-wrap">
            {credentials.serviceAccountJson ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-xs font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Service account loaded
              </div>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-500 text-xs font-medium">
                <AlertCircle className="h-3.5 w-3.5" />
                No service account
              </div>
            )}
            {connectionStatus?.tokenOnly && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 text-blue-500 text-xs font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Token valid
              </div>
            )}
            {sessionTimeLeft > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 text-xs font-medium font-mono">
                <Clock className="h-3.5 w-3.5" />
                {formatTimeLeft(sessionTimeLeft)}
              </div>
            )}
          </div>

          {/* Package name for testing */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Package Name (optional for token test)</Label>
            <Input
              placeholder="com.example.myapp"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              className="max-w-md"
              disabled={!!editId}
            />
            <p className="text-xs text-muted-foreground">
              Without package name: validates service account JSON only. With package name: tests full API access.
            </p>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={handleTestConnection}
              disabled={isConnecting || !canConnect}
              className={connectionStatus?.success && !connectionStatus?.tokenOnly ? '' : 'bg-green-600 hover:bg-green-700 border-0'}
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : packageName.trim() ? 'Test Full Access' : 'Validate Token'}
            </Button>
            {connectionStatus && (
              <div className={`flex items-start gap-2 px-4 py-2 rounded-lg max-w-lg ${connectionStatus.success ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                {connectionStatus.success ? <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" /> : <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />}
                <span className="text-sm font-medium whitespace-pre-wrap">{connectionStatus.message}</span>
              </div>
            )}
          </div>

          {!canConnect && (
            <p className="text-sm text-muted-foreground px-4 py-3 rounded-lg bg-muted/30 border border-border/50">
              Upload your Google Cloud service account JSON file in the sidebar to get started.
            </p>
          )}

          {/* Setup help */}
          <details className="text-sm">
            <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
              Setup requirements
            </summary>
            <div className="mt-3 p-4 rounded-lg bg-muted/30 border border-border/50 space-y-2 text-muted-foreground">
              <p className="font-medium text-foreground">To use Google Play API:</p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>Create a service account in Google Cloud Console</li>
                <li>Download the JSON key file</li>
                <li>In Play Console → Settings → API access, link the service account</li>
                <li>Grant "Admin" or "Release manager" permission for your app</li>
              </ol>
              <p className="text-xs pt-2">
                Note: Unlike App Store Connect, Google Play API requires a package name for all operations.
                There is no "list all apps" endpoint.
              </p>
            </div>
          </details>
        </CardContent>
      </Card>

      {/* App Selection */}
      {(connectionStatus?.success || hasCachedSession) && (
        <Card id="gp-app" className="border-border/50 shadow-sm card-hover scroll-mt-6">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
                <AppWindow className="h-5 w-5 text-violet-500" />
              </div>
              <div>
                <CardTitle className="text-lg">App Package</CardTitle>
                <CardDescription>Enter your app's package name to manage listings</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-3">
              <Input
                placeholder="com.example.myapp"
                value={packageName}
                onChange={(e) => setPackageName(e.target.value)}
                className="flex-1 max-w-md"
                disabled={!!editId}
              />
              {!editId ? (
                <Button
                  onClick={handleCreateEdit}
                  disabled={isCreatingEdit || !packageName.trim()}
                >
                  {isCreatingEdit ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : 'Load App'}
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button onClick={handleCommitEdit} className="bg-green-600 hover:bg-green-700">
                    <Save className="h-4 w-4 mr-2" />
                    Commit Changes
                  </Button>
                  <Button variant="outline" onClick={handleDiscardEdit}>
                    <X className="h-4 w-4 mr-2" />
                    Discard
                  </Button>
                </div>
              )}
            </div>
            {editId && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 text-amber-500 text-sm">
                <AlertCircle className="h-4 w-4" />
                Edit session active. Remember to commit your changes!
              </div>
            )}
          </CardContent>
        </Card>
      )}


      {/* Listings */}
      {listings.length > 0 && (
        <Card id="gp-listings" className="border-border/50 shadow-sm card-hover scroll-mt-6">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10">
                  <Layers className="h-5 w-5 text-emerald-500" />
                </div>
                <div>
                  <CardTitle className="text-lg">Store Listings</CardTitle>
                  <CardDescription>{listings.length} localized listing(s)</CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={() => loadListings()} disabled={isLoadingListings}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoadingListings ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-xl border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="w-[150px]">Language</TableHead>
                    <TableHead className="w-[200px]">Title</TableHead>
                    <TableHead>Short Description</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {listings.map(listing => {
                    const localeInfo = GP_LOCALES.find(l => l.code === listing.language)
                    return (
                      <TableRow key={listing.language} className="hover:bg-muted/20">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{localeInfo?.flag || '🌐'}</span>
                            <span className="text-sm font-medium">{localeInfo?.name || listing.language}</span>
                          </div>
                        </TableCell>
                        <TableCell className="font-medium">{listing.title || '-'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground truncate max-w-[300px]">
                          {listing.shortDescription || '-'}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" onClick={() => handleEditListing(listing)}>
                            <Edit3 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Translation */}
      {listings.length > 0 && (
        <Card id="gp-images" className="border-border/50 shadow-sm card-hover scroll-mt-6">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10">
                <Image className="h-5 w-5 text-pink-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Screenshots & Graphics</CardTitle>
                <CardDescription>Manage images for your store listing</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Language</Label>
                <select
                  value={selectedImageLocale}
                  onChange={(e) => {
                    setSelectedImageLocale(e.target.value)
                    setImages([])
                  }}
                  className="h-9 rounded-lg border border-input bg-background px-3 text-sm min-w-[180px]"
                >
                  <option value="">Select language...</option>
                  {existingLocales.map(locale => {
                    const info = GP_LOCALES.find(l => l.code === locale)
                    return (
                      <option key={locale} value={locale}>
                        {info?.flag} {info?.name || locale}
                      </option>
                    )
                  })}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Image Type</Label>
                <select
                  value={selectedImageType}
                  onChange={(e) => {
                    setSelectedImageType(e.target.value)
                    setImages([])
                  }}
                  className="h-9 rounded-lg border border-input bg-background px-3 text-sm min-w-[200px]"
                >
                  {Object.entries(GP_IMAGE_TYPES).map(([key, info]) => (
                    <option key={key} value={key}>
                      {info.name} (max {info.max})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadImages}
                  disabled={!selectedImageLocale || isLoadingImages}
                >
                  {isLoadingImages ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  <span className="ml-2">Load</span>
                </Button>
              </div>
            </div>

            {selectedImageLocale && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">
                    {images.length} image{images.length !== 1 ? 's' : ''} loaded
                  </span>
                  <div className="flex gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={isUploadingImage || images.length >= (GP_IMAGE_TYPES[selectedImageType]?.max || 8)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isUploadingImage || images.length >= (GP_IMAGE_TYPES[selectedImageType]?.max || 8)}
                        asChild
                      >
                        <span>
                          {isUploadingImage ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                          Upload
                        </span>
                      </Button>
                    </label>
                    {images.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDeleteAllImages}
                        className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete All
                      </Button>
                    )}
                  </div>
                </div>

                {images.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {images.map((img) => (
                      <div key={img.id} className="relative group rounded-lg border border-border/50 overflow-hidden bg-muted/20">
                        <img
                          src={img.url}
                          alt={`Screenshot ${img.id}`}
                          className="max-h-64 w-auto cursor-pointer hover:opacity-80 transition-opacity"
                          crossOrigin="anonymous"
                          referrerPolicy="no-referrer"
                          onClick={() => setFullscreenImage(img.url)}
                        />
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => handleDeleteImage(img.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border border-dashed border-border/50 rounded-lg">
                    <Image className="h-8 w-8 mb-2 opacity-50" />
                    <p className="text-sm">No images loaded</p>
                    <p className="text-xs">Select a language and click Load</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Translation */}
      {listings.length > 0 && (
        <Card id="gp-translation" className="border-border/50 shadow-sm card-hover scroll-mt-6">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl gradient-primary shadow-lg">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg">AI Translation</CardTitle>
                <CardDescription>Translate listings to multiple languages</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Translation Alert */}
            {translationAlert.show && (
              <Alert className={translationAlert.success ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-amber-500/50 bg-amber-500/10'}>
                {translationAlert.success ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-amber-500" />}
                <AlertTitle className={translationAlert.success ? 'text-emerald-500' : 'text-amber-500'}>
                  {translationAlert.success ? 'Translation Complete' : 'Translation Completed with Errors'}
                </AlertTitle>
                <AlertDescription>{translationAlert.message}</AlertDescription>
              </Alert>
            )}

            {/* Source Locale */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Source Language</Label>
              <select
                value={sourceLocale}
                onChange={(e) => setSourceLocale(e.target.value)}
                className="w-full max-w-xs h-10 rounded-lg border border-input bg-background px-3 text-sm"
              >
                {existingLocales.map(locale => {
                  const info = GP_LOCALES.find(l => l.code === locale)
                  return (
                    <option key={locale} value={locale}>
                      {info?.flag} {info?.name || locale}
                    </option>
                  )
                })}
              </select>
            </div>

            {/* Fields to Translate */}
            <div className="space-y-3">
              <Label className="text-sm font-medium">Fields to Translate</Label>
              <div className="flex flex-wrap gap-2">
                {TRANSLATABLE_FIELDS.map(field => (
                  <button
                    key={field.key}
                    onClick={() => handleFieldToggle(field.key)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                      fieldsToTranslate.includes(field.key)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
                      fieldsToTranslate.includes(field.key) ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                    }`}>
                      {fieldsToTranslate.includes(field.key) && (
                        <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                    {field.label}
                    <Badge variant="secondary" className="text-xs">{field.limit}</Badge>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Locales */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Target Languages</Label>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (targetLocales.length === availableTargetLocales.length) {
                      setTargetLocales([])
                    } else {
                      setTargetLocales(availableTargetLocales.map(l => l.code))
                    }
                  }}
                >
                  {targetLocales.length === availableTargetLocales.length ? 'Deselect All' : 'Select All'}
                </Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-1">
                {availableTargetLocales.map(locale => {
                  const isSelected = targetLocales.includes(locale.code)
                  const exists = existingLocales.includes(locale.code)
                  return (
                    <button
                      key={locale.code}
                      onClick={() => handleLocaleToggle(locale.code)}
                      className={`flex items-center gap-2 p-2 rounded-lg border text-left text-sm transition-all ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : exists
                            ? 'border-emerald-500/30 bg-emerald-500/5'
                            : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${
                        isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                      }`}>
                        {isSelected && (
                          <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span>{locale.flag}</span>
                      <span className="truncate">{locale.name}</span>
                      {exists && <CheckCircle2 className="h-3 w-3 text-emerald-500 ml-auto shrink-0" />}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Translate Button */}
            <div className="pt-4">
              <Button
                onClick={handleTranslate}
                disabled={isTranslating || !currentAiApiKey || targetLocales.length === 0 || fieldsToTranslate.length === 0}
                className="w-full h-12 text-base font-semibold gradient-primary hover:opacity-90 border-0"
                size="lg"
              >
                {isTranslating ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Translating... ({translationProgress.current}/{translationProgress.total})
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    Translate {targetLocales.length > 0 && `(${targetLocales.length} languages)`}
                  </span>
                )}
              </Button>
              {isTranslating && translationProgress.status && (
                <p className="text-sm text-muted-foreground mt-2 text-center">{translationProgress.status}</p>
              )}
            </div>
          </CardContent>
        </Card>
      )}


      {/* Activity Log */}
      <Card id="gp-logs" className="border-border/50 shadow-sm scroll-mt-6">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10">
              <Terminal className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Activity Log</CardTitle>
              <CardDescription>Track API calls and translation progress</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64 rounded-xl border border-border/50 bg-muted/20">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Terminal className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No activity yet</p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {logs.map((log, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 text-sm py-1.5 px-3 rounded-lg transition-colors ${
                      log.type === 'error' ? 'bg-red-500/10' :
                      log.type === 'success' ? 'bg-emerald-500/10' :
                      'hover:bg-muted/50'
                    }`}
                  >
                    <span className={`mt-0.5 ${
                      log.type === 'error' ? 'text-red-500' :
                      log.type === 'success' ? 'text-emerald-500' :
                      'text-muted-foreground'
                    }`}>
                      {log.type === 'error' ? <AlertCircle className="h-4 w-4" /> :
                       log.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> :
                       <Clock className="h-4 w-4" />}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground shrink-0 pt-0.5">
                      {log.timestamp}
                    </span>
                    <span className={`break-all ${
                      log.type === 'error' ? 'text-red-400' :
                      log.type === 'success' ? 'text-emerald-400' :
                      'text-foreground'
                    }`}>{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialog.open} onOpenChange={(open) => !open && setEditDialog({ ...editDialog, open: false })}>
        <DialogContent className="sm:max-w-[600px] gap-0 p-0 overflow-hidden max-h-[90vh]">
          <DialogHeader className="p-6 pb-4 border-b border-border/50 bg-muted/30">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{GP_LOCALES.find(l => l.code === editDialog.locale)?.flag || '🌐'}</span>
              <div>
                <DialogTitle className="text-xl">Edit Listing</DialogTitle>
                <DialogDescription>
                  {GP_LOCALES.find(l => l.code === editDialog.locale)?.name || editDialog.locale}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">Title (max 30 chars)</Label>
                <Input
                  id="title"
                  value={editDialog.listing?.title || ''}
                  onChange={(e) => setEditDialog(prev => ({
                    ...prev,
                    listing: { ...prev.listing, title: e.target.value }
                  }))}
                  maxLength={30}
                  className="text-base"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {editDialog.listing?.title?.length || 0}/30
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="shortDescription" className="text-sm font-medium">Short Description (max 80 chars)</Label>
                <Textarea
                  id="shortDescription"
                  value={editDialog.listing?.shortDescription || ''}
                  onChange={(e) => setEditDialog(prev => ({
                    ...prev,
                    listing: { ...prev.listing, shortDescription: e.target.value }
                  }))}
                  maxLength={80}
                  rows={2}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {editDialog.listing?.shortDescription?.length || 0}/80
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullDescription" className="text-sm font-medium">Full Description (max 4000 chars)</Label>
                <Textarea
                  id="fullDescription"
                  value={editDialog.listing?.fullDescription || ''}
                  onChange={(e) => setEditDialog(prev => ({
                    ...prev,
                    listing: { ...prev.listing, fullDescription: e.target.value }
                  }))}
                  maxLength={4000}
                  rows={10}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground text-right">
                  {editDialog.listing?.fullDescription?.length || 0}/4000
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="video" className="text-sm font-medium">Video URL (YouTube)</Label>
                <Input
                  id="video"
                  value={editDialog.listing?.video || ''}
                  onChange={(e) => setEditDialog(prev => ({
                    ...prev,
                    listing: { ...prev.listing, video: e.target.value }
                  }))}
                  placeholder="https://youtube.com/watch?v=..."
                />
              </div>
            </div>
          </ScrollArea>
          <DialogFooter className="p-6 pt-4 border-t border-border/50 bg-muted/20">
            <Button variant="ghost" onClick={() => setEditDialog({ open: false, locale: '', listing: null })}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} className="gradient-primary border-0">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Image Viewer */}
      {fullscreenImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center cursor-pointer"
          onClick={() => setFullscreenImage(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={() => setFullscreenImage(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <img
            src={fullscreenImage}
            alt="Full size screenshot"
            className="max-w-[90vw] max-h-[90vh] object-contain"
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}
