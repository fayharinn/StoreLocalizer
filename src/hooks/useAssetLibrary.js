import { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import {
  getAssetLibrary,
  getAssetLibraryRefData,
  listLibraryAssets,
  getLibraryAsset,
  uploadLibraryAsset,
  updateLibraryAsset,
  deleteLibraryAsset,
  isAssetProcessing,
} from '@/services/appAssetLibraryService'

const POLL_INTERVAL_MS = 5000
const MAX_POLLS = 36 // ~3 min of processing updates after an upload

// One per app: the App Asset Library plus the specification catalog.
// Shared by the library card and every media panel (version, CPP, PPO, events).
export default function useAssetLibrary({ credentials, selectedApp }) {
  const appId = selectedApp?.id
  const [libraryId, setLibraryId] = useState(null)
  const [refData, setRefData] = useState(null)
  const [assets, setAssets] = useState([])
  const [isLoading, setIsLoading] = useState(Boolean(appId))
  const [error, setError] = useState(null)

  const [uploadQueue, setUploadQueue] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [assetDialog, setAssetDialog] = useState({ open: false, asset: null, isSaving: false })
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, asset: null, isDeleting: false })

  const pollCount = useRef(0)

  const addLog = useCallback((message, type = 'info') => {
    if (type === 'error') toast.error(message)
    else if (type === 'success') toast.success(message)
    console.log(`[AssetLibrary][${type}] ${message}`)
  }, [])

  // Only touches state after the requests — callers flag the loading state
  const fetchLibrary = useCallback(() =>
    Promise.all([getAssetLibrary(credentials, appId), getAssetLibraryRefData(credentials)])
      .then(([library, catalog]) => {
        setLibraryId(library.id)
        setRefData(catalog)
        return listLibraryAssets(credentials, library.id)
      })
      .then(setAssets)
      .catch(err => {
        setError(err.message)
        addLog(`Asset Library unavailable: ${err.message}`, 'error')
      })
      .finally(() => setIsLoading(false)),
  [credentials, appId, addLog])

  const refresh = useCallback(() => {
    if (!appId) return
    setIsLoading(true)
    setError(null)
    return fetchLibrary()
  }, [appId, fetchLibrary])

  // Reset during render when the app changes, then fetch the new app's library
  const [loadedAppId, setLoadedAppId] = useState(appId)
  if (loadedAppId !== appId) {
    setLoadedAppId(appId)
    setLibraryId(null)
    setAssets([])
    setUploadQueue([])
    setError(null)
    setIsLoading(Boolean(appId))
  }

  useEffect(() => {
    if (appId) fetchLibrary()
  }, [appId, fetchLibrary])

  const mergeAsset = useCallback((asset) => {
    setAssets(prev => prev.some(a => a.id === asset.id)
      ? prev.map(a => a.id === asset.id ? { ...a, ...asset } : a)
      : [asset, ...prev])
  }, [])

  // Processing is asynchronous on Apple's side — re-read assets until they settle
  const hasProcessing = assets.some(isAssetProcessing)
  useEffect(() => {
    if (!hasProcessing) {
      pollCount.current = 0
      return
    }
    if (pollCount.current >= MAX_POLLS) return
    const timer = setTimeout(async () => {
      pollCount.current++
      const pending = assets.filter(isAssetProcessing)
      const updated = await Promise.allSettled(pending.map(a => getLibraryAsset(credentials, a)))
      updated.forEach(r => r.status === 'fulfilled' && mergeAsset(r.value))
    }, POLL_INTERVAL_MS)
    return () => clearTimeout(timer)
  }, [hasProcessing, assets, credentials, mergeAsset])

  // Single upload used by placement panels; the asset joins the library list
  const uploadAsset = useCallback(async (file, { category, referenceName } = {}) => {
    if (!libraryId) throw new Error('Asset Library not loaded')
    const asset = await uploadLibraryAsset(credentials, libraryId, file, { category, referenceName })
    pollCount.current = 0
    mergeAsset(asset)
    return asset
  }, [credentials, libraryId, mergeAsset])

  const queueFiles = useCallback((files) => {
    const media = files.filter(f => f.type.startsWith('image/') || f.type.startsWith('video/'))
    if (media.length === 0) {
      addLog('Drop images (PNG/JPEG) or videos (MP4/MOV)', 'error')
      return
    }
    setUploadQueue(prev => [...prev, ...media.map(file => ({ file, status: 'pending', progress: 0 }))])
  }, [addLog])

  const removeFromQueue = useCallback((index) => {
    setUploadQueue(prev => prev.filter((_, i) => i !== index))
  }, [])

  const clearQueue = useCallback(() => setUploadQueue([]), [])

  const uploadQueued = useCallback(async (category) => {
    if (!libraryId || uploadQueue.length === 0) return
    setIsUploading(true)
    let uploaded = 0
    const pending = uploadQueue.filter(q => q.status !== 'done')
    const setItem = (file, patch) =>
      setUploadQueue(prev => prev.map(q => q.file === file ? { ...q, ...patch } : q))

    for (const { file } of pending) {
      setItem(file, { status: 'uploading', progress: 0 })
      try {
        const asset = await uploadLibraryAsset(credentials, libraryId, file, {
          category,
          onProgress: ({ done, total }) => setItem(file, { progress: done / total }),
        })
        mergeAsset(asset)
        setItem(file, { status: 'done', progress: 1 })
        uploaded++
      } catch (err) {
        setItem(file, { status: 'error', error: err.message })
        addLog(`${file.name}: ${err.message}`, 'error')
      }
    }

    pollCount.current = 0
    setIsUploading(false)
    addLog(`Uploaded ${uploaded}/${pending.length} asset(s) — Apple is processing them`, uploaded === pending.length ? 'success' : 'error')
  }, [credentials, libraryId, uploadQueue, mergeAsset, addLog])

  const handleSaveAsset = useCallback(async (asset, attributes) => {
    setAssetDialog(d => ({ ...d, isSaving: true }))
    try {
      const updated = await updateLibraryAsset(credentials, asset, attributes)
      mergeAsset(updated)
      if (attributes.previewFrameTimeCode) pollCount.current = 0
      addLog('Asset updated', 'success')
      setAssetDialog({ open: false, asset: null, isSaving: false })
      return true
    } catch (err) {
      addLog(`Update failed: ${err.message}`, 'error')
      setAssetDialog(d => ({ ...d, isSaving: false }))
      return false
    }
  }, [credentials, mergeAsset, addLog])

  // Only approved assets can be archived (409 otherwise)
  const handleArchiveAsset = useCallback(async (asset) => {
    try {
      mergeAsset(await updateLibraryAsset(credentials, asset, { archived: true }))
      addLog(`Archived "${asset.referenceName || asset.fileName}"`, 'success')
    } catch (err) {
      addLog(`Archive failed: ${err.message}`, 'error')
    }
  }, [credentials, mergeAsset, addLog])

  const handleDeleteAsset = useCallback(async (asset) => {
    setDeleteConfirm(d => ({ ...d, isDeleting: true }))
    try {
      await deleteLibraryAsset(credentials, asset)
      setAssets(prev => prev.filter(a => a.id !== asset.id))
      addLog(`Deleted "${asset.referenceName || asset.fileName}"`, 'success')
      setDeleteConfirm({ open: false, asset: null, isDeleting: false })
      return true
    } catch (err) {
      addLog(`Delete failed: ${err.message}`, 'error')
      setDeleteConfirm(d => ({ ...d, isDeleting: false }))
      return false
    }
  }, [credentials, addLog])

  return {
    libraryId,
    refData,
    assets,
    isLoading,
    error,
    isReady: Boolean(libraryId && refData),
    hasProcessing,

    refresh,
    uploadAsset,
    mergeAsset,

    uploadQueue,
    isUploading,
    queueFiles,
    removeFromQueue,
    clearQueue,
    uploadQueued,

    assetDialog,
    setAssetDialog,
    handleSaveAsset,
    handleArchiveAsset,
    deleteConfirm,
    setDeleteConfirm,
    handleDeleteAsset,
  }
}
