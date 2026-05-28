import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import {
  listAppEvents,
  createAppEvent,
  updateAppEvent,
  deleteAppEvent,
  getAppEventLocalizations,
  createAppEventLocalization,
  updateAppEventLocalization,
  deleteAppEventLocalization,
  upsertAppEventLocalization,
} from '@/services/appStoreEventsService'
import { translateAllFields, ASC_LOCALES } from '@/services/appStoreConnectService'
import { PROVIDERS } from '@/services/translationService'

const EVENT_LOC_FIELDS = ['name', 'shortDescription', 'longDescription']

export default function useAppEvents({ credentials, selectedApp, aiConfig, translationPrompts }) {
  const [events, setEvents] = useState([])
  const [isLoadingEvents, setIsLoadingEvents] = useState(false)

  const [selectedEvent, setSelectedEvent] = useState(null)
  const [eventLocalizations, setEventLocalizations] = useState([])
  const [isLoadingLocalizations, setIsLoadingLocalizations] = useState(false)

  const [createEventDialog, setCreateEventDialog] = useState({ open: false, isSubmitting: false })
  const [editEventDialog, setEditEventDialog] = useState({ open: false, event: null, isSubmitting: false })
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, event: null, isDeleting: false })
  const [localizationDialog, setLocalizationDialog] = useState({
    open: false,
    locale: '',
    localization: null,
    isSaving: false,
  })
  const [translateAllDialog, setTranslateAllDialog] = useState({ open: false })

  const [isTranslatingAll, setIsTranslatingAll] = useState(false)
  const [translationProgress, setTranslationProgress] = useState({ current: 0, total: 0, locale: '' })

  const currentAiApiKey = aiConfig?.apiKeys?.[aiConfig.provider] || ''
  const currentAiModel = aiConfig?.models?.[aiConfig.provider] || PROVIDERS[aiConfig?.provider]?.defaultModel || ''

  const addLog = useCallback((message, type = 'info') => {
    if (type === 'error') toast.error(message)
    else if (type === 'success') toast.success(message)
    console.log(`[Events][${type}] ${message}`)
  }, [])

  const refreshEvents = useCallback(async () => {
    if (!selectedApp?.id) return
    setIsLoadingEvents(true)
    try {
      const list = await listAppEvents(credentials, selectedApp.id)
      setEvents(list)
    } catch (error) {
      addLog(`Failed to load events: ${error.message}`, 'error')
    }
    setIsLoadingEvents(false)
  }, [credentials, selectedApp?.id, addLog])

  // Auto-load when app changes; reset selection on app switch
  useEffect(() => {
    setEvents([])
    setSelectedEvent(null)
    setEventLocalizations([])
    if (selectedApp?.id) refreshEvents()
  }, [selectedApp?.id, refreshEvents])

  const refreshLocalizations = useCallback(async (eventId) => {
    setIsLoadingLocalizations(true)
    try {
      const locs = await getAppEventLocalizations(credentials, eventId)
      setEventLocalizations(locs)
      return locs
    } catch (error) {
      addLog(`Failed to load localizations: ${error.message}`, 'error')
      return []
    } finally {
      setIsLoadingLocalizations(false)
    }
  }, [credentials, addLog])

  const handleSelectEvent = useCallback(async (event) => {
    setSelectedEvent(event)
    if (!event) {
      setEventLocalizations([])
      return
    }
    await refreshLocalizations(event.id)
  }, [refreshLocalizations])

  const handleCreateEvent = useCallback(async (attributes) => {
    if (!selectedApp?.id) {
      addLog('Select an app first', 'error')
      return false
    }
    setCreateEventDialog(d => ({ ...d, isSubmitting: true }))
    try {
      const created = await createAppEvent(credentials, selectedApp.id, attributes)
      setEvents(prev => [created, ...prev])
      addLog(`Created event "${created.referenceName}"`, 'success')
      setCreateEventDialog({ open: false, isSubmitting: false })
      // Auto-select the new event so the user can start adding localizations
      await handleSelectEvent(created)
      return true
    } catch (error) {
      addLog(`Create failed: ${error.message}`, 'error')
      setCreateEventDialog(d => ({ ...d, isSubmitting: false }))
      return false
    }
  }, [credentials, selectedApp?.id, addLog, handleSelectEvent])

  const handleUpdateEvent = useCallback(async (eventId, attributes) => {
    setEditEventDialog(d => ({ ...d, isSubmitting: true }))
    try {
      await updateAppEvent(credentials, eventId, attributes)
      addLog('Event updated', 'success')
      // Optimistic merge
      setEvents(prev => prev.map(e => e.id === eventId ? { ...e, ...attributes } : e))
      if (selectedEvent?.id === eventId) {
        setSelectedEvent(prev => ({ ...prev, ...attributes }))
      }
      setEditEventDialog({ open: false, event: null, isSubmitting: false })
      return true
    } catch (error) {
      addLog(`Update failed: ${error.message}`, 'error')
      setEditEventDialog(d => ({ ...d, isSubmitting: false }))
      return false
    }
  }, [credentials, addLog, selectedEvent?.id])

  const handleDeleteEvent = useCallback(async (event) => {
    setDeleteConfirm(d => ({ ...d, isDeleting: true }))
    try {
      await deleteAppEvent(credentials, event.id)
      addLog(`Deleted event "${event.referenceName}"`, 'success')
      setEvents(prev => prev.filter(e => e.id !== event.id))
      if (selectedEvent?.id === event.id) {
        setSelectedEvent(null)
        setEventLocalizations([])
      }
      setDeleteConfirm({ open: false, event: null, isDeleting: false })
      return true
    } catch (error) {
      addLog(`Delete failed: ${error.message}`, 'error')
      setDeleteConfirm(d => ({ ...d, isDeleting: false }))
      return false
    }
  }, [credentials, addLog, selectedEvent?.id])

  const handleSaveLocalization = useCallback(async (locale, content) => {
    if (!selectedEvent?.id) return false
    setLocalizationDialog(d => ({ ...d, isSaving: true }))
    try {
      const existing = eventLocalizations.find(loc => loc.locale === locale)
      if (existing) {
        await updateAppEventLocalization(credentials, existing.id, content)
      } else {
        await createAppEventLocalization(credentials, selectedEvent.id, locale, content)
      }
      addLog(`Saved ${locale}`, 'success')
      await refreshLocalizations(selectedEvent.id)
      setLocalizationDialog({ open: false, locale: '', localization: null, isSaving: false })
      return true
    } catch (error) {
      addLog(`Save failed: ${error.message}`, 'error')
      setLocalizationDialog(d => ({ ...d, isSaving: false }))
      return false
    }
  }, [credentials, selectedEvent?.id, eventLocalizations, addLog, refreshLocalizations])

  const handleDeleteLocalization = useCallback(async (localization) => {
    try {
      await deleteAppEventLocalization(credentials, localization.id)
      addLog(`Removed ${localization.locale}`, 'success')
      setEventLocalizations(prev => prev.filter(l => l.id !== localization.id))
    } catch (error) {
      addLog(`Delete failed: ${error.message}`, 'error')
    }
  }, [credentials, addLog])

  // Translate the primary-locale localization into a set of target locales.
  // Reuses translateAllFields → translateAppStoreContent under the hood so each
  // event field gets the right per-field char-cap and provider retry logic.
  // Optional promptsOverride lets callers send a one-off prompts map without persisting it.
  const handleTranslateToAllLocales = useCallback(async (targetLocales, promptsOverride) => {
    if (!selectedEvent?.id) return false
    if (!currentAiApiKey) {
      addLog('Configure an AI provider API key first', 'error')
      return false
    }
    const source = eventLocalizations.find(loc => loc.locale === selectedEvent.primaryLocale)
    if (!source) {
      addLog(`Add the primary locale (${selectedEvent.primaryLocale}) first`, 'error')
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
          source,
          locale,
          aiCallConfig,
          EVENT_LOC_FIELDS,
          undefined,
          effectivePrompts,
        )
        if (errors.length > 0) {
          addLog(`${localeLabel}: partial — ${errors.map(e => e.field).join(', ')} failed`, 'error')
        }
        await upsertAppEventLocalization(
          credentials,
          selectedEvent.id,
          locale,
          {
            name: results.name,
            shortDescription: results.shortDescription,
            longDescription: results.longDescription,
          },
          eventLocalizations,
        )
        succeeded++
      } catch (error) {
        failed++
        addLog(`${localeLabel}: ${error.message}`, 'error')
      }
    }

    await refreshLocalizations(selectedEvent.id)
    setIsTranslatingAll(false)
    setTranslationProgress({ current: 0, total: 0, locale: '' })
    addLog(`Translated ${succeeded}/${targetLocales.length} locale(s)${failed ? `, ${failed} failed` : ''}`, succeeded > 0 ? 'success' : 'error')
    return failed === 0
  }, [
    credentials,
    selectedEvent,
    eventLocalizations,
    aiConfig,
    currentAiApiKey,
    currentAiModel,
    translationPrompts,
    addLog,
    refreshLocalizations,
  ])

  return {
    // data
    events,
    isLoadingEvents,
    selectedEvent,
    eventLocalizations,
    isLoadingLocalizations,
    isTranslatingAll,
    translationProgress,

    // actions
    refreshEvents,
    handleSelectEvent,
    handleCreateEvent,
    handleUpdateEvent,
    handleDeleteEvent,
    handleSaveLocalization,
    handleDeleteLocalization,
    handleTranslateToAllLocales,

    // dialogs
    createEventDialog,
    setCreateEventDialog,
    editEventDialog,
    setEditEventDialog,
    deleteConfirm,
    setDeleteConfirm,
    localizationDialog,
    setLocalizationDialog,
    translateAllDialog,
    setTranslateAllDialog,
  }
}
