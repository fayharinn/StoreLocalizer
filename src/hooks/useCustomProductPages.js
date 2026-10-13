import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import {
  listCustomProductPages,
  createCustomProductPage,
  updateCustomProductPage,
  deleteCustomProductPage,
  listCustomProductPageVersions,
  createCustomProductPageVersion,
  updateCustomProductPageVersion,
  getCustomProductPageLocalizations,
  createCustomProductPageLocalization,
  updateCustomProductPageLocalization,
  deleteCustomProductPageLocalization,
  upsertCustomProductPageLocalization,
} from '@/services/appStoreProductPagesService'
import { translateAllFields, ASC_LOCALES } from '@/services/appStoreConnectService'
import { PROVIDERS } from '@/services/translationService'
import useLocalizedMedia from './useLocalizedMedia'

export default function useCustomProductPages({ credentials, selectedApp, assetLibrary, aiConfig, translationPrompts, defaultLocale }) {
  const appId = selectedApp?.id
  const [pages, setPages] = useState([])
  const [isLoadingPages, setIsLoadingPages] = useState(Boolean(appId))

  const [selectedPage, setSelectedPage] = useState(null)
  const [pageVersions, setPageVersions] = useState([])
  const [localizations, setLocalizations] = useState([])
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)

  const [pageDialog, setPageDialog] = useState({ open: false, mode: 'create', page: null, isSubmitting: false })
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, page: null, isDeleting: false })
  const [localizationDialog, setLocalizationDialog] = useState({ open: false, locale: '', localization: null, isSaving: false })
  const [translateAllDialog, setTranslateAllDialog] = useState({ open: false })
  const [isCreatingVersion, setIsCreatingVersion] = useState(false)

  const [isTranslatingAll, setIsTranslatingAll] = useState(false)
  const [translationProgress, setTranslationProgress] = useState({ current: 0, total: 0, locale: '' })

  const currentAiApiKey = aiConfig?.apiKeys?.[aiConfig.provider] || ''
  const currentAiModel = aiConfig?.models?.[aiConfig.provider] || PROVIDERS[aiConfig?.provider]?.defaultModel || ''

  // The newest version is the one users edit; older ones are history
  const latestVersion = pageVersions[0] || null
  const latestVersionId = latestVersion?.id
  const selectedPageId = selectedPage?.id

  const addLog = useCallback((message, type = 'info') => {
    if (type === 'error') toast.error(message)
    else if (type === 'success') toast.success(message)
    console.log(`[CPP][${type}] ${message}`)
  }, [])

  // Only touches state after the request — callers flag the loading state
  const fetchPages = useCallback(() =>
    listCustomProductPages(credentials, appId)
      .then(setPages)
      .catch(error => addLog(`Failed to load custom product pages: ${error.message}`, 'error'))
      .finally(() => setIsLoadingPages(false)),
  [credentials, appId, addLog])

  const refreshPages = useCallback(() => {
    if (!appId) return
    setIsLoadingPages(true)
    return fetchPages()
  }, [appId, fetchPages])

  // Reset during render when the app changes, then fetch the new app's pages
  const [loadedAppId, setLoadedAppId] = useState(appId)
  if (loadedAppId !== appId) {
    setLoadedAppId(appId)
    setPages([])
    setSelectedPage(null)
    setPageVersions([])
    setLocalizations([])
    setIsLoadingPages(Boolean(appId))
  }

  useEffect(() => {
    if (appId) fetchPages()
  }, [appId, fetchPages])

  const refreshLocalizations = useCallback(async (versionId = latestVersionId) => {
    if (!versionId) return []
    try {
      const locs = await getCustomProductPageLocalizations(credentials, versionId)
      setLocalizations(locs)
      return locs
    } catch (error) {
      addLog(`Failed to load localizations: ${error.message}`, 'error')
      return []
    }
  }, [credentials, latestVersionId, addLog])

  const loadPageDetail = useCallback(async (page) => {
    setIsLoadingDetail(true)
    try {
      const versions = await listCustomProductPageVersions(credentials, page.id)
      setPageVersions(versions)
      setLocalizations(versions[0] ? await getCustomProductPageLocalizations(credentials, versions[0].id) : [])
    } catch (error) {
      addLog(`Failed to load page: ${error.message}`, 'error')
      setPageVersions([])
      setLocalizations([])
    }
    setIsLoadingDetail(false)
  }, [credentials, addLog])

  const handleSelectPage = useCallback(async (page) => {
    if (!page || page.id === selectedPageId) {
      setSelectedPage(null)
      setPageVersions([])
      setLocalizations([])
      return
    }
    setSelectedPage(page)
    await loadPageDetail(page)
  }, [selectedPageId, loadPageDetail])

  const handleCreatePage = useCallback(async ({ name, locale, promotionalText, deepLink, template }) => {
    if (!appId) return false
    setPageDialog(d => ({ ...d, isSubmitting: true }))
    try {
      const created = await createCustomProductPage(credentials, appId, { name, locale, promotionalText, deepLink, template })
      setPages(prev => [created, ...prev])
      addLog(`Created custom product page "${created.name}"`, 'success')
      setPageDialog({ open: false, mode: 'create', page: null, isSubmitting: false })
      setSelectedPage(created)
      await loadPageDetail(created)
      return true
    } catch (error) {
      addLog(`Create failed: ${error.message}`, 'error')
      setPageDialog(d => ({ ...d, isSubmitting: false }))
      return false
    }
  }, [credentials, appId, addLog, loadPageDetail])

  // { name, visible } on the page, { deepLink } on its latest version
  const handleUpdatePage = useCallback(async (page, { name, visible, deepLink }) => {
    setPageDialog(d => ({ ...d, isSubmitting: true }))
    try {
      await updateCustomProductPage(credentials, page.id, { name, visible })
      if (deepLink !== undefined && latestVersion && selectedPageId === page.id && deepLink !== latestVersion.deepLink) {
        await updateCustomProductPageVersion(credentials, latestVersion.id, { deepLink })
        setPageVersions(prev => prev.map(v => v.id === latestVersion.id ? { ...v, deepLink } : v))
      }
      const merged = { ...page, name, visible }
      setPages(prev => prev.map(p => p.id === page.id ? merged : p))
      if (selectedPageId === page.id) setSelectedPage(merged)
      addLog('Custom product page updated', 'success')
      setPageDialog({ open: false, mode: 'create', page: null, isSubmitting: false })
      return true
    } catch (error) {
      addLog(`Update failed: ${error.message}`, 'error')
      setPageDialog(d => ({ ...d, isSubmitting: false }))
      return false
    }
  }, [credentials, latestVersion, selectedPageId, addLog])

  const handleToggleVisibility = useCallback(async (page) => {
    try {
      await updateCustomProductPage(credentials, page.id, { visible: !page.visible })
      const merged = { ...page, visible: !page.visible }
      setPages(prev => prev.map(p => p.id === page.id ? merged : p))
      if (selectedPageId === page.id) setSelectedPage(merged)
      addLog(`"${page.name}" is now ${merged.visible ? 'visible' : 'hidden'}`, 'success')
    } catch (error) {
      addLog(`Update failed: ${error.message}`, 'error')
    }
  }, [credentials, selectedPageId, addLog])

  const handleDeletePage = useCallback(async (page) => {
    setDeleteConfirm(d => ({ ...d, isDeleting: true }))
    try {
      await deleteCustomProductPage(credentials, page.id)
      setPages(prev => prev.filter(p => p.id !== page.id))
      if (selectedPageId === page.id) {
        setSelectedPage(null)
        setPageVersions([])
        setLocalizations([])
      }
      addLog(`Deleted "${page.name}"`, 'success')
      setDeleteConfirm({ open: false, page: null, isDeleting: false })
      return true
    } catch (error) {
      addLog(`Delete failed: ${error.message}`, 'error')
      setDeleteConfirm(d => ({ ...d, isDeleting: false }))
      return false
    }
  }, [credentials, selectedPageId, addLog])

  const latestDeepLink = latestVersion?.deepLink
  const handleCreateVersion = useCallback(async () => {
    if (!selectedPage) return
    setIsCreatingVersion(true)
    try {
      const created = await createCustomProductPageVersion(credentials, selectedPage.id, { deepLink: latestDeepLink })
      addLog(`Created version ${created.version} — you can edit the page again`, 'success')
      await loadPageDetail(selectedPage)
    } catch (error) {
      addLog(`Could not create a new version: ${error.message}`, 'error')
    }
    setIsCreatingVersion(false)
  }, [credentials, selectedPage, latestDeepLink, addLog, loadPageDetail])

  const handleSaveLocalization = useCallback(async (locale, promotionalText) => {
    if (!latestVersion) return false
    setLocalizationDialog(d => ({ ...d, isSaving: true }))
    try {
      const existing = localizations.find(l => l.locale === locale)
      if (existing) {
        await updateCustomProductPageLocalization(credentials, existing.id, promotionalText)
      } else {
        await createCustomProductPageLocalization(credentials, latestVersion.id, locale, promotionalText)
      }
      addLog(`Saved ${locale}`, 'success')
      await refreshLocalizations(latestVersion.id)
      setLocalizationDialog({ open: false, locale: '', localization: null, isSaving: false })
      return true
    } catch (error) {
      addLog(`Save failed: ${error.message}`, 'error')
      setLocalizationDialog(d => ({ ...d, isSaving: false }))
      return false
    }
  }, [credentials, latestVersion, localizations, addLog, refreshLocalizations])

  const handleDeleteLocalization = useCallback(async (localization) => {
    try {
      await deleteCustomProductPageLocalization(credentials, localization.id)
      setLocalizations(prev => prev.filter(l => l.id !== localization.id))
      addLog(`Removed ${localization.locale}`, 'success')
    } catch (error) {
      addLog(`Delete failed: ${error.message}`, 'error')
    }
  }, [credentials, addLog])

  // Source locale for AI translation: the app's source locale when the page has
  // it, otherwise the first localization with promotional text.
  const sourceLocalization =
    localizations.find(l => l.locale === defaultLocale && l.promotionalText) ||
    localizations.find(l => l.promotionalText) ||
    null

  const handleTranslateToAllLocales = useCallback(async (targetLocales, promptsOverride) => {
    if (!latestVersion || !sourceLocalization) {
      addLog('Write the promotional text for one locale first', 'error')
      return false
    }
    if (!currentAiApiKey) {
      addLog('Configure an AI provider API key first', 'error')
      return false
    }

    const aiCallConfig = {
      provider: aiConfig.provider,
      apiKey: currentAiApiKey,
      model: currentAiModel,
      region: aiConfig.region,
      endpoint: aiConfig.endpoint,
      serviceTier: aiConfig.serviceTier,
    }
    const effectivePrompts = promptsOverride ?? translationPrompts

    setIsTranslatingAll(true)
    setTranslationProgress({ current: 0, total: targetLocales.length, locale: '' })
    let succeeded = 0
    let failed = 0

    for (let i = 0; i < targetLocales.length; i++) {
      const locale = targetLocales[i]
      const localeLabel = ASC_LOCALES.find(l => l.code === locale)?.name || locale
      setTranslationProgress({ current: i + 1, total: targetLocales.length, locale: localeLabel })
      try {
        const { results, errors } = await translateAllFields(
          sourceLocalization,
          locale,
          aiCallConfig,
          ['promotionalText'],
          undefined,
          effectivePrompts,
        )
        if (errors.length > 0) throw new Error(errors[0].error)
        await upsertCustomProductPageLocalization(credentials, latestVersion.id, locale, results.promotionalText, localizations)
        succeeded++
      } catch (error) {
        failed++
        addLog(`${localeLabel}: ${error.message}`, 'error')
      }
    }

    await refreshLocalizations(latestVersion.id)
    setIsTranslatingAll(false)
    setTranslationProgress({ current: 0, total: 0, locale: '' })
    addLog(`Translated ${succeeded}/${targetLocales.length} locale(s)${failed ? `, ${failed} failed` : ''}`, succeeded > 0 ? 'success' : 'error')
    return failed === 0
  }, [
    credentials,
    latestVersion,
    sourceLocalization,
    localizations,
    aiConfig,
    currentAiApiKey,
    currentAiModel,
    translationPrompts,
    addLog,
    refreshLocalizations,
  ])

  // Dropping a locale folder that the page doesn't have yet creates that localization
  const ensureLocalization = useCallback(async (locale) => {
    const existing = localizations.find(l => l.locale === locale)
    if (existing) return existing
    if (!ASC_LOCALES.some(l => l.code === locale)) {
      throw new Error(`"${locale}" is not an App Store locale`)
    }
    return createCustomProductPageLocalization(credentials, latestVersionId, locale)
  }, [credentials, localizations, latestVersionId])

  const media = useLocalizedMedia({
    credentials,
    library: assetLibrary,
    surfaceType: 'appCustomProductPageLocalizations',
    scopeId: latestVersionId,
    localizations,
    ensureLocalization,
    fallbackLocale: sourceLocalization?.locale || defaultLocale,
    log: addLog,
  })

  // Uploads can create localizations — refresh the list, then the placements
  const { handleUpload: uploadQueue, loadPlacements } = media
  const handleUploadMedia = useCallback(async () => {
    await uploadQueue()
    const locs = await refreshLocalizations()
    await loadPlacements(locs)
  }, [uploadQueue, refreshLocalizations, loadPlacements])

  return {
    // data
    pages,
    isLoadingPages,
    selectedPage,
    pageVersions,
    latestVersion,
    localizations,
    sourceLocalization,
    isLoadingDetail,
    isCreatingVersion,
    isTranslatingAll,
    translationProgress,
    currentAiApiKey,
    media: { ...media, handleUpload: handleUploadMedia },

    // actions
    refreshPages,
    handleSelectPage,
    handleCreatePage,
    handleUpdatePage,
    handleToggleVisibility,
    handleDeletePage,
    handleCreateVersion,
    handleSaveLocalization,
    handleDeleteLocalization,
    handleTranslateToAllLocales,

    // dialogs
    pageDialog,
    setPageDialog,
    deleteConfirm,
    setDeleteConfirm,
    localizationDialog,
    setLocalizationDialog,
    translateAllDialog,
    setTranslateAllDialog,
  }
}
