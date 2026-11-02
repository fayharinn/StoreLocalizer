import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertCircle, CheckCircle2, ChevronDown, FolderOpen, Loader2, Plus, RefreshCw, Trash2, Upload, X,
} from 'lucide-react'
import { GP_LOCALES, GP_IMAGE_TYPES, describeImageSpec } from '@/services/googlePlayService'
import { formatFileSize } from '@/utils/mediaDrop'

function localeInfo(code) {
  return GP_LOCALES.find(l => l.code === code)
}

function sizeSummary(images) {
  const counts = new Map()
  for (const { width, height } of images) {
    const key = `${width}×${height}`
    counts.set(key, (counts.get(key) || 0) + 1)
  }
  return [...counts.entries()].map(([size, n]) => (n > 1 ? `${n} × ${size}` : size)).join(', ')
}

// Listing images per locale (loaded automatically with the edit session) and the
// folder import: one subfolder per locale, optionally split by image type.
export default function ImagesCard({ media, setFullscreenImage }) {
  const fileInputs = useRef({})

  const {
    imageType, setImageType, max, languages, isLoading, hasLoaded, getImages, refresh,
    expandedLocales, toggleLocale, busyLocale, removeImage, removeAllImages, addFiles,
    replaceExisting, setReplaceExisting, isDragging, setIsDragging, isReadingDrop,
    queue, plan, isImporting, progress, handleDrop, removeFromQueue, clearQueue, handleImport,
  } = media

  const typeInfo = GP_IMAGE_TYPES[imageType]
  const importable = plan.filter(g => g.uploadCount > 0 && g.status !== 'done' && g.status !== 'error')
  const importCount = importable.reduce((sum, g) => sum + g.uploadCount, 0)

  return (
    <Card id="gp-images" className="scroll-mt-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base font-medium">Screenshots and graphics</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">Images of every store listing, loaded with the edit session</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading || languages.length === 0}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-faint">Image type</Label>
          <Select value={imageType} onValueChange={setImageType}>
            <SelectTrigger className="h-9 w-full sm:w-[260px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(GP_IMAGE_TYPES).map(([key, info]) => (
                <SelectItem key={key} value={key}>{info.name} (max {info.max})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-faint">Accepted: {describeImageSpec(imageType)}</p>
        </div>

        {/* Existing images, per locale */}
        <div className="space-y-2">
          {!hasLoaded && isLoading && (
            <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin text-faint" />
              Loading existing {typeInfo.short.toLowerCase()} images
            </div>
          )}
          {languages.map((locale) => {
            const info = localeInfo(locale)
            const images = getImages(locale)
            const isExpanded = expandedLocales.includes(locale)
            const isBusy = busyLocale === locale
            const isFull = images.length >= max
            return (
              <div key={locale} className="overflow-hidden rounded-lg border border-border">
                <div
                  className="flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-secondary/50"
                  onClick={() => toggleLocale(locale)}
                >
                  <span className="text-base">{info?.flag || '🌐'}</span>
                  <span className="flex flex-1 min-w-0 items-center gap-2 text-sm font-medium">
                    <span className="truncate">{info?.name || locale}</span> <span className="keycap">{locale}</span>
                  </span>
                  {isBusy && <Loader2 className="h-4 w-4 animate-spin text-faint" />}
                  <Badge variant={images.length > 0 ? 'outline' : 'secondary'} className="text-xs tabular-nums">
                    {images.length}/{max}
                  </Badge>
                  <ChevronDown className={`h-4 w-4 text-faint transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>

                {isExpanded && (
                  <div className="space-y-3 border-t border-border bg-secondary/30 p-3">
                    {images.length === 0 ? (
                      <p className="text-xs text-faint">Nothing uploaded for {typeInfo.short.toLowerCase()} yet.</p>
                    ) : (
                      <div className="flex gap-3 overflow-x-auto pb-1">
                        {images.map((img, index) => (
                          <div key={img.id} className="group relative shrink-0 space-y-1">
                            <img
                              src={img.url}
                              alt={`${locale} ${typeInfo.short} ${index + 1}`}
                              className="h-40 w-auto cursor-pointer rounded-lg border border-border bg-secondary/30 transition-opacity hover:opacity-80"
                              crossOrigin="anonymous"
                              referrerPolicy="no-referrer"
                              onClick={() => setFullscreenImage(img.url)}
                            />
                            <span className="block font-mono text-xs tabular-nums text-faint">#{index + 1}</span>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => removeImage(locale, img)}
                              className="absolute right-1 top-1 rounded-md bg-black/60 p-0.5 text-white opacity-0 transition-[opacity,background-color] hover:bg-destructive group-hover:opacity-100"
                              title="Delete this image"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <input
                        ref={(el) => { fileInputs.current[locale] = el }}
                        type="file"
                        accept="image/png,image/jpeg"
                        multiple
                        className="hidden"
                        onChange={(e) => { addFiles(locale, e.target.files); e.target.value = '' }}
                      />
                      <Button size="sm" variant="outline" disabled={isBusy || isFull} onClick={() => fileInputs.current[locale]?.click()}>
                        <Plus className="mr-2 h-4 w-4" />
                        {isFull ? 'Slot full' : 'Add images'}
                      </Button>
                      {images.length > 0 && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={isBusy}
                          onClick={() => removeAllImages(locale)}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete all
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Folder import */}
        <div className="space-y-3 border-t border-border pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-faint" />
              <span className="text-sm font-medium">Import a folder of screenshots</span>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border"
              />
              Replace images of the same type
            </label>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
            onDrop={handleDrop}
            className={`rounded-lg border border-dashed p-6 text-center transition-colors
              ${isDragging ? 'border-foreground/40 bg-secondary' : 'border-border hover:border-foreground/30 hover:bg-secondary/40'}`}
          >
            {isReadingDrop
              ? <Loader2 className="mx-auto mb-2 h-6 w-6 animate-spin text-faint" />
              : <FolderOpen className={`mx-auto mb-2 h-6 w-6 ${isDragging ? 'text-muted-foreground' : 'text-faint'}`} />}
            <p className="text-sm font-medium text-muted-foreground">
              {isReadingDrop ? 'Checking images' : isDragging ? 'Release to add the folder' : 'Drop the screenshots folder here'}
            </p>
            <p className="mt-1 text-xs text-faint">
              One subfolder per locale: <code>fr-FR/</code>, <code>en-US/</code> and so on. Inside, either images directly
              (sent as {typeInfo.short.toLowerCase()}) or one folder per type: <code>phone/</code>, <code>7-inch/</code>,{' '}
              <code>10-inch/</code>, <code>tv/</code>, <code>wear/</code>, plus <code>icon.png</code> and <code>featureGraphic.png</code>.
            </p>
          </div>

          {plan.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium tabular-nums">
                  {plan.length} folder{plan.length === 1 ? '' : 's'} checked
                </span>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearQueue} disabled={isImporting}>Clear</Button>
              </div>

              <div className="max-h-96 space-y-1.5 overflow-y-auto">
                {plan.map((group) => {
                  const info = localeInfo(group.locale)
                  const skipped = !group.locale || !group.listed
                  const tone = group.status === 'done' ? 'border-positive/30 bg-positive/10'
                    : group.status === 'error' ? 'border-destructive/30 bg-destructive/10'
                      : group.status === 'uploading' ? 'border-foreground/30 bg-secondary'
                        : skipped ? 'border-highlight/30 bg-highlight/10' : 'border-border bg-secondary/40'
                  return (
                    <div key={group.key} className={`space-y-2 rounded-lg border p-3 text-sm ${tone}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-base">{info?.flag || '🌐'}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{info?.name || group.folder}</span>
                            {group.locale && <span className="keycap">{group.locale}</span>}
                            {!group.locale && <Badge variant="destructive" className="text-xs">Unknown locale</Badge>}
                            {group.locale && !group.listed && (
                              <Badge variant="warning" className="text-xs">No listing, skipped</Badge>
                            )}
                            {group.uploadCount > 0 && (
                              <Badge variant="outline" className="text-xs tabular-nums">
                                {group.status === 'done' || group.status === 'error' ? `${group.uploadCount} uploaded` : `${group.uploadCount} to upload`}
                              </Badge>
                            )}
                          </div>
                          {!group.locale && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              “{group.folder}” isn't a Google Play language. Rename it like <code>fr-FR</code> or <code>en-US</code>.
                            </p>
                          )}
                          {group.locale && !group.listed && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Add a {group.locale} store listing first (Translate section), then drop the folder again.
                            </p>
                          )}
                        </div>
                        {group.status === 'uploading' ? <Loader2 className="h-4 w-4 animate-spin text-faint" />
                          : group.status === 'done' ? <CheckCircle2 className="h-4 w-4 text-positive" />
                            : group.status === 'error' ? <AlertCircle className="h-4 w-4 text-destructive" />
                              : (
                                <button type="button" onClick={() => removeFromQueue(group.key)} className="rounded-md p-1 transition-colors hover:bg-secondary">
                                  <X className="h-4 w-4 text-faint" />
                                </button>
                              )}
                      </div>

                      {group.types.map((t) => (
                        <div key={t.imageType} className="ml-9 space-y-0.5 text-xs">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="font-medium">{t.info.short}</span>
                            <span className="text-muted-foreground tabular-nums">
                              {t.images.length - t.invalid.length}/{t.images.length} valid
                              {t.images.length > t.invalid.length && ` · ${sizeSummary(t.images.filter(i => !i.error))}`}
                              {' · '}
                              {formatFileSize(t.images.reduce((sum, i) => sum + i.file.size, 0))}
                            </span>
                          </div>
                          {t.invalid.map((image) => (
                            <p key={image.path} className="flex items-start gap-1 text-destructive">
                              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                              <span className="min-w-0 break-words">{image.name}: {image.error}</span>
                            </p>
                          ))}
                          {t.overflow > 0 && (
                            <p className="text-highlight-ink tabular-nums">
                              {t.overflow} image{t.overflow === 1 ? '' : 's'} over the limit of {t.info.max}. Only the first {t.toUpload.length} will be sent.
                            </p>
                          )}
                          {t.belowPublishMinimum && (
                            <p className="text-muted-foreground">Google Play needs at least {t.info.minToPublish} to publish.</p>
                          )}
                        </div>
                      ))}
                      {group.skipped > 0 && (
                        <p className="ml-9 text-xs text-faint tabular-nums">{group.skipped} non-image file{group.skipped === 1 ? '' : 's'} ignored.</p>
                      )}
                    </div>
                  )
                })}
              </div>

              {isImporting && progress.total > 0 && (
                <div className="rounded-lg border border-border bg-secondary/40 p-3">
                  <div className="mb-2 flex justify-between gap-3 text-xs">
                    <span className="truncate text-muted-foreground">{progress.currentFile}</span>
                    <span className="tabular-nums">{progress.current}/{progress.total}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div className="h-full bg-highlight transition-[width]" style={{ width: `${(progress.current / progress.total) * 100}%` }} />
                  </div>
                </div>
              )}

              <Button className="w-full" onClick={handleImport} disabled={isImporting || importCount === 0 || queue.length === 0}>
                {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload {importCount} image{importCount === 1 ? '' : 's'} to {importable.length} listing{importable.length === 1 ? '' : 's'}
              </Button>
              <p className="text-xs text-faint">
                Images are sent to the open edit session, in file-name order. Invalid images are skipped before upload;
                nothing goes live until you commit the edit.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
