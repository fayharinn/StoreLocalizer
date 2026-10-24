import { useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  AlertCircle, CheckCircle2, ChevronDown, FolderOpen, Image, Loader2, Plus, RefreshCw, Trash2, Upload, X,
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
    <Card id="gp-images" className="border-border/50 shadow-sm card-hover scroll-mt-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-pink-500/10">
              <Image className="h-5 w-5 text-pink-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Screenshots & Graphics</CardTitle>
              <CardDescription>Images of every store listing, loaded with the edit session</CardDescription>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={refresh} disabled={isLoading || languages.length === 0}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Image type</Label>
          <Select value={imageType} onValueChange={setImageType}>
            <SelectTrigger className="h-9 w-full sm:w-[260px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(GP_IMAGE_TYPES).map(([key, info]) => (
                <SelectItem key={key} value={key}>{info.name} (max {info.max})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Accepted: {describeImageSpec(imageType)}</p>
        </div>

        {/* Existing images, per locale */}
        <div className="space-y-2">
          {!hasLoaded && isLoading && (
            <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Loading existing {typeInfo.short.toLowerCase()} images…
            </div>
          )}
          {languages.map((locale) => {
            const info = localeInfo(locale)
            const images = getImages(locale)
            const isExpanded = expandedLocales.includes(locale)
            const isBusy = busyLocale === locale
            const isFull = images.length >= max
            return (
              <div key={locale} className="overflow-hidden rounded-xl border border-border/50">
                <div
                  className="flex cursor-pointer items-center gap-3 p-3 transition-colors hover:bg-muted/30"
                  onClick={() => toggleLocale(locale)}
                >
                  <span className="text-lg">{info?.flag || '🌐'}</span>
                  <span className="flex-1 truncate text-sm font-medium">
                    {info?.name || locale} <span className="text-xs font-normal text-muted-foreground">{locale}</span>
                  </span>
                  {isBusy && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                  <Badge variant={images.length > 0 ? 'outline' : 'secondary'} className="text-xs">
                    {images.length}/{max}
                  </Badge>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                </div>

                {isExpanded && (
                  <div className="space-y-3 border-t border-border/50 bg-muted/20 p-3">
                    {images.length === 0 ? (
                      <p className="text-xs italic text-muted-foreground">Nothing uploaded for {typeInfo.short.toLowerCase()} yet.</p>
                    ) : (
                      <div className="flex gap-3 overflow-x-auto pb-1">
                        {images.map((img, index) => (
                          <div key={img.id} className="group relative shrink-0 space-y-1">
                            <img
                              src={img.url}
                              alt={`${locale} ${typeInfo.short} ${index + 1}`}
                              className="h-40 w-auto cursor-pointer rounded-lg border border-border/50 bg-muted/20 transition-opacity hover:opacity-80"
                              crossOrigin="anonymous"
                              referrerPolicy="no-referrer"
                              onClick={() => setFullscreenImage(img.url)}
                            />
                            <span className="block text-[10px] text-muted-foreground">#{index + 1}</span>
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => removeImage(locale, img)}
                              className="absolute right-1 top-1 rounded bg-black/60 p-0.5 text-white opacity-0 transition-opacity hover:bg-red-600 group-hover:opacity-100"
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
                          className="text-red-500 hover:bg-red-500/10 hover:text-red-600"
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
        <div className="space-y-3 border-t border-border/50 pt-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Upload className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Import a folder of screenshots</span>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs">
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
            className={`rounded-xl border-2 border-dashed p-6 text-center transition-all
              ${isDragging ? 'scale-[1.01] border-primary bg-primary/5' : 'border-border/50 hover:border-primary/40 hover:bg-muted/30'}`}
          >
            {isReadingDrop
              ? <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-primary" />
              : <FolderOpen className={`mx-auto mb-2 h-8 w-8 ${isDragging ? 'text-primary' : 'text-muted-foreground/50'}`} />}
            <p className="text-sm font-medium text-muted-foreground">
              {isReadingDrop ? 'Checking images…' : isDragging ? 'Drop it!' : 'Drop the screenshots folder here'}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              One subfolder per locale: <code>fr-FR/</code>, <code>en-US/</code>… Inside, either images directly
              (sent as {typeInfo.short.toLowerCase()}) or one folder per type: <code>phone/</code>, <code>7-inch/</code>,{' '}
              <code>10-inch/</code>, <code>tv/</code>, <code>wear/</code>, plus <code>icon.png</code> and <code>featureGraphic.png</code>.
            </p>
          </div>

          {plan.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">
                  {plan.length} folder{plan.length === 1 ? '' : 's'} checked
                </span>
                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={clearQueue} disabled={isImporting}>Clear</Button>
              </div>

              <div className="max-h-96 space-y-1.5 overflow-y-auto">
                {plan.map((group) => {
                  const info = localeInfo(group.locale)
                  const skipped = !group.locale || !group.listed
                  const tone = group.status === 'done' ? 'border-emerald-500/30 bg-emerald-500/10'
                    : group.status === 'error' ? 'border-red-500/30 bg-red-500/10'
                      : group.status === 'uploading' ? 'border-primary/30 bg-primary/5'
                        : skipped ? 'border-amber-500/30 bg-amber-500/5' : 'border-border/50 bg-muted/30'
                  return (
                    <div key={group.key} className={`space-y-2 rounded-lg border p-2.5 text-sm ${tone}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-lg">{info?.flag || '🌐'}</span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{info?.name || group.folder}</span>
                            {group.locale && <Badge variant="outline" className="text-[10px]">{group.locale}</Badge>}
                            {!group.locale && <Badge variant="destructive" className="text-[10px]">Unknown locale</Badge>}
                            {group.locale && !group.listed && (
                              <Badge variant="secondary" className="text-[10px]">No listing — skipped</Badge>
                            )}
                            {group.uploadCount > 0 && (
                              <Badge variant="outline" className="text-[10px]">
                                {group.status === 'done' || group.status === 'error' ? `${group.uploadCount} uploaded` : `${group.uploadCount} to upload`}
                              </Badge>
                            )}
                          </div>
                          {!group.locale && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              “{group.folder}” isn't a Google Play language — rename it like <code>fr-FR</code> or <code>en-US</code>.
                            </p>
                          )}
                          {group.locale && !group.listed && (
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Add a {group.locale} store listing first (Translate section), then drop the folder again.
                            </p>
                          )}
                        </div>
                        {group.status === 'uploading' ? <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          : group.status === 'done' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            : group.status === 'error' ? <AlertCircle className="h-4 w-4 text-red-500" />
                              : (
                                <button type="button" onClick={() => removeFromQueue(group.key)} className="rounded p-1 hover:bg-muted">
                                  <X className="h-4 w-4 text-muted-foreground" />
                                </button>
                              )}
                      </div>

                      {group.types.map((t) => (
                        <div key={t.imageType} className="ml-9 space-y-0.5 text-xs">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                            <span className="font-medium">{t.info.short}</span>
                            <span className="text-muted-foreground">
                              {t.images.length - t.invalid.length}/{t.images.length} valid
                              {t.images.length > t.invalid.length && ` · ${sizeSummary(t.images.filter(i => !i.error))}`}
                              {' · '}
                              {formatFileSize(t.images.reduce((sum, i) => sum + i.file.size, 0))}
                            </span>
                          </div>
                          {t.invalid.map((image) => (
                            <p key={image.path} className="flex items-start gap-1 text-red-500">
                              <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" />
                              <span className="min-w-0 break-words">{image.name}: {image.error}</span>
                            </p>
                          ))}
                          {t.overflow > 0 && (
                            <p className="text-amber-600 dark:text-amber-400">
                              {t.overflow} image{t.overflow === 1 ? '' : 's'} over the limit of {t.info.max} — only the first {t.toUpload.length} will be sent.
                            </p>
                          )}
                          {t.belowPublishMinimum && (
                            <p className="text-muted-foreground">Google Play needs at least {t.info.minToPublish} to publish.</p>
                          )}
                        </div>
                      ))}
                      {group.skipped > 0 && (
                        <p className="ml-9 text-xs text-muted-foreground">{group.skipped} non-image file{group.skipped === 1 ? '' : 's'} ignored.</p>
                      )}
                    </div>
                  )
                })}
              </div>

              {isImporting && progress.total > 0 && (
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

              <Button className="w-full" onClick={handleImport} disabled={isImporting || importCount === 0 || queue.length === 0}>
                {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload {importCount} image{importCount === 1 ? '' : 's'} to {importable.length} listing{importable.length === 1 ? '' : 's'}
              </Button>
              <p className="text-[11px] text-muted-foreground">
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
