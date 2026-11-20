import { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import {
  listRetentionMessages,
  createRetentionMessage,
  createRetentionMessageVersion,
  getRetentionMessageLocalizations,
  createRetentionMessageLocalization,
  deleteRetentionMessageLocalization,
  upsertRetentionMessageLocalization,
  pickWorkingVersion,
} from '@/services/appStoreRetentionMessagesService'
import { translateAllFields, ASC_LOCALES } from '@/services/appStoreConnectService'
import { PROVIDERS } from '@/services/translationService'

const RETENTION_LOC_FIELDS = ['header', 'body']

export default function useRetentionMessages({ credentials, selectedApp, aiConfig, translationPrompts, defaultLocale }) {
  const appId = selectedApp?.id
  const [messages, setMessages] = useState([])
  const [isLoadingMessages, setIsLoadingMessages] = useState(Boolean(appId))

  const [selectedMessageId, setSelectedMessageId] = useState(null)
  const [localizations, setLocalizations] = useState([])
  const [isLoadingLocalizations, setIsLoadingLocalizations] = useState(false)

  const [createDialog, setCreateDialog] = useState({ open: false, isSubmitting: false })
  const [isCreatingVersion, setIsCreatingVersion] = useState(false)
  const [localizationDialog, setLocalizationDialog] = useState({ open: false, locale: '', localization: null, isSaving: false })
  const [translateAllDialog, setTranslateAllDialog] = useState({ open: false })
  const [isTranslatingAll, setIsTranslatingAll] = useState(false)
  const [translationProgress, setTranslationProgress] = useState({ current: 0, total: 0, locale: '' })

  const currentAiApiKey = aiConfig?.apiKeys?.[aiConfig.provider] || ''
  const currentAiModel = aiConfig?.models?.[aiConfig.provider] || PROVIDERS[aiConfig?.provider]?.defaultModel || ''

  const selectedMessage = messages.find(m => m.id === selectedMessageId) || null
  const workingVersion = pickWorkingVersion(selectedMessage?.versions)
  const workingVersionId = workingVersion?.id

  const addLog = useCallback((message, type = 'info') => {
    if (type === 'error') toast.error(message)
    else if (type === 'success') toast.success(message)
    console.log(`[Retention][${type}] ${message}`)
  }, [])

  // Fetchers only touch state after the request, and an older response never
  // overwrites a newer one (switching apps or messages quickly)
  const messagesRequestRef = useRef(0)
  const fetchMessages = useCallback(() => {
    const request = ++messagesRequestRef.current
    return listRetentionMessages(credentials, appId)
      .then(list => {
        if (request === messagesRequestRef.current) setMessages(list)
        return list
      })
      .catch(error => {
        addLog(`Failed to load retention messages: ${error.message}`, 'error')
        return null
      })
      .finally(() => {
        if (request === messagesRequestRef.current) setIsLoadingMessages(false)
      })
  }, [credentials, appId, addLog])

  const localizationsRequestRef = useRef(0)
  const fetchLocalizations = useCallback((versionId) => {
    const request = ++localizationsRequestRef.current
    return getRetentionMessageLocalizations(credentials, versionId)
      .then(locs => {
        if (request === localizationsRequestRef.current) setLocalizations(locs)
        return locs
      })
      .catch(error => {
        addLog(`Failed to load localizations: ${error.message}`, 'error')
        return []
      })
      .finally(() => {
        if (request === localizationsRequestRef.current) setIsLoadingLocalizations(false)
      })
  }, [credentials, addLog])

  const refreshLocalizations = useCallback((versionId) => {
    if (!versionId) return Promise.resolve([])
    setIsLoadingLocalizations(true)
    return fetchLocalizations(versionId)
  }, [fetchLocalizations])

  // Reset during render when the app changes, then fetch the new app's messages
  const [loadedAppId, setLoadedAppId] = useState(appId)
  if (loadedAppId !== appId) {
    setLoadedAppId(appId)
    setMessages([])
    setSelectedMessageId(null)
    setIsLoadingMessages(Boolean(appId))
  }

  useEffect(() => {
    if (appId) fetchMessages()
  }, [appId, fetchMessages])

  // Follow the working version: selecting a message, or a new version replacing the old one
  const [loadedVersionId, setLoadedVersionId] = useState(workingVersionId)
  if (loadedVersionId !== workingVersionId) {
    setLoadedVersionId(workingVersionId)
    setLocalizations([])
    setIsLoadingLocalizations(Boolean(workingVersionId))
  }

  useEffect(() => {
    if (workingVersionId) fetchLocalizations(workingVersionId)
  }, [workingVersionId, fetchLocalizations])

  const handleRefresh = useCallback(async () => {
    if (!appId) return
    setIsLoadingMessages(true)
    const list = await fetchMessages()
    // A changed working version is fetched by the effect above
    const message = list?.find(m => m.id === selectedMessageId)
    const version = pickWorkingVersion(message?.versions)
    if (version && version.id === workingVersionId) refreshLocalizations(version.id)
  }, [appId, fetchMessages, selectedMessageId, workingVersionId, refreshLocalizations])

  const handleSelectMessage = useCallback((message) => {
    setSelectedMessageId(prev => (prev === message?.id ? null : message?.id ?? null))
  }, [])

  // A message without a version can't hold text, so the first version is created with it
  const handleCreateMessage = useCallback(async (referenceName) => {
    if (!appId) return false
    setCreateDialog(d => ({ ...d, isSubmitting: true }))
    let created = null
    try {
      created = await createRetentionMessage(credentials, appId, referenceName)
      const version = await createRetentionMessageVersion(credentials, created.id)
      created = { ...created, versions: [version] }
      addLog(`Created retention message "${created.referenceName}"`, 'success')
    } catch (error) {
      addLog(created ? `Message created, but its first version failed: ${error.message}` : `Create failed: ${error.message}`, 'error')
    }
    if (created) {
      setMessages(prev => [...prev, created])
      setSelectedMessageId(created.id)
      setCreateDialog({ open: false, isSubmitting: false })
      return true
    }
    setCreateDialog(d => ({ ...d, isSubmitting: false }))
    return false
  }, [credentials, appId, addLog])

  // Approved text can't change: start a new version and carry the current text over
  const handleCreateVersion = useCallback(async () => {
    if (!selectedMessage) return false
    const previous = localizations
    setIsCreatingVersion(true)
    try {
      const version = await createRetentionMessageVersion(credentials, selectedMessage.id)
      let copied = 0
      for (const loc of previous) {
        try {
          await createRetentionMessageLocalization(credentials, version.id, loc.locale, { header: loc.header, body: loc.body })
          copied++
        } catch (error) {
          addLog(`${loc.locale}: ${error.message}`, 'error')
        }
      }
      setMessages(prev => prev.map(m => (
        m.id === selectedMessage.id ? { ...m, versions: [...m.versions, version] } : m
      )))
      addLog(`New version created${previous.length ? `, ${copied}/${previous.length} locale(s) copied` : ''}`, 'success')
      return true
    } catch (error) {
      addLog(`New version failed: ${error.message}`, 'error')
      return false
    } finally {
      setIsCreatingVersion(false)
    }
  }, [credentials, selectedMessage, localizations, addLog])

  const handleSaveLocalization = useCallback(async (locale, content) => {
    if (!workingVersionId) return false
    setLocalizationDialog(d => ({ ...d, isSaving: true }))
    try {
      await upsertRetentionMessageLocalization(credentials, workingVersionId, locale, content, localizations)
      addLog(`Saved ${locale}`, 'success')
      await refreshLocalizations(workingVersionId)
      setLocalizationDialog({ open: false, locale: '', localization: null, isSaving: false })
      return true
    } catch (error) {
      addLog(`Save failed: ${error.message}`, 'error')
      setLocalizationDialog(d => ({ ...d, isSaving: false }))
      return false
    }
  }, [credentials, workingVersionId, localizations, addLog, refreshLocalizations])

  const handleDeleteLocalization = useCallback(async (localization) => {
    try {
      await deleteRetentionMessageLocalization(credentials, localization.id)
      setLocalizations(prev => prev.filter(l => l.id !== localization.id))
      addLog(`Removed ${localization.locale}`, 'success')
    } catch (error) {
      addLog(`Delete failed: ${error.message}`, 'error')
    }
  }, [credentials, addLog])

  // Source for AI translation: the app's source locale when the message has it,
  // otherwise the first locale with both header and body
  const sourceLocalization =
    localizations.find(l => l.locale === defaultLocale && l.header && l.body) ||
    localizations.find(l => l.header && l.body) ||
    null

  const handleTranslateToAllLocales = useCallback(async (targetLocales, promptsOverride) => {
    if (!workingVersionId || !sourceLocalization) {
      addLog('Write the header and body for one locale first', 'error')
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
          RETENTION_LOC_FIELDS,
          undefined,
          effectivePrompts,
        )
        // Header and body are both required for review, so never save half a message
        if (errors.length > 0) throw new Error(`${errors.map(e => e.field).join(', ')}: ${errors[0].error}`)
        await upsertRetentionMessageLocalization(
          credentials,
          workingVersionId,
          locale,
          { header: results.header, body: results.body },
          localizations,
        )
        succeeded++
      } catch (error) {
        failed++
        addLog(`${localeLabel}: ${error.message}`, 'error')
      }
    }

    await refreshLocalizations(workingVersionId)
    setIsTranslatingAll(false)
    setTranslationProgress({ current: 0, total: 0, locale: '' })
    addLog(`Translated ${succeeded}/${targetLocales.length} locale(s)${failed ? `, ${failed} failed` : ''}`, succeeded > 0 ? 'success' : 'error')
    return failed === 0
  }, [
    credentials,
    workingVersionId,
    sourceLocalization,
    localizations,
    aiConfig,
    currentAiApiKey,
    currentAiModel,
    translationPrompts,
    addLog,
    refreshLocalizations,
  ])

  return {
    messages,
    isLoadingMessages,
    selectedMessage,
    workingVersion,
    localizations,
    isLoadingLocalizations,
    sourceLocalization,
    isCreatingVersion,
    isTranslatingAll,
    translationProgress,

    handleRefresh,
    handleSelectMessage,
    handleCreateMessage,
    handleCreateVersion,
    handleSaveLocalization,
    handleDeleteLocalization,
    handleTranslateToAllLocales,

    createDialog,
    setCreateDialog,
    localizationDialog,
    setLocalizationDialog,
    translateAllDialog,
    setTranslateAllDialog,
  }
}
