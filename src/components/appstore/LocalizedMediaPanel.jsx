import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertCircle, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, FolderOpen, Library,
  Loader2, RefreshCw, Upload, X, Images,
} from 'lucide-react'
import { ASC_LOCALES } from '@/services/appStoreConnectService'
import {
  PLACEMENT_TYPE_LABELS,
  PLACEMENT_STATE_LABELS,
  CREATIVE_PLACEMENT_TYPES,
  getAcceptedCategories,
  formatGroupName,
  formatSpecDimensions,
  isAssetProcessing,
} from '@/services/appAssetLibraryService'
import { formatFileSize } from '@/utils/mediaDrop'
import MediaThumb from './MediaThumb'
import LibraryPickerDialog from './LibraryPickerDialog'

const UNPLACEABLE_STATES = ['AWAITING_UPLOAD', 'FAILED', 'REJECTED', 'ARCHIVED']

function localeInfo(code) {
  return ASC_LOCALES.find(l => l.code === code)
}

// Asset Library placements of one surface (version, CPP, PPO treatment or event),
// per locale, for one placement type + device group at a time.
export default function LocalizedMediaPanel({
  media,
  library,
  localizations,
  readOnly = false,
  readOnlyReason,
  onPreview,
  dropHint = 'Folder with one subfolder per locale: /en-US/*.png, /fr-FR/*.png…',
}) {
  const [picker, setPicker] = useState(null) // { localization }
  const [isPlacing, setIsPlacing] = useState(false)

  const {
    placementTypes, placementType, setPlacementType, groups, placementGroup, setPlacementGroup, groupInfo,
    acceptsImages, acceptsVideos, orderable, isLoading, hasLoaded, expandedLocales, busyLocalizationId,
    loadPlacements, getSlotPlacements, countByLocalization, toggleLocale, placeAssets, removePlacement, movePlacement,
    replaceExisting, setReplaceExisting, isDragging, setIsDragging, queue, isUploading, progress,
    handleDrop, removeFromQueue, clearQueue, handleUpload,
  } = media

  const slotLabel = `${PLACEMENT_TYPE_LABELS[placementType] || placementType} · ${formatGroupName(placementGroup)}`
  const sizes = [...new Set((groupInfo?.specs || []).map(formatSpecDimensions).filter(Boolean))]

  // Library assets that can go in the current slot
  const compatibleAssets = useMemo(() => {
    const categories = getAcceptedCategories(library.refData, placementType)
    const specIds = new Set((groupInfo?.specs || []).map(s => s.specId))
    return library.assets.filter(a =>
      !UNPLACEABLE_STATES.includes(a.state) &&
      (categories.length === 0 || categories.includes(a.category)) &&
      (a.mediaType === 'VIDEO' ? acceptsVideos : acceptsImages) &&
      // Processing assets have no specId yet — let them through, Apple validates on placement
      (!a.specId || specIds.size === 0 || specIds.has(a.specId))
    )
  }, [library.assets, library.refData, placementType, groupInfo, acceptsImages, acceptsVideos])

  if (library.error) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <div className="flex-1">
          <p className="font-medium">Asset Library unavailable</p>
          <p className="text-xs text-muted-foreground">{library.error}</p>
        </div>
        <Button size="sm" variant="outline" onClick={library.refresh}>Retry</Button>
      </div>
    )
  }

  if (!library.isReady) {
    return (
      <div className="flex items-center justify-center py-6 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading Asset Library…
      </div>
    )
  }

  if (placementTypes.length === 0) {
    return <p className="text-sm italic text-muted-foreground">Apple doesn't offer media placements for this surface on your account yet.</p>
  }

  const pickerLocalization = picker?.localization
  const pickerRoom = pickerLocalization && groupInfo?.maxCount != null
    ? Math.max(0, groupInfo.maxCount - getSlotPlacements(pickerLocalization.id).length)
    : null

  return (
    <div className="space-y-4">
      {/* Slot selector */}
      <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr_auto] sm:items-end">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Placement</Label>
          <Select value={placementType || ''} onValueChange={setPlacementType}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              {placementTypes.map(type => (
                <SelectItem key={type} value={type}>
                  {PLACEMENT_TYPE_LABELS[type] || type}
                  {CREATIVE_PLACEMENT_TYPES.includes(type) ? '  ✦ iOS 27' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Device group</Label>
          <Select value={placementGroup || ''} onValueChange={setPlacementGroup}>
            <SelectTrigger className="h-9"><SelectValue placeholder="No device group" /></SelectTrigger>
            <SelectContent>
              {groups.map(g => {
                const dims = [...new Set(g.specs.map(formatSpecDimensions).filter(Boolean))]
                return (
                  <SelectItem key={g.groupId} value={g.groupId}>
                    {formatGroupName(g.groupId)}
                    {dims.length > 0 && <span className="text-muted-foreground"> — {dims.slice(0, 2).join(', ')}{dims.length > 2 ? '…' : ''}</span>}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant={hasLoaded ? 'outline' : 'default'}
          size="sm"
          className="h-9"
          onClick={() => loadPlacements()}
          disabled={isLoading || localizations.length === 0}
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : hasLoaded ? <RefreshCw className="mr-2 h-4 w-4" /> : <Images className="mr-2 h-4 w-4" />}
          {hasLoaded ? 'Refresh' : 'Load media'}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        {sizes.length > 0 ? `Accepted sizes: ${sizes.join(', ')}` : 'Sizes are validated by Apple after upload'}
        {groupInfo?.maxCount != null && ` · max ${groupInfo.maxCount} per locale`}
        {acceptsVideos && !acceptsImages ? ' · video' : acceptsVideos ? ' · image or video' : ' · image'}
        {CREATIVE_PLACEMENT_TYPES.includes(placementType) && ' · shown on iOS 27 / iPadOS 27 and later'}
      </p>

      {readOnly && (
        <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/40 p-3 text-xs text-muted-foreground">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {readOnlyReason || 'This surface can no longer be edited.'}
        </div>
      )}

      {/* Per-locale placements */}
      {localizations.length === 0 ? (
        <p className="text-sm italic text-muted-foreground">No locales yet.</p>
      ) : hasLoaded && (
        <div className="space-y-2">
          {localizations.map(loc => {
            const info = localeInfo(loc.locale)
            const slot = getSlotPlacements(loc.id)
            const counts = countByLocalization(loc.id)
            const isExpanded = expandedLocales.includes(loc.locale)
            const isBusy = busyLocalizationId === loc.id
            const isFull = groupInfo?.maxCount != null && slot.length >= groupInfo.maxCount
            return (
              <div key={loc.id} className="overflow-hidden rounded-xl border border-border/50">
                <div
                  className="flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-muted/30"
                  onClick={() => toggleLocale(loc.locale)}
                >
                  <span className="text-lg">{info?.flag || '🌐'}</span>
                  <span className="flex-1 truncate text-sm font-medium">{info?.name || loc.locale}</span>
                  {isBusy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  <Badge variant={slot.length > 0 ? 'outline' : 'secondary'} className="text-xs">
                    {slot.length}{groupInfo?.maxCount != null ? `/${groupInfo.maxCount}` : ''}
                  </Badge>
                  {counts.total > slot.length && (
                    <span className="hidden text-[11px] text-muted-foreground sm:inline">{counts.total} placements in total</span>
                  )}
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>

                {isExpanded && (
                  <div className="space-y-3 border-t border-border/50 bg-muted/20 p-3">
                    {slot.length === 0 ? (
                      <p className="text-xs italic text-muted-foreground">Nothing in this slot yet.</p>
                    ) : (
                      <div className="flex gap-3 overflow-x-auto pb-1">
                        {slot.map((placement, index) => (
                          <div key={placement.id} className="group relative shrink-0 space-y-1">
                            <MediaThumb
                              asset={placement.asset || { mediaType: placement.mediaType, state: 'UPLOAD_COMPLETE' }}
                              className="h-36"
                              onClick={placement.asset && onPreview ? () => onPreview(placement.asset, info?.name || loc.locale) : undefined}
                            />
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[10px] text-muted-foreground">#{index + 1}</span>
                              <Badge
                                variant="outline"
                                className={`h-4 px-1 text-[9px] ${placement.state === 'FAILED' ? 'border-red-500/50 text-red-500' : ''}`}
                                title={placement.stateDetails?.map(d => d.description || d.code).join(', ')}
                              >
                                {PLACEMENT_STATE_LABELS[placement.state] || placement.state || '—'}
                              </Badge>
                            </div>
                            {!readOnly && (
                              <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                                {orderable && index > 0 && (
                                  <button type="button" disabled={isBusy} onClick={() => movePlacement(loc, placement, -1)}
                                    className="rounded bg-black/60 p-0.5 text-white hover:bg-black/80" title="Move left">
                                    <ChevronLeft className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                {orderable && index < slot.length - 1 && (
                                  <button type="button" disabled={isBusy} onClick={() => movePlacement(loc, placement, 1)}
                                    className="rounded bg-black/60 p-0.5 text-white hover:bg-black/80" title="Move right">
                                    <ChevronRight className="h-3.5 w-3.5" />
                                  </button>
                                )}
                                <button type="button" disabled={isBusy} onClick={() => removePlacement(loc, placement)}
                                  className="rounded bg-black/60 p-0.5 text-white hover:bg-red-600" title="Remove from this locale (the asset stays in the library)">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {!readOnly && (
                      <Button size="sm" variant="outline" disabled={isBusy || isFull} onClick={() => setPicker({ localization: loc })}>
                        <Library className="mr-2 h-4 w-4" />
                        {isFull ? 'Slot full' : 'Add from library'}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Folder upload */}
      {!readOnly && (
        <div className="space-y-3 border-t border-border/50 pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Upload to {slotLabel}</span>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border"
              />
              Replace what's in the slot
            </label>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
            onDrop={handleDrop}
            className={`rounded-xl border-2 border-dashed p-6 text-center transition-all
              ${isDragging ? 'scale-[1.01] border-primary bg-primary/5' : 'border-border/50 hover:border-primary/40 hover:bg-muted/30'}`}
          >
            <FolderOpen className={`mx-auto mb-2 h-8 w-8 ${isDragging ? 'text-primary' : 'text-muted-foreground/50'}`} />
            <p className="text-sm font-medium text-muted-foreground">
              {isDragging ? 'Drop it!' : `Drop ${acceptsVideos && !acceptsImages ? 'videos' : 'screenshots'} here`}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{dropHint}</p>
          </div>

          {queue.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Upload queue</span>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearQueue} disabled={isUploading}>Clear</Button>
              </div>
              <div className="max-h-52 space-y-1.5 overflow-y-auto">
                {queue.map(({ locale, files, status }) => {
                  const info = localeInfo(locale)
                  const known = localizations.some(l => l.locale === locale)
                  return (
                    <div key={locale} className={`flex items-center gap-3 rounded-lg border p-2.5 text-sm
                      ${status === 'done' ? 'border-emerald-500/30 bg-emerald-500/10'
                        : status === 'error' ? 'border-red-500/30 bg-red-500/10'
                          : status === 'uploading' ? 'border-primary/30 bg-primary/5' : 'border-border/50 bg-muted/30'}`}
                    >
                      <span className="text-lg">{info?.flag || '🌐'}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{info?.name || locale}</span>
                          <Badge variant="outline" className="text-[10px]">{files.length} file{files.length === 1 ? '' : 's'}</Badge>
                          {!info && <Badge variant="destructive" className="text-[10px]">Unknown locale</Badge>}
                          {info && !known && <Badge variant="secondary" className="text-[10px]">new locale</Badge>}
                        </div>
                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                          {files.map(f => `${f.name} (${formatFileSize(f.size)})`).join(', ')}
                        </p>
                      </div>
                      {status === 'uploading' ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        : status === 'done' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          : status === 'error' ? <AlertCircle className="h-4 w-4 text-red-500" />
                            : (
                              <button type="button" onClick={() => removeFromQueue(locale)} className="rounded p-1 hover:bg-muted">
                                <X className="h-4 w-4 text-muted-foreground" />
                              </button>
                            )}
                    </div>
                  )
                })}
              </div>

              {isUploading && progress.total > 0 && (
                <div className="rounded-lg border border-primary/30 bg-primary/5 p-2.5">
                  <div className="mb-1.5 flex justify-between text-xs">
                    <span className="truncate text-muted-foreground">{progress.currentFile}</span>
                    <span>{progress.current}/{progress.total}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary transition-all" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleUpload}
                disabled={isUploading || queue.every(q => q.status === 'done')}
              >
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload & place {queue.reduce((sum, q) => sum + q.files.length, 0)} file(s)
              </Button>
              <p className="text-[11px] text-muted-foreground">
                Files go into the Asset Library once, then get placed on each locale. Wrongly sized files are skipped before upload.
              </p>
            </div>
          )}
        </div>
      )}

      {picker && (
        <LibraryPickerDialog
          key={`${pickerLocalization.id}-${placementType}-${placementGroup}`}
          open
          assets={compatibleAssets.filter(a => !getSlotPlacements(pickerLocalization.id).some(p => p.assetId === a.id))}
          refData={library.refData}
          slotLabel={slotLabel}
          localeLabel={localeInfo(pickerLocalization.locale)?.name || pickerLocalization.locale}
          maxSelectable={pickerRoom}
          isBusy={isPlacing}
          onClose={() => setPicker(null)}
          onConfirm={async (assets) => {
            setIsPlacing(true)
            await placeAssets(pickerLocalization, assets)
            setIsPlacing(false)
            setPicker(null)
          }}
        />
      )}

      {library.hasProcessing && (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Apple is still processing {library.assets.filter(isAssetProcessing).length} asset(s) — thumbnails appear when done.
        </p>
      )}
    </div>
  )
}
