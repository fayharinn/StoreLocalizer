import { useState, useCallback, useEffect } from 'react'
import { toast } from 'sonner'
import {
  listExperiments,
  createExperiment,
  updateExperiment,
  deleteExperiment,
  listTreatments,
  createTreatment,
  updateTreatment,
  deleteTreatment,
  getTreatmentLocalizations,
  createTreatmentLocalization,
  deleteTreatmentLocalization,
} from '@/services/appStoreProductPagesService'
import { ASC_LOCALES } from '@/services/appStoreConnectService'
import useLocalizedMedia from './useLocalizedMedia'

const TREATMENT_LETTERS = ['A', 'B', 'C']

export default function useProductPageExperiments({ credentials, selectedApp, assetLibrary, defaultLocale }) {
  const appId = selectedApp?.id
  const [experiments, setExperiments] = useState([])
  const [isLoadingExperiments, setIsLoadingExperiments] = useState(Boolean(appId))

  const [selectedExperiment, setSelectedExperiment] = useState(null)
  const [treatments, setTreatments] = useState([])
  const [isLoadingDetail, setIsLoadingDetail] = useState(false)
  const [activeTreatmentId, setActiveTreatmentId] = useState(null)
  const [treatmentLocalizations, setTreatmentLocalizations] = useState([])
  const [isLoadingLocalizations, setIsLoadingLocalizations] = useState(false)

  const [experimentDialog, setExperimentDialog] = useState({ open: false, mode: 'create', experiment: null, isSubmitting: false })
  const [treatmentDialog, setTreatmentDialog] = useState({ open: false, mode: 'create', treatment: null, isSubmitting: false })
  // kind: 'experiment' | 'treatment'
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, kind: 'experiment', target: null, isDeleting: false })
  const [startConfirm, setStartConfirm] = useState({ open: false, experiment: null, isStarting: false })

  const activeTreatment = treatments.find(t => t.id === activeTreatmentId) || null
  const selectedExperimentId = selectedExperiment?.id

  const addLog = useCallback((message, type = 'info') => {
    if (type === 'error') toast.error(message)
    else if (type === 'success') toast.success(message)
    console.log(`[PPO][${type}] ${message}`)
  }, [])

  // Only touches state after the request — callers flag the loading state
  const fetchExperiments = useCallback(() =>
    listExperiments(credentials, appId)
      .then(setExperiments)
      .catch(error => addLog(`Failed to load product page tests: ${error.message}`, 'error'))
      .finally(() => setIsLoadingExperiments(false)),
  [credentials, appId, addLog])

  const refreshExperiments = useCallback(() => {
    if (!appId) return
    setIsLoadingExperiments(true)
    return fetchExperiments()
  }, [appId, fetchExperiments])

  // Reset during render when the app changes, then fetch the new app's tests
  const [loadedAppId, setLoadedAppId] = useState(appId)
  if (loadedAppId !== appId) {
    setLoadedAppId(appId)
    setExperiments([])
    setSelectedExperiment(null)
    setTreatments([])
    setActiveTreatmentId(null)
    setTreatmentLocalizations([])
    setIsLoadingExperiments(Boolean(appId))
  }

  useEffect(() => {
    if (appId) fetchExperiments()
  }, [appId, fetchExperiments])

  const loadTreatmentLocalizations = useCallback(async (treatmentId) => {
    if (!treatmentId) {
      setTreatmentLocalizations([])
      return []
    }
    setIsLoadingLocalizations(true)
    try {
      const locs = await getTreatmentLocalizations(credentials, treatmentId)
      setTreatmentLocalizations(locs)
      return locs
    } catch (error) {
      addLog(`Failed to load treatment locales: ${error.message}`, 'error')
      return []
    } finally {
      setIsLoadingLocalizations(false)
    }
  }, [credentials, addLog])

  const handleSelectTreatment = useCallback(async (treatmentId) => {
    setActiveTreatmentId(treatmentId)
    await loadTreatmentLocalizations(treatmentId)
  }, [loadTreatmentLocalizations])

  const loadExperimentDetail = useCallback(async (experiment, preferredTreatmentId) => {
    setIsLoadingDetail(true)
    try {
      const list = await listTreatments(credentials, experiment.id)
      setTreatments(list)
      const next = list.find(t => t.id === preferredTreatmentId) || list[0] || null
      setActiveTreatmentId(next?.id || null)
      await loadTreatmentLocalizations(next?.id)
    } catch (error) {
      addLog(`Failed to load treatments: ${error.message}`, 'error')
      setTreatments([])
    }
    setIsLoadingDetail(false)
  }, [credentials, addLog, loadTreatmentLocalizations])

  const handleSelectExperiment = useCallback(async (experiment) => {
    if (!experiment || experiment.id === selectedExperimentId) {
      setSelectedExperiment(null)
      setTreatments([])
      setActiveTreatmentId(null)
      setTreatmentLocalizations([])
      return
    }
    setSelectedExperiment(experiment)
    await loadExperimentDetail(experiment)
  }, [selectedExperimentId, loadExperimentDetail])

  // Creates the test plus `treatmentCount` empty treatments (A, B, C)
  const handleCreateExperiment = useCallback(async ({ name, platform, trafficProportion, treatmentCount }) => {
    if (!appId) return false
    setExperimentDialog(d => ({ ...d, isSubmitting: true }))
    try {
      const created = await createExperiment(credentials, appId, { name, platform, trafficProportion })
      for (let i = 0; i < treatmentCount; i++) {
        await createTreatment(credentials, created.id, { name: `Treatment ${TREATMENT_LETTERS[i]}` })
      }
      setExperiments(prev => [created, ...prev])
      addLog(`Created test "${created.name}"`, 'success')
      setExperimentDialog({ open: false, mode: 'create', experiment: null, isSubmitting: false })
      setSelectedExperiment(created)
      await loadExperimentDetail(created)
      return true
    } catch (error) {
      addLog(`Create failed: ${error.message}`, 'error')
      setExperimentDialog(d => ({ ...d, isSubmitting: false }))
      return false
    }
  }, [credentials, appId, addLog, loadExperimentDetail])

  const mergeExperiment = useCallback((id, patch) => {
    setExperiments(prev => prev.map(e => e.id === id ? { ...e, ...patch } : e))
    setSelectedExperiment(prev => prev?.id === id ? { ...prev, ...patch } : prev)
  }, [])

  const handleUpdateExperiment = useCallback(async (experiment, { name, trafficProportion }) => {
    setExperimentDialog(d => ({ ...d, isSubmitting: true }))
    try {
      const updated = await updateExperiment(credentials, experiment.id, { name, trafficProportion })
      mergeExperiment(experiment.id, updated || { name, trafficProportion: Number(trafficProportion) })
      addLog('Test updated', 'success')
      setExperimentDialog({ open: false, mode: 'create', experiment: null, isSubmitting: false })
      return true
    } catch (error) {
      addLog(`Update failed: ${error.message}`, 'error')
      setExperimentDialog(d => ({ ...d, isSubmitting: false }))
      return false
    }
  }, [credentials, addLog, mergeExperiment])

  const handleStartExperiment = useCallback(async (experiment) => {
    setStartConfirm(d => ({ ...d, isStarting: true }))
    try {
      const updated = await updateExperiment(credentials, experiment.id, { started: true })
      mergeExperiment(experiment.id, updated || { startDate: new Date().toISOString() })
      addLog(`"${experiment.name}" started`, 'success')
      setStartConfirm({ open: false, experiment: null, isStarting: false })
      return true
    } catch (error) {
      addLog(`Could not start the test: ${error.message}`, 'error')
      setStartConfirm(d => ({ ...d, isStarting: false }))
      return false
    }
  }, [credentials, addLog, mergeExperiment])

  const handleCreateTreatment = useCallback(async ({ name, appIconName }) => {
    if (!selectedExperiment) return false
    setTreatmentDialog(d => ({ ...d, isSubmitting: true }))
    try {
      const created = await createTreatment(credentials, selectedExperiment.id, { name, appIconName })
      setTreatments(prev => [...prev, created])
      addLog(`Added treatment "${created.name}"`, 'success')
      setTreatmentDialog({ open: false, mode: 'create', treatment: null, isSubmitting: false })
      await handleSelectTreatment(created.id)
      return true
    } catch (error) {
      addLog(`Create failed: ${error.message}`, 'error')
      setTreatmentDialog(d => ({ ...d, isSubmitting: false }))
      return false
    }
  }, [credentials, selectedExperiment, addLog, handleSelectTreatment])

  const handleUpdateTreatment = useCallback(async (treatment, { name, appIconName }) => {
    setTreatmentDialog(d => ({ ...d, isSubmitting: true }))
    try {
      await updateTreatment(credentials, treatment.id, { name, appIconName })
      setTreatments(prev => prev.map(t => t.id === treatment.id ? { ...t, name, appIconName } : t))
      addLog('Treatment updated', 'success')
      setTreatmentDialog({ open: false, mode: 'create', treatment: null, isSubmitting: false })
      return true
    } catch (error) {
      addLog(`Update failed: ${error.message}`, 'error')
      setTreatmentDialog(d => ({ ...d, isSubmitting: false }))
      return false
    }
  }, [credentials, addLog])

  const handleConfirmDelete = useCallback(async () => {
    const { kind, target } = deleteConfirm
    if (!target) return false
    setDeleteConfirm(d => ({ ...d, isDeleting: true }))
    try {
      if (kind === 'experiment') {
        await deleteExperiment(credentials, target.id)
        setExperiments(prev => prev.filter(e => e.id !== target.id))
        if (selectedExperimentId === target.id) {
          setSelectedExperiment(null)
          setTreatments([])
          setActiveTreatmentId(null)
          setTreatmentLocalizations([])
        }
      } else {
        await deleteTreatment(credentials, target.id)
        const remaining = treatments.filter(t => t.id !== target.id)
        setTreatments(remaining)
        if (activeTreatmentId === target.id) await handleSelectTreatment(remaining[0]?.id || null)
      }
      addLog(`Deleted "${target.name}"`, 'success')
      setDeleteConfirm({ open: false, kind: 'experiment', target: null, isDeleting: false })
      return true
    } catch (error) {
      addLog(`Delete failed: ${error.message}`, 'error')
      setDeleteConfirm(d => ({ ...d, isDeleting: false }))
      return false
    }
  }, [credentials, deleteConfirm, selectedExperimentId, treatments, activeTreatmentId, addLog, handleSelectTreatment])

  const handleAddLocale = useCallback(async (locale) => {
    if (!activeTreatmentId) return
    try {
      await createTreatmentLocalization(credentials, activeTreatmentId, locale)
      addLog(`Added ${locale}`, 'success')
      await loadTreatmentLocalizations(activeTreatmentId)
    } catch (error) {
      addLog(`Could not add ${locale}: ${error.message}`, 'error')
    }
  }, [credentials, activeTreatmentId, addLog, loadTreatmentLocalizations])

  const handleDeleteLocalization = useCallback(async (localization) => {
    try {
      await deleteTreatmentLocalization(credentials, localization.id)
      setTreatmentLocalizations(prev => prev.filter(l => l.id !== localization.id))
      addLog(`Removed ${localization.locale}`, 'success')
    } catch (error) {
      addLog(`Delete failed: ${error.message}`, 'error')
    }
  }, [credentials, addLog])

  const ensureLocalization = useCallback(async (locale) => {
    const existing = treatmentLocalizations.find(l => l.locale === locale)
    if (existing) return existing
    if (!ASC_LOCALES.some(l => l.code === locale)) {
      throw new Error(`"${locale}" is not an App Store locale`)
    }
    return createTreatmentLocalization(credentials, activeTreatmentId, locale)
  }, [credentials, treatmentLocalizations, activeTreatmentId])

  const media = useLocalizedMedia({
    credentials,
    library: assetLibrary,
    surfaceType: 'appStoreVersionExperimentTreatmentLocalizations',
    scopeId: activeTreatmentId,
    localizations: treatmentLocalizations,
    ensureLocalization,
    fallbackLocale: defaultLocale,
    log: addLog,
  })

  // Uploads can create treatment locales — refresh the list, then the placements
  const { handleUpload: uploadQueue, loadPlacements } = media
  const handleUploadMedia = useCallback(async () => {
    await uploadQueue()
    const locs = await loadTreatmentLocalizations(activeTreatmentId)
    await loadPlacements(locs)
  }, [uploadQueue, loadTreatmentLocalizations, activeTreatmentId, loadPlacements])

  return {
    // data
    experiments,
    isLoadingExperiments,
    selectedExperiment,
    treatments,
    isLoadingDetail,
    activeTreatment,
    treatmentLocalizations,
    isLoadingLocalizations,
    media: { ...media, handleUpload: handleUploadMedia },

    // actions
    refreshExperiments,
    handleSelectExperiment,
    handleCreateExperiment,
    handleUpdateExperiment,
    handleStartExperiment,
    handleSelectTreatment,
    handleCreateTreatment,
    handleUpdateTreatment,
    handleConfirmDelete,
    handleAddLocale,
    handleDeleteLocalization,

    // dialogs
    experimentDialog,
    setExperimentDialog,
    treatmentDialog,
    setTreatmentDialog,
    deleteConfirm,
    setDeleteConfirm,
    startConfirm,
    setStartConfirm,
  }
}
