import { useState, useMemo } from 'react'
import {
  MEDIA_SURFACES,
  listPlacements,
  createPlacement,
  deletePlacement,
  orderPlacements,
  getFeaturePlacementTypes,
  getPlacementGroups,
  getAcceptedCategories,
  specsAcceptDimensions,
  formatSpecDimensions,
  readMediaDimensions,
} from '@/services/appAssetLibraryService'
import { readLocalizedMediaDrop, isImageFile, isVideoFile } from '@/utils/mediaDrop'

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

// Asset Library placements for one set of localizations — an App Store version,
// a Custom Product Page version, a PPO treatment or an In-App Event.
//
// - `surfaceType` is the localization resource type (see MEDIA_SURFACES).
// - `scopeId` identifies the owner; changing it resets the loaded placements.
// - `ensureLocalization(locale)` returns the localization for a locale (creating
//   it when the surface allows), so dropping a folder with new locales just works.
// - `selectGroups(groups)` optionally narrows the ref-data placement groups
//   (e.g. selectScreenshotTargetGroups); pass a stable function.
export default function useLocalizedMedia({
  credentials,
  library,
  surfaceType,
  scopeId,
  localizations,
  ensureLocalization,
  fallbackLocale,
  log,
  selectGroups,
}) {
  const { feature, orderable } = MEDIA_SURFACES[surfaceType]
  const { refData } = library

  const placementTypes = useMemo(() => getFeaturePlacementTypes(refData, feature), [refData, feature])
  const [placementType, setPlacementType] = useState('APP_SCREENSHOT')
  const effectiveType = placementTypes.includes(placementType) ? placementType : placementTypes[0] || null

  const groups = useMemo(() => {
    const all = effectiveType ? getPlacementGroups(refData, feature, effectiveType) : []
    return selectGroups ? selectGroups(all) : all
  }, [refData, feature, effectiveType, selectGroups])
  const [placementGroup, setPlacementGroup] = useState(null)
  // Default to the first iPhone group — the one every product page needs
  const effectiveGroup = groups.some(g => g.groupId === placementGroup)
    ? placementGroup
    : (groups.find(g => g.platform === 'IPHONE_APP_STORE') || groups[0])?.groupId || null
  const groupInfo = groups.find(g => g.groupId === effectiveGroup) || null
  const maxCount = groupInfo?.maxCount ?? null
  const groupSpecs = groupInfo?.specs

  const [placementsByLocalization, setPlacementsByLocalization] = useState({})
  const [isLoading, setIsLoading] = useState(false)
  const [hasLoaded, setHasLoaded] = useState(false)
  const [expandedLocales, setExpandedLocales] = useState([])

  const [replaceExisting, setReplaceExisting] = useState(true)
  const [isDragging, setIsDragging] = useState(false)
  const [queue, setQueue] = useState([])
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0, currentFile: '' })
  const [busyLocalizationId, setBusyLocalizationId] = useState(null)

  // A different owner (version, page, treatment, event) starts from scratch
  const [loadedScopeId, setLoadedScopeId] = useState(scopeId)
  if (loadedScopeId !== scopeId) {
    setLoadedScopeId(scopeId)
    setPlacementsByLocalization({})
    setHasLoaded(false)
    setExpandedLocales([])
    setQueue([])
  }

  // Which media the selected group accepts — previews are videos, screenshots
  // images, creative assets may be either
  const acceptsImages = !groupSpecs?.length || groupSpecs.some(s => !s.frameRates)
  const acceptsVideos = Boolean(groupSpecs?.some(s => s.frameRates))
  const acceptFile = (file) => (acceptsImages && isImageFile(file)) || (acceptsVideos && isVideoFile(file))

  const loadPlacements = async (locs = localizations) => {
    if (!locs?.length) {
      setPlacementsByLocalization({})
      setHasLoaded(true)
      return
    }
    setIsLoading(true)
    const results = await mapWithConcurrency(locs, LIST_CONCURRENCY, async (loc) => {
      try {
        return [loc.id, await listPlacements(credentials, surfaceType, loc.id)]
      } catch (error) {
        log(`${loc.locale}: ${error.message}`, 'error')
        return [loc.id, []]
      }
    })
    setPlacementsByLocalization(Object.fromEntries(results))
    setHasLoaded(true)
    setIsLoading(false)
  }

  const reloadLocalization = async (localizationId) => {
    const placements = await listPlacements(credentials, surfaceType, localizationId)
    setPlacementsByLocalization(prev => ({ ...prev, [localizationId]: placements }))
    return placements
  }

  // Placements of the selected type + group on a localization, in display order
  const getSlotPlacements = (localizationId) =>
    (placementsByLocalization[localizationId] || [])
      .filter(p => p.placementType === effectiveType && p.placementGroup === effectiveGroup)

  const countByLocalization = (localizationId) => {
    const all = placementsByLocalization[localizationId] || []
    return { slot: getSlotPlacements(localizationId).length, total: all.length }
  }

  const toggleLocale = (locale) => {
    setExpandedLocales(prev => prev.includes(locale) ? prev.filter(l => l !== locale) : [...prev, locale])
  }

  const applyOrder = async (localizationId, placementIds) => {
    if (!orderable || placementIds.length < 2) return
    await orderPlacements(credentials, { surfaceType, localizationId, placementGroup: effectiveGroup, placementIds })
  }

  // Place assets that are already in the library, appended to the slot
  const placeAssets = async (localization, assets) => {
    if (!effectiveType || !effectiveGroup) return
    setBusyLocalizationId(localization.id)
    try {
      const existing = await reloadLocalization(localization.id)
      const kept = existing.filter(p => p.placementType === effectiveType && p.placementGroup === effectiveGroup)
      const room = maxCount != null ? maxCount - kept.length : assets.length
      if (room < assets.length) log(`Only ${Math.max(room, 0)} more allowed in this slot — extra assets skipped`, 'error')
      const created = []
      for (const asset of assets.slice(0, Math.max(room, 0))) {
        created.push(await createPlacement(credentials, {
          surfaceType, localizationId: localization.id, placementType: effectiveType, placementGroup: effectiveGroup, asset,
        }))
      }
      await applyOrder(localization.id, [...kept, ...created].map(p => p.id))
      await reloadLocalization(localization.id)
      if (created.length) log(`Placed ${created.length} asset(s) on ${localization.locale}`, 'success')
    } catch (error) {
      log(`${localization.locale}: ${error.message}`, 'error')
    }
    setBusyLocalizationId(null)
  }

  const removePlacement = async (localization, placement) => {
    setBusyLocalizationId(localization.id)
    try {
      await deletePlacement(credentials, placement.id)
      setPlacementsByLocalization(prev => ({
        ...prev,
        [localization.id]: (prev[localization.id] || []).filter(p => p.id !== placement.id),
      }))
    } catch (error) {
      log(`Remove failed: ${error.message}`, 'error')
    }
    setBusyLocalizationId(null)
  }

  const movePlacement = async (localization, placement, direction) => {
    const slot = getSlotPlacements(localization.id)
    const from = slot.findIndex(p => p.id === placement.id)
    const to = from + direction
    if (from < 0 || to < 0 || to >= slot.length) return
    const reordered = [...slot]
    reordered.splice(to, 0, reordered.splice(from, 1)[0])
    setBusyLocalizationId(localization.id)
    try {
      await applyOrder(localization.id, reordered.map(p => p.id))
      setPlacementsByLocalization(prev => {
        const others = (prev[localization.id] || []).filter(p => !reordered.some(r => r.id === p.id))
        return { ...prev, [localization.id]: [...others, ...reordered] }
      })
    } catch (error) {
      log(`Reorder failed: ${error.message}`, 'error')
    }
    setBusyLocalizationId(null)
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const dropped = await readLocalizedMediaDrop(e.dataTransfer, fallbackLocale || 'en-US', acceptFile)
    if (dropped.length > 0) {
      setQueue(dropped)
    } else {
      log(`No ${acceptsVideos && !acceptsImages ? 'videos' : 'images'} found in the dropped items`, 'error')
    }
  }

  const removeFromQueue = (locale) => {
    setQueue(prev => prev.filter(q => q.locale !== locale))
  }

  const clearQueue = () => setQueue([])

  // Upload each locale folder into the library, then place it in the selected slot
  const handleUpload = async () => {
    if (queue.length === 0 || !effectiveType || !effectiveGroup) return
    setIsUploading(true)
    const category = getAcceptedCategories(refData, effectiveType)[0] || 'APP_SCREENSHOTS_AND_PREVIEWS'
    const specs = groupSpecs || []
    const totalFiles = queue.reduce((sum, q) => sum + q.files.length, 0)
    let processed = 0
    let placed = 0
    const setStatus = (locale, status) =>
      setQueue(prev => prev.map(q => q.locale === locale ? { ...q, status } : q))

    for (const { locale, files, status } of queue) {
      if (status === 'done') continue
      setStatus(locale, 'uploading')
      let failed = 0
      try {
        const localization = await ensureLocalization(locale)
        const existing = await listPlacements(credentials, surfaceType, localization.id)
        let kept = existing.filter(p => p.placementType === effectiveType && p.placementGroup === effectiveGroup)
        if (replaceExisting && kept.length > 0) {
          for (const p of kept) await deletePlacement(credentials, p.id)
          kept = []
        }

        const room = maxCount != null ? maxCount - kept.length : files.length
        if (room < files.length) {
          log(`${locale}: only ${Math.max(room, 0)} of ${files.length} file(s) fit (max ${maxCount})`, 'error')
          failed += files.length - Math.max(room, 0)
        }

        const created = []
        for (const file of files.slice(0, Math.max(room, 0))) {
          setProgress({ current: ++processed, total: totalFiles, currentFile: `${locale}/${file.name}` })
          if (specs.length > 0) {
            const dims = await readMediaDimensions(file).catch(() => null)
            if (dims && !specsAcceptDimensions(specs, dims.width, dims.height)) {
              log(`${locale}/${file.name} is ${dims.width}×${dims.height} — expected ${specs.map(formatSpecDimensions).join(' or ')}`, 'error')
              failed++
              continue
            }
          }
          try {
            const asset = await library.uploadAsset(file, { category, referenceName: `${locale} · ${file.name}` })
            created.push(await createPlacement(credentials, {
              surfaceType, localizationId: localization.id, placementType: effectiveType, placementGroup: effectiveGroup, asset,
            }))
            placed++
          } catch (error) {
            log(`${locale}/${file.name}: ${error.message}`, 'error')
            failed++
          }
        }

        await applyOrder(localization.id, [...kept, ...created].map(p => p.id))
        setStatus(locale, failed > 0 ? 'error' : 'done')
      } catch (error) {
        log(`${locale}: ${error.message}`, 'error')
        setStatus(locale, 'error')
      }
    }

    setIsUploading(false)
    setProgress({ current: 0, total: 0, currentFile: '' })
    log(`Placed ${placed}/${totalFiles} file(s)`, placed === totalFiles ? 'success' : 'error')
    return placed
  }

  return {
    surfaceType,
    feature,
    orderable,
    placementTypes,
    placementType: effectiveType,
    setPlacementType,
    groups,
    placementGroup: effectiveGroup,
    setPlacementGroup,
    groupInfo,
    acceptsImages,
    acceptsVideos,

    placementsByLocalization,
    isLoading,
    hasLoaded,
    expandedLocales,
    busyLocalizationId,
    loadPlacements,
    getSlotPlacements,
    countByLocalization,
    toggleLocale,
    placeAssets,
    removePlacement,
    movePlacement,

    replaceExisting,
    setReplaceExisting,
    isDragging,
    setIsDragging,
    queue,
    isUploading,
    progress,
    handleDrop,
    removeFromQueue,
    clearQueue,
    handleUpload,
  }
}
