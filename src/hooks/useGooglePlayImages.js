import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import {
  listImages,
  uploadImage,
  deleteImage,
  deleteAllImages,
  GP_IMAGE_TYPES,
} from '@/services/googlePlayService'
import { readGooglePlayMediaDrop, inspectImageFile } from '@/utils/googlePlayMediaDrop'

const LIST_CONCURRENCY = 6

async function mapWithConcurrency(items, limit, fn) {
  const results = new Array(items.length)
  let next = 0
  const worker = async () => {
    while (next < items.length) {
      const i = next++
      results[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

// Listing images of an edit session, per locale and image type, plus the folder import.
//
// - Images of the selected type load by themselves for every listing as soon as the edit
//   session and its listings are there (and again for locales that appear later).
// - A dropped folder (one subfolder per locale) is validated against the Play Console rules
//   into `plan`, then `handleImport` sends it through the edit session.
export default function useGooglePlayImages({ credentials, packageName, editId, listings, log }) {
  const languages = useMemo(() => listings.map(l => l.language), [listings])
  const languagesKey = languages.join('|')
  const scope = editId && packageName ? `${packageName}|${editId}` : null

  const [imageType, setImageType] = useState('phoneScreenshots')
  // { [imageType]: { [locale]: image[] } } — a locale key means "loaded"
  const [imagesByType, setImagesByType] = useState({})
  const [loadingCount, setLoadingCount] = useState(0)
  const [expandedLocales, setExpandedLocales] = useState([])
  const [busyLocale, setBusyLocale] = useState(null)

  const [replaceExisting, setReplaceExisting] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [isReadingDrop, setIsReadingDrop] = useState(false)
  const [queue, setQueue] = useState([])
  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, currentFile: '' })

  // A different app or edit session starts from scratch
  const [loadedScope, setLoadedScope] = useState(scope)
  if (loadedScope !== scope) {
    setLoadedScope(scope)
    setImagesByType({})
    setExpandedLocales([])
    setQueue([])
  }

  const scopeRef = useRef(scope)
  const inFlight = useRef(new Set())
  useEffect(() => {
    scopeRef.current = scope
    inFlight.current = new Set()
  }, [scope])

  const fetchLocale = useCallback(async (locale, type) => {
    try {
      return await listImages(credentials, packageName, editId, locale, type)
    } catch (error) {
      log(`${locale}: ${error.message}`, 'error')
      return []
    }
  }, [credentials, packageName, editId, log])

  // Load one image type for the given locales and merge it into the cache
  const loadType = useCallback(async (type, locales) => {
    if (!scope || locales.length === 0) return
    const requestScope = scope
    const keys = locales.map(locale => `${type}|${locale}`)
    const fresh = locales.filter((_, i) => !inFlight.current.has(keys[i]))
    if (fresh.length === 0) return
    fresh.forEach(locale => inFlight.current.add(`${type}|${locale}`))
    setLoadingCount(c => c + 1)
    const results = await mapWithConcurrency(fresh, LIST_CONCURRENCY, async (locale) => [locale, await fetchLocale(locale, type)])
    fresh.forEach(locale => inFlight.current.delete(`${type}|${locale}`))
    setLoadingCount(c => c - 1)
    if (scopeRef.current !== requestScope) return
    setImagesByType(prev => ({ ...prev, [type]: { ...prev[type], ...Object.fromEntries(results) } }))
  }, [scope, fetchLocale])

  // Auto-load: whatever listing has no entry yet for the selected type
  useEffect(() => {
    const loaded = imagesByType[imageType] || {}
    const missing = languagesKey ? languagesKey.split('|').filter(locale => !(locale in loaded)) : []
    if (missing.length > 0) loadType(imageType, missing)
  }, [scope, languagesKey, imageType, imagesByType, loadType])

  const refresh = useCallback(async () => {
    setImagesByType(prev => ({ ...prev, [imageType]: undefined }))
  }, [imageType])

  const reloadLocale = useCallback(async (locale, type = imageType) => {
    const images = await fetchLocale(locale, type)
    setImagesByType(prev => ({ ...prev, [type]: { ...prev[type], [locale]: images } }))
    return images
  }, [fetchLocale, imageType])

  const typeImages = imagesByType[imageType] || {}
  const isLoading = loadingCount > 0
  const hasLoaded = languages.length > 0 && languages.every(locale => locale in typeImages)
  const getImages = (locale) => typeImages[locale] || []

  const toggleLocale = (locale) => {
    setExpandedLocales(prev => prev.includes(locale) ? prev.filter(l => l !== locale) : [...prev, locale])
  }

  const max = GP_IMAGE_TYPES[imageType]?.max ?? 8

  // ── Single-locale actions ────────────────────────────────────────────────

  const removeImage = async (locale, image) => {
    setBusyLocale(locale)
    try {
      await deleteImage(credentials, packageName, editId, locale, imageType, image.id)
      setImagesByType(prev => ({
        ...prev,
        [imageType]: { ...prev[imageType], [locale]: (prev[imageType]?.[locale] || []).filter(i => i.id !== image.id) },
      }))
    } catch (error) {
      log(`Delete failed: ${error.message}`, 'error')
    }
    setBusyLocale(null)
  }

  const removeAllImages = async (locale) => {
    if (!confirm(`Delete all ${GP_IMAGE_TYPES[imageType]?.name} for ${locale}?`)) return
    setBusyLocale(locale)
    try {
      await deleteAllImages(credentials, packageName, editId, locale, imageType)
      setImagesByType(prev => ({ ...prev, [imageType]: { ...prev[imageType], [locale]: [] } }))
      log(`Deleted all ${imageType} for ${locale}`, 'success')
    } catch (error) {
      log(`Delete all failed: ${error.message}`, 'error')
    }
    setBusyLocale(null)
  }

  // Files picked for one locale: validated like a dropped folder, appended to the slot
  const addFiles = async (locale, fileList) => {
    const files = [...fileList].sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
    if (files.length === 0) return
    setBusyLocale(locale)
    try {
      const existing = getImages(locale).length
      let uploaded = 0
      for (const file of files) {
        if (existing + uploaded >= max) {
          log(`${locale}: ${GP_IMAGE_TYPES[imageType].name} is full (max ${max}) — ${file.name} skipped`, 'error')
          continue
        }
        const info = await inspectImageFile(file, { imageType })
        if (info.error) {
          log(`${locale}/${file.name}: ${info.error}`, 'error')
          continue
        }
        try {
          await uploadImage(credentials, packageName, editId, locale, imageType, file, info.mimeType)
          uploaded++
        } catch (error) {
          log(`${locale}/${file.name}: ${error.message}`, 'error')
        }
      }
      if (uploaded > 0) log(`Uploaded ${uploaded} image(s) to ${locale}/${imageType}`, 'success')
      await reloadLocale(locale)
    } catch (error) {
      log(`Upload failed: ${error.message}`, 'error')
    }
    setBusyLocale(null)
  }

  // ── Folder import ────────────────────────────────────────────────────────

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    setIsReadingDrop(true)
    try {
      const fallbackLocale = languages.includes('en-US') ? 'en-US' : languages[0] || 'en-US'
      const dropped = await readGooglePlayMediaDrop(e.dataTransfer, { fallbackLocale, defaultType: imageType })
      if (dropped.length > 0) setQueue(dropped)
      else log('No images found in the dropped items', 'error')
    } catch (error) {
      log(`Could not read the dropped folder: ${error.message}`, 'error')
    }
    setIsReadingDrop(false)
  }

  const removeFromQueue = (key) => setQueue(prev => prev.filter(q => q.key !== key))
  const clearQueue = () => setQueue([])

  // What the import will do, per locale and image type, given the rules and what's already there
  const plan = useMemo(() => queue.map((group) => {
    const listed = Boolean(group.locale) && languages.includes(group.locale)
    const byType = new Map()
    for (const image of group.images) {
      if (!byType.has(image.imageType)) byType.set(image.imageType, [])
      byType.get(image.imageType).push(image)
    }
    // Once a folder has been sent, show what went up rather than re-planning against the new state
    const finished = group.status === 'done' || group.status === 'error'
    const types = [...byType.entries()].map(([type, images]) => {
      const info = GP_IMAGE_TYPES[type]
      const valid = images.filter(i => !i.error)
      const existingImages = imagesByType[type]?.[group.locale]
      const existing = replaceExisting ? 0 : existingImages?.length ?? 0
      const room = Math.max(info.max - existing, 0)
      return {
        imageType: type,
        info,
        images,
        invalid: images.filter(i => i.error),
        toUpload: finished ? [] : valid.slice(0, room),
        overflow: finished ? 0 : Math.max(valid.length - room, 0),
        belowPublishMinimum: valid.length > 0 && valid.length < info.minToPublish,
      }
    })
    const uploadCount = finished
      ? group.uploaded || 0
      : listed ? types.reduce((sum, t) => sum + t.toUpload.length, 0) : 0
    return { ...group, listed, types, uploadCount }
  }), [queue, languages, imagesByType, replaceExisting])

  const handleImport = async () => {
    if (!scope) return
    const jobs = plan.filter(g => g.uploadCount > 0 && g.status !== 'done' && g.status !== 'error')
    if (jobs.length === 0) return
    setIsImporting(true)
    const total = jobs.reduce((sum, g) => sum + g.uploadCount, 0)
    let processed = 0
    let uploaded = 0
    const setStatus = (key, status, groupUploaded) =>
      setQueue(prev => prev.map(q => q.key === key ? { ...q, status, uploaded: groupUploaded ?? q.uploaded } : q))

    for (const group of jobs) {
      setStatus(group.key, 'uploading')
      let failed = 0
      let groupUploaded = 0
      const touched = []
      try {
        for (const { imageType: type, info, toUpload } of group.types) {
          if (toUpload.length === 0) continue
          touched.push(type)
          let files = toUpload
          if (replaceExisting) {
            await deleteAllImages(credentials, packageName, editId, group.locale, type)
          } else {
            // Append mode: the real count comes from Google Play, not the cache
            const existing = (await listImages(credentials, packageName, editId, group.locale, type)).length
            const room = Math.max(info.max - existing, 0)
            if (room < files.length) {
              log(`${group.locale}: only ${room} more ${info.short} image(s) fit (max ${info.max})`, 'error')
              failed += files.length - room
              files = files.slice(0, room)
            }
          }
          for (const image of files) {
            setProgress({ current: ++processed, total, currentFile: `${group.locale}/${image.name}` })
            try {
              await uploadImage(credentials, packageName, editId, group.locale, type, image.file, image.mimeType)
              uploaded++
              groupUploaded++
            } catch (error) {
              log(`${group.locale}/${image.name}: ${error.message}`, 'error')
              failed++
            }
          }
        }
        setStatus(group.key, failed > 0 ? 'error' : 'done', groupUploaded)
      } catch (error) {
        log(`${group.locale}: ${error.message}`, 'error')
        setStatus(group.key, 'error', groupUploaded)
      }
      for (const type of touched) await reloadLocale(group.locale, type)
    }

    setIsImporting(false)
    setProgress({ current: 0, total: 0, currentFile: '' })
    log(`Uploaded ${uploaded}/${total} image(s) — commit the edit to publish them`, uploaded === total ? 'success' : 'error')
    return uploaded
  }

  return {
    imageType,
    setImageType,
    max,
    languages,
    isLoading,
    hasLoaded,
    getImages,
    refresh,
    expandedLocales,
    toggleLocale,
    busyLocale,
    removeImage,
    removeAllImages,
    addFiles,

    replaceExisting,
    setReplaceExisting,
    isDragging,
    setIsDragging,
    isReadingDrop,
    queue,
    plan,
    isImporting,
    progress,
    handleDrop,
    removeFromQueue,
    clearQueue,
    handleImport,
  }
}
