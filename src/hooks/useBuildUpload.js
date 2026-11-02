import { useState, useCallback, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { readIpaInfo } from '@/utils/ipaReader'
import {
  listBuildUploads,
  getBuildUpload,
  uploadBuild,
  BUILD_UPLOAD_DONE_STATES,
} from '@/services/appStoreBuildUploadService'

const POLL_INTERVAL_MS = 10000
const MAX_POLLS = 90 // Apple usually finishes processing within 15 minutes

// Drop an .ipa, check it against the selected app, upload it, follow processing.
export default function useBuildUpload({ credentials, selectedApp }) {
  const appId = selectedApp?.id
  const [dropped, setDropped] = useState(null) // { file, info, error }
  const [isReading, setIsReading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(null) // { stage, sent, total }
  const [uploads, setUploads] = useState([])
  const [isLoadingUploads, setIsLoadingUploads] = useState(Boolean(appId))
  const [trackedId, setTrackedId] = useState(null)
  const [loadedAppId, setLoadedAppId] = useState(appId)
  const pollCount = useRef(0)

  // New app: forget the previous drop before its uploads load
  if (appId !== loadedAppId) {
    setLoadedAppId(appId)
    setDropped(null)
    setProgress(null)
    setTrackedId(null)
    setUploads([])
    setIsLoadingUploads(Boolean(appId))
  }

  // Only touches state after the request; the loading flag is set by the caller
  const loadUploads = useCallback(async () => {
    try {
      setUploads(await listBuildUploads(credentials, appId))
    } catch (error) {
      console.log('[BuildUpload] Could not list uploads:', error.message)
    }
    setIsLoadingUploads(false)
  }, [credentials, appId])

  const refreshUploads = useCallback(() => {
    if (!appId) return
    setIsLoadingUploads(true)
    loadUploads()
  }, [appId, loadUploads])

  useEffect(() => {
    if (!appId) return
    let cancelled = false
    listBuildUploads(credentials, appId)
      .then((list) => { if (!cancelled) setUploads(list) })
      .catch((error) => console.log('[BuildUpload] Could not list uploads:', error.message))
      .finally(() => { if (!cancelled) setIsLoadingUploads(false) })
    return () => { cancelled = true }
  }, [appId]) // eslint-disable-line react-hooks/exhaustive-deps

  const handleFile = useCallback(async (file) => {
    if (!file) return
    setIsReading(true)
    setProgress(null)
    try {
      const info = await readIpaInfo(file)
      setDropped({ file, info, error: null })
    } catch (error) {
      setDropped({ file, info: null, error: error.message })
    }
    setIsReading(false)
  }, [])

  const clearDropped = useCallback(() => {
    setDropped(null)
    setProgress(null)
  }, [])

  const bundleMismatch = Boolean(
    dropped?.info?.bundleId && selectedApp?.bundleId && dropped.info.bundleId !== selectedApp.bundleId
  )

  const startUpload = useCallback(async () => {
    if (!dropped?.info || !appId || isUploading) return
    setIsUploading(true)
    try {
      const upload = await uploadBuild(credentials, appId, dropped.file, dropped.info, { onProgress: setProgress })
      setUploads(prev => [upload, ...prev.filter(u => u.id !== upload.id)])
      setTrackedId(upload.id)
      pollCount.current = 0
      toast.success(`Build ${dropped.info.version} (${dropped.info.build}) uploaded`, {
        description: 'Apple is processing it now. It shows in TestFlight once processing ends.',
      })
      setDropped(null)
      setProgress(null)
    } catch (error) {
      toast.error(`Upload failed: ${error.message}`)
      setProgress(null)
    }
    setIsUploading(false)
  }, [credentials, appId, dropped, isUploading])

  // Follow the upload Apple is processing until it completes or fails
  useEffect(() => {
    if (!trackedId) return
    const timer = setInterval(async () => {
      pollCount.current += 1
      try {
        const upload = await getBuildUpload(credentials, trackedId)
        setUploads(prev => prev.map(u => (u.id === upload.id ? upload : u)))
        if (BUILD_UPLOAD_DONE_STATES.includes(upload.state)) {
          setTrackedId(null)
          if (upload.state === 'COMPLETE') toast.success(`Build ${upload.version} (${upload.build}) is ready in TestFlight`)
          else toast.error(`Build ${upload.version} (${upload.build}) failed processing`, { description: upload.errors[0]?.description })
        }
      } catch (error) {
        console.log('[BuildUpload] Poll failed:', error.message)
      }
      if (pollCount.current >= MAX_POLLS) setTrackedId(null)
    }, POLL_INTERVAL_MS)
    return () => clearInterval(timer)
  }, [credentials, trackedId])

  return {
    dropped,
    isReading,
    isUploading,
    progress,
    uploads,
    isLoadingUploads,
    trackedId,
    bundleMismatch,
    handleFile,
    clearDropped,
    startUpload,
    refreshUploads,
  }
}
