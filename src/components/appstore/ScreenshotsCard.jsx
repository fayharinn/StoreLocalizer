import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle2, AlertCircle, Loader2, ChevronDown, RefreshCw, Image, Smartphone, Tablet, Monitor, Watch, Upload, FolderOpen, X } from 'lucide-react'
import { ASC_LOCALES } from '@/services/appStoreConnectService'
import { formatSpecDimensions } from '@/services/appAssetLibraryService'

function getDeviceIcon(displayType) {
  if (displayType.includes('IPHONE')) return Smartphone
  if (displayType.includes('IPAD')) return Tablet
  if (displayType.includes('DESKTOP') || displayType.includes('MAC')) return Monitor
  if (displayType.includes('WATCH')) return Watch
  return Smartphone
}

export default function ScreenshotsCard({
  versionLocalizations,
  screenshotsByLocale,
  isLoadingScreenshots,
  expandedScreenshotLocales,
  handleLoadScreenshots,
  toggleScreenshotLocale,
  setScreenshotPreview,
  // useLocalizedMedia for the version, narrowed to SCREENSHOT_TARGET_DEVICES
  upload,
  onUpload,
}) {
  const {
    groups, placementGroup, setPlacementGroup, groupInfo,
    replaceExisting, setReplaceExisting, isDragging, setIsDragging,
    queue, isUploading, progress, handleDrop, removeFromQueue, clearQueue,
  } = upload
  const acceptedSizes = [...new Set((groupInfo?.specs || []).map(formatSpecDimensions).filter(Boolean))]

  return (
    <Card id="asc-screenshots" className="scroll-mt-44">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              Screenshots
              <Badge variant="outline" className="text-xs font-normal">Legacy</Badge>
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">Screenshot sets — deprecated by Apple in API 4.5.1; uploads below go through the Asset Library</CardDescription>
          </div>
          <Button
            onClick={handleLoadScreenshots}
            disabled={isLoadingScreenshots}
            variant={Object.keys(screenshotsByLocale).length > 0 ? "outline" : "default"}
            size="sm"
            className="h-9"
          >
            {isLoadingScreenshots ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading
              </>
            ) : Object.keys(screenshotsByLocale).length > 0 ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </>
            ) : (
              <>
                <Image className="h-4 w-4 mr-2" />
                Load screenshots
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {Object.keys(screenshotsByLocale).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Image className="h-6 w-6 mb-3 text-faint" />
            <p className="font-medium">No screenshots loaded</p>
            <p className="text-sm mt-1">Select "Load screenshots" to view the screenshots of every locale</p>
          </div>
        ) : (
          <div className="space-y-2">
            {versionLocalizations.map(loc => {
              const localeInfo = ASC_LOCALES.find(l => l.code === loc.locale)
              const screenshotData = screenshotsByLocale[loc.locale]
              const isExpanded = expandedScreenshotLocales.includes(loc.locale)
              const totalCount = screenshotData?.totalScreenshots || 0

              return (
                <div
                  key={loc.id}
                  className="rounded-lg border border-border overflow-hidden"
                >
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => toggleScreenshotLocale(loc.locale)}
                  >
                    <span className="text-xl">{localeInfo?.flag || '🌐'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{localeInfo?.name || loc.locale}</span>
                        <span className="keycap">{loc.locale}</span>
                        {totalCount > 0 ? (
                          <Badge variant="outline" className="text-xs tabular-nums">
                            {totalCount} screenshot{totalCount !== 1 ? 's' : ''}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs text-muted-foreground">
                            No screenshots
                          </Badge>
                        )}
                      </div>
                      {screenshotData?.sets?.length > 0 && (
                        <p className="text-xs tabular-nums text-faint mt-1">
                          {screenshotData.sets.length} device type{screenshotData.sets.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-faint transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>

                  {isExpanded && screenshotData && (
                    <div className="px-4 pb-4 pt-2 border-t border-border bg-muted/20">
                      {screenshotData.error ? (
                        <div className="flex items-center gap-2 text-destructive text-sm">
                          <AlertCircle className="h-4 w-4" />
                          <span>{screenshotData.error}</span>
                        </div>
                      ) : screenshotData.sets.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No screenshot sets found</p>
                      ) : (
                        <div className="space-y-4">
                          {screenshotData.sets.map(set => {
                            const DeviceIcon = getDeviceIcon(set.displayType)
                            return (
                              <div key={set.id} className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <DeviceIcon className="h-4 w-4 text-faint" />
                                  <span className="text-sm font-medium">{set.displayInfo.name}</span>
                                  <span className="text-xs text-faint">({set.displayInfo.device})</span>
                                  <Badge variant="outline" className="text-xs tabular-nums ml-auto">
                                    {set.screenshots.length}
                                  </Badge>
                                </div>
                                {set.screenshots.length > 0 && (
                                  <div className="flex gap-2 overflow-x-auto pb-2">
                                    {set.screenshots.map((screenshot, idx) => (
                                      <div
                                        key={screenshot.id}
                                        className="flex-shrink-0 relative group cursor-pointer"
                                        onClick={() => setScreenshotPreview({
                                          open: true,
                                          screenshot,
                                          locale: localeInfo?.name || loc.locale,
                                          deviceType: set.displayInfo.name
                                        })}
                                      >
                                        {screenshot.imageAsset?.templateUrl ? (
                                          <img
                                            src={screenshot.imageAsset.templateUrl
                                              .replace('{w}', '150')
                                              .replace('{h}', '300')
                                              .replace('{f}', 'png')}
                                            alt={screenshot.fileName}
                                            className="h-32 w-auto rounded-md border border-border object-cover hover:border-foreground/30 transition-colors"
                                          />
                                        ) : (
                                          <div className="h-32 w-16 rounded-md border border-border bg-muted/50 flex items-center justify-center">
                                            <Image className="h-6 w-6 text-faint" />
                                          </div>
                                        )}
                                        <div className="absolute bottom-1 left-1 right-1 text-center">
                                          <span className="text-xs tabular-nums bg-black/60 text-white px-1.5 py-0.5 rounded">
                                            {idx + 1}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div className="mt-6 pt-6 border-t border-border">
          <div className="flex items-center gap-3 mb-4">
            <Upload className="h-4 w-4 text-faint" />
            <div>
              <h4 className="font-medium text-sm">Upload screenshots</h4>
              <p className="text-xs text-muted-foreground">Drag and drop a folder with one subfolder per language (en, fr, de…)</p>
            </div>
          </div>

          <div className="mb-4">
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">Target device</Label>
            <Select value={placementGroup || ''} onValueChange={setPlacementGroup} disabled={groups.length === 0}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Loading devices from the Asset Library" />
              </SelectTrigger>
              <SelectContent>
                {groups.map(g => (
                  <SelectItem key={g.groupId} value={g.groupId}>{g.name} - {g.device}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {acceptedSizes.length > 0 && (
              <p className="text-xs tabular-nums text-faint mt-2">Accepted sizes: {acceptedSizes.join(', ')}</p>
            )}
          </div>

          <div className="mb-4 p-3 rounded-lg bg-muted/20 border border-border">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={replaceExisting}
                onChange={(e) => setReplaceExisting(e.target.checked)}
                className="h-4 w-4 rounded border-border accent-foreground"
              />
              <span className="text-sm">Replace existing screenshots</span>
            </label>
            {replaceExisting && (
              <p className="text-xs text-highlight-ink flex items-center gap-1 mt-2">
                <AlertCircle className="h-3 w-3" />
                Existing screenshots for the selected device will be removed before uploading
              </p>
            )}
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
            onDrop={handleDrop}
            className={`
              relative rounded-lg border border-dashed p-8 text-center transition-colors
              ${isDragging
                ? 'border-foreground/40 bg-muted/50'
                : 'border-border hover:border-foreground/30 hover:bg-muted/30'
              }
            `}
          >
            <FolderOpen className={`h-6 w-6 mx-auto mb-3 ${isDragging ? 'text-foreground' : 'text-faint'}`} />
            <p className={`text-sm font-medium ${isDragging ? 'text-foreground' : 'text-muted-foreground'}`}>
              {isDragging ? 'Release to add the folder' : 'Drop a screenshot folder here'}
            </p>
            <p className="text-xs text-faint mt-1">
              Folder structure: /en/*.png, /fr/*.png, /de/*.png
            </p>
          </div>

          {queue.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-medium">Upload queue</h5>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearQueue}
                  disabled={isUploading}
                  className="h-7 text-xs text-muted-foreground hover:text-destructive"
                >
                  Clear all
                </Button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {queue.map(({ locale, files, status }) => {
                  const localeInfo = ASC_LOCALES.find(l => l.code === locale)
                  const localization = versionLocalizations.find(l => l.locale === locale)

                  return (
                    <div
                      key={locale}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        status === 'done' ? 'bg-positive/5 border-positive/20' :
                        status === 'error' ? 'bg-destructive/5 border-destructive/30' :
                        status === 'uploading' ? 'bg-muted/50 border-foreground/20' :
                        'bg-muted/30 border-border'
                      }`}
                    >
                      <span className="text-xl">{localeInfo?.flag || '🌐'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{localeInfo?.name || locale}</span>
                          <span className="keycap">{locale}</span>
                          <Badge variant="outline" className="text-xs tabular-nums">
                            {files.length} file{files.length !== 1 ? 's' : ''}
                          </Badge>
                          {!localization && (
                            <Badge variant="destructive" className="text-xs">
                              Not in version
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-faint truncate mt-0.5">
                          {files.map(f => f.name).join(', ')}
                        </p>
                      </div>
                      {status === 'uploading' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-faint" />
                      ) : status === 'done' ? (
                        <CheckCircle2 className="h-4 w-4 text-positive" />
                      ) : status === 'error' ? (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      ) : (
                        <button
                          onClick={() => removeFromQueue(locale)}
                          className="p-1 rounded hover:bg-muted transition-colors"
                        >
                          <X className="h-4 w-4 text-faint" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {isUploading && progress.total > 0 && (
                <div className="p-3 rounded-lg bg-muted/30 border border-border">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-foreground font-medium">Uploading</span>
                    <span className="text-muted-foreground tabular-nums">{progress.current}/{progress.total}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-highlight transition-[width] duration-300"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-faint mt-2 truncate">{progress.currentFile}</p>
                </div>
              )}

              <Button
                onClick={onUpload}
                disabled={isUploading || !placementGroup || queue.every(q => q.status === 'done')}
                variant="highlight"
                className="w-full h-10"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {queue.reduce((sum, q) => sum + q.files.length, 0)} screenshots
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
