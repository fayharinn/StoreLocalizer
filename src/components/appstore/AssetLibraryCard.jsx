import { useMemo, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertCircle, Archive, CheckCircle2, Library, Loader2, Pencil, RefreshCw, Trash2, Upload, X, Sparkles,
} from 'lucide-react'
import {
  ASSET_CATEGORIES,
  ASSET_STATE_LABELS,
  assetDimensions,
  findSpec,
  formatSpecDimensions,
} from '@/services/appAssetLibraryService'
import { formatFileSize } from '@/utils/mediaDrop'
import MediaThumb from './MediaThumb'
import AssetDialog from './AssetDialog'
import ConfirmDialog from './ConfirmDialog'

const MEDIA_FILTERS = [
  { value: 'ALL', label: 'All' },
  { value: 'IMAGE', label: 'Images' },
  { value: 'VIDEO', label: 'Videos' },
]

export default function AssetLibraryCard({ selectedApp, library, onPreview }) {
  const {
    refData, assets, isLoading, error, refresh, uploadQueue, isUploading, queueFiles, removeFromQueue, clearQueue,
    uploadQueued, assetDialog, setAssetDialog, handleSaveAsset, handleArchiveAsset, deleteConfirm, setDeleteConfirm,
    handleDeleteAsset,
  } = library

  const [category, setCategory] = useState('APP_SCREENSHOTS_AND_PREVIEWS')
  const [mediaFilter, setMediaFilter] = useState('ALL')
  const [categoryFilter, setCategoryFilter] = useState('ALL')
  const [showArchived, setShowArchived] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const fileInput = useRef(null)

  const visibleAssets = useMemo(() => assets.filter(a =>
    (mediaFilter === 'ALL' || a.mediaType === mediaFilter) &&
    (categoryFilter === 'ALL' || a.category === categoryFilter) &&
    (showArchived || a.state !== 'ARCHIVED')
  ), [assets, mediaFilter, categoryFilter, showArchived])

  const imageCount = assets.filter(a => a.mediaType === 'IMAGE').length
  const videoCount = assets.length - imageCount

  return (
    <>
      <Card id="asc-asset-library" className="scroll-mt-44 border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10">
                <Library className="h-5 w-5 text-indigo-500" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  Asset Library
                  <Badge variant="secondary" className="text-[10px]">iOS 27</Badge>
                </CardTitle>
                <CardDescription>
                  Upload images and videos once for {selectedApp.name}, then place them on the product page, custom product pages, tests and events
                </CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" className="h-9" onClick={refresh} disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/40 p-3 text-xs text-foreground/80">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>
              <span className="font-semibold">Creative assets</span> are new rich images and videos for the product page header, search results
              and In-App Event cards, shown on iOS 27 / iPadOS 27 and later. They complement screenshots and app previews, and go through
              App Review with the page they're placed on.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
              <div>
                <p className="font-medium">Couldn't open the Asset Library</p>
                <p className="text-xs text-muted-foreground">
                  {error}. The API key needs the Account Holder, Admin or App Manager role.
                </p>
              </div>
            </div>
          )}

          {/* Upload */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[220px] flex-1 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Upload as</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(ASSET_CATEGORIES).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="flex-[2] text-[11px] text-muted-foreground">
                The category can't be changed later: screenshots &amp; previews fill screenshot and app preview slots,
                creative assets fill header, search results and event slots.
              </p>
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
              onDrop={(e) => {
                e.preventDefault()
                setIsDragging(false)
                queueFiles(Array.from(e.dataTransfer.files))
              }}
              onClick={() => fileInput.current?.click()}
              className={`cursor-pointer rounded-xl border-2 border-dashed p-6 text-center transition-all
                ${isDragging ? 'scale-[1.01] border-indigo-500 bg-indigo-500/5' : 'border-border/50 hover:border-indigo-500/40 hover:bg-muted/30'}`}
            >
              <Upload className={`mx-auto mb-2 h-8 w-8 ${isDragging ? 'text-indigo-500' : 'text-muted-foreground/50'}`} />
              <p className="text-sm font-medium text-muted-foreground">Drop images or videos, or click to browse</p>
              <p className="mt-1 text-xs text-muted-foreground">PNG / JPEG at exact store sizes · MP4 / MOV app previews</p>
              <input
                ref={fileInput}
                type="file"
                multiple
                accept="image/png,image/jpeg,video/mp4,video/quicktime,video/x-m4v"
                className="hidden"
                onChange={(e) => {
                  queueFiles(Array.from(e.target.files || []))
                  e.target.value = ''
                }}
              />
            </div>

            {uploadQueue.length > 0 && (
              <div className="space-y-2">
                <div className="max-h-48 space-y-1.5 overflow-y-auto">
                  {uploadQueue.map((item, index) => (
                    <div key={`${item.file.name}-${index}`} className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/30 p-2 text-sm">
                      <div className="min-w-0 flex-1">
                        <p className="truncate">{item.file.name} <span className="text-xs text-muted-foreground">({formatFileSize(item.file.size)})</span></p>
                        {item.status === 'uploading' && (
                          <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                            <div className="h-full bg-indigo-500 transition-all" style={{ width: `${Math.round(item.progress * 100)}%` }} />
                          </div>
                        )}
                        {item.error && <p className="truncate text-xs text-red-500">{item.error}</p>}
                      </div>
                      {item.status === 'uploading' ? <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
                        : item.status === 'done' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          : item.status === 'error' ? <AlertCircle className="h-4 w-4 text-red-500" />
                            : (
                              <button type="button" onClick={() => removeFromQueue(index)} className="rounded p-1 hover:bg-muted" disabled={isUploading}>
                                <X className="h-4 w-4 text-muted-foreground" />
                              </button>
                            )}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={clearQueue} disabled={isUploading}>Clear</Button>
                  <Button
                    className="flex-1"
                    onClick={() => uploadQueued(category)}
                    disabled={isUploading || !library.libraryId || uploadQueue.every(q => q.status === 'done')}
                  >
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Upload {uploadQueue.filter(q => q.status !== 'done').length} file(s) as {ASSET_CATEGORIES[category].toLowerCase()}
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Library grid */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex rounded-lg border border-border/50 p-0.5">
                {MEDIA_FILTERS.map(f => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setMediaFilter(f.value)}
                    className={`rounded-md px-3 py-1 text-xs transition-colors ${mediaFilter === f.value ? 'bg-muted font-semibold' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {f.label}
                    <span className="ml-1 text-muted-foreground">
                      {f.value === 'ALL' ? assets.length : f.value === 'IMAGE' ? imageCount : videoCount}
                    </span>
                  </button>
                ))}
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-8 w-[190px] text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All categories</SelectItem>
                  {Object.entries(ASSET_CATEGORIES).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={showArchived} onCheckedChange={setShowArchived} />
                Show archived
              </label>
            </div>

            {isLoading && assets.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Loading library…
              </div>
            ) : visibleAssets.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-muted-foreground">
                <Library className="mb-2 h-10 w-10 opacity-30" />
                <p className="text-sm font-medium">{assets.length === 0 ? 'The library is empty' : 'Nothing matches these filters'}</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
                {visibleAssets.map(asset => {
                  const dims = assetDimensions(asset)
                  const size = dims ? `${dims.width}×${dims.height}` : formatSpecDimensions(findSpec(refData, asset.specId))
                  return (
                    <div key={asset.id} className="group min-w-0 space-y-1.5">
                      <div className="relative">
                        <MediaThumb
                          asset={asset}
                          className="h-44 w-full"
                          fill
                          onClick={onPreview ? () => onPreview(asset, ASSET_CATEGORIES[asset.category] || '') : undefined}
                        />
                        <div className="absolute right-1 top-1 flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                          <button type="button" title="Edit" onClick={() => setAssetDialog({ open: true, asset, isSaving: false })}
                            className="rounded bg-black/60 p-1 text-white hover:bg-black/80">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          {asset.state === 'APPROVED' && (
                            <button type="button" title="Archive" onClick={() => handleArchiveAsset(asset)}
                              className="rounded bg-black/60 p-1 text-white hover:bg-black/80">
                              <Archive className="h-3.5 w-3.5" />
                            </button>
                          )}
                          <button type="button" title="Delete" onClick={() => setDeleteConfirm({ open: true, asset, isDeleting: false })}
                            className="rounded bg-black/60 p-1 text-white hover:bg-red-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                      <p className="truncate text-xs font-medium" title={asset.fileName}>{asset.referenceName || asset.fileName}</p>
                      <div className="flex flex-wrap items-center gap-1">
                        <Badge
                          variant={asset.state === 'APPROVED' ? 'default' : 'outline'}
                          className={`h-4 px-1 text-[10px] ${asset.state === 'FAILED' || asset.state === 'REJECTED' ? 'border-red-500/50 text-red-500' : ''}`}
                        >
                          {ASSET_STATE_LABELS[asset.state] || asset.state}
                        </Badge>
                        {asset.category === 'CREATIVE_ASSETS' && <Badge variant="secondary" className="h-4 px-1 text-[10px]">Creative</Badge>}
                        {size && <span className="text-[10px] text-muted-foreground">{size}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {assetDialog.open && assetDialog.asset && (
        <AssetDialog
          key={assetDialog.asset.id}
          open
          asset={assetDialog.asset}
          refData={refData}
          isSaving={assetDialog.isSaving}
          onClose={() => setAssetDialog({ open: false, asset: null, isSaving: false })}
          onSave={handleSaveAsset}
        />
      )}

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete asset?"
        description={`"${deleteConfirm.asset?.referenceName || deleteConfirm.asset?.fileName}" will be permanently removed from the Asset Library. Apple refuses the delete while a page still uses it — remove its placements first.`}
        confirmLabel="Delete asset"
        isBusy={deleteConfirm.isDeleting}
        onClose={() => setDeleteConfirm({ open: false, asset: null, isDeleting: false })}
        onConfirm={() => handleDeleteAsset(deleteConfirm.asset)}
      />
    </>
  )
}
