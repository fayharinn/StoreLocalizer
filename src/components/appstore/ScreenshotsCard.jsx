import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle2, AlertCircle, Loader2, ChevronDown, RefreshCw, Image, Smartphone, Tablet, Monitor, Watch, Upload, FolderOpen, X } from 'lucide-react'
import { ASC_LOCALES, SCREENSHOT_DISPLAY_TYPES } from '@/services/appStoreConnectService'

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
  isDraggingScreenshots,
  setIsDraggingScreenshots,
  screenshotUploadQueue,
  setScreenshotUploadQueue,
  isUploadingScreenshots,
  uploadProgress,
  selectedDisplayType,
  setSelectedDisplayType,
  deleteExistingScreenshots,
  setDeleteExistingScreenshots,
  handleScreenshotDrop,
  removeFromUploadQueue,
  formatFileSize,
  handleUploadScreenshots,
}) {
  return (
    <Card id="asc-screenshots" className="border-border/50 shadow-sm scroll-mt-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 shadow-lg">
              <Image className="h-5 w-5 text-white" />
            </div>
            <div>
              <CardTitle className="text-lg">Screenshots</CardTitle>
              <CardDescription>View screenshots for each locale</CardDescription>
            </div>
          </div>
          <Button
            onClick={handleLoadScreenshots}
            disabled={isLoadingScreenshots}
            variant={Object.keys(screenshotsByLocale).length > 0 ? "outline" : "default"}
            size="sm"
            className={Object.keys(screenshotsByLocale).length > 0 ? "h-9" : "h-9 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 border-0"}
          >
            {isLoadingScreenshots ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Loading...
              </>
            ) : Object.keys(screenshotsByLocale).length > 0 ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </>
            ) : (
              <>
                <Image className="h-4 w-4 mr-2" />
                Load Screenshots
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {Object.keys(screenshotsByLocale).length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Image className="h-10 w-10 mb-3 opacity-30" />
            <p className="font-medium">No screenshots loaded</p>
            <p className="text-sm mt-1">Click "Load Screenshots" to view all locale screenshots</p>
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
                  className="rounded-xl border border-border/50 overflow-hidden transition-all duration-200 hover:border-border"
                >
                  <div
                    className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => toggleScreenshotLocale(loc.locale)}
                  >
                    <span className="text-xl">{localeInfo?.flag || '🌐'}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{localeInfo?.name || loc.locale}</span>
                        {totalCount > 0 ? (
                          <Badge variant="outline" className="text-xs">
                            {totalCount} screenshot{totalCount !== 1 ? 's' : ''}
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-xs text-muted-foreground">
                            No screenshots
                          </Badge>
                        )}
                      </div>
                      {screenshotData?.sets?.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {screenshotData.sets.length} device type{screenshotData.sets.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>

                  {isExpanded && screenshotData && (
                    <div className="px-4 pb-4 pt-2 border-t border-border/50 bg-muted/20">
                      {screenshotData.error ? (
                        <div className="flex items-center gap-2 text-red-500 text-sm">
                          <AlertCircle className="h-4 w-4" />
                          <span>{screenshotData.error}</span>
                        </div>
                      ) : screenshotData.sets.length === 0 ? (
                        <p className="text-sm text-muted-foreground italic">No screenshot sets found</p>
                      ) : (
                        <div className="space-y-4">
                          {screenshotData.sets.map(set => {
                            const DeviceIcon = getDeviceIcon(set.displayType)
                            return (
                              <div key={set.id} className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <DeviceIcon className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">{set.displayInfo.name}</span>
                                  <span className="text-xs text-muted-foreground">({set.displayInfo.device})</span>
                                  <Badge variant="outline" className="text-xs ml-auto">
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
                                            className="h-32 w-auto rounded-lg border border-border/50 object-cover hover:border-primary/50 hover:scale-105 transition-all duration-200"
                                          />
                                        ) : (
                                          <div className="h-32 w-16 rounded-lg border border-border/50 bg-muted/50 flex items-center justify-center">
                                            <Image className="h-6 w-6 text-muted-foreground/50" />
                                          </div>
                                        )}
                                        <div className="absolute bottom-1 left-1 right-1 text-center">
                                          <span className="text-[10px] bg-black/60 text-white px-1.5 py-0.5 rounded">
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

        <div className="mt-6 pt-6 border-t border-border/50">
          <div className="flex items-center gap-3 mb-4">
            <Upload className="h-5 w-5 text-pink-500" />
            <div>
              <h4 className="font-medium text-sm">Upload Screenshots</h4>
              <p className="text-xs text-muted-foreground">Drag & drop a folder with language subfolders (en, fr, de...)</p>
            </div>
          </div>

          <div className="mb-4">
            <Label className="text-xs font-medium text-muted-foreground mb-2 block">Target Device</Label>
            <Select value={selectedDisplayType} onValueChange={setSelectedDisplayType}>
              <SelectTrigger className="h-9 bg-muted/30 border-border/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(SCREENSHOT_DISPLAY_TYPES).map(([key, info]) => (
                  <SelectItem key={key} value={key}>{info.name} - {info.device}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="mb-4 p-3 rounded-lg bg-muted/20 border border-border/30">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={deleteExistingScreenshots}
                onChange={(e) => setDeleteExistingScreenshots(e.target.checked)}
                className="h-4 w-4 rounded border-border text-pink-500 focus:ring-pink-500"
              />
              <span className="text-sm">Replace existing screenshots</span>
            </label>
            {deleteExistingScreenshots && (
              <p className="text-xs text-amber-500 flex items-center gap-1 mt-2">
                <AlertCircle className="h-3 w-3" />
                Existing screenshots for the selected device type will be deleted before uploading
              </p>
            )}
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDraggingScreenshots(true) }}
            onDragLeave={(e) => { e.preventDefault(); setIsDraggingScreenshots(false) }}
            onDrop={handleScreenshotDrop}
            className={`
              relative rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200
              ${isDraggingScreenshots
                ? 'border-pink-500 bg-pink-500/10 scale-[1.02]'
                : 'border-border/50 hover:border-pink-500/50 hover:bg-muted/30'
              }
            `}
          >
            <FolderOpen className={`h-10 w-10 mx-auto mb-3 ${isDraggingScreenshots ? 'text-pink-500' : 'text-muted-foreground/50'}`} />
            <p className={`font-medium ${isDraggingScreenshots ? 'text-pink-500' : 'text-muted-foreground'}`}>
              {isDraggingScreenshots ? 'Drop your folder here!' : 'Drop screenshot folder here'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Folder structure: /en/*.png, /fr/*.png, /de/*.png...
            </p>
          </div>

          {screenshotUploadQueue.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-sm font-medium">Upload Queue</h5>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setScreenshotUploadQueue([])}
                  disabled={isUploadingScreenshots}
                  className="h-7 text-xs text-muted-foreground hover:text-destructive"
                >
                  Clear all
                </Button>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto">
                {screenshotUploadQueue.map(({ locale, files, status }) => {
                  const localeInfo = ASC_LOCALES.find(l => l.code === locale)
                  const localization = versionLocalizations.find(l => l.locale === locale)

                  return (
                    <div
                      key={locale}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        status === 'done' ? 'bg-emerald-500/10 border-emerald-500/30' :
                        status === 'error' ? 'bg-red-500/10 border-red-500/30' :
                        status === 'uploading' ? 'bg-pink-500/10 border-pink-500/30' :
                        'bg-muted/30 border-border/50'
                      }`}
                    >
                      <span className="text-xl">{localeInfo?.flag || '🌐'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{localeInfo?.name || locale}</span>
                          <Badge variant="outline" className="text-xs">
                            {files.length} file{files.length !== 1 ? 's' : ''}
                          </Badge>
                          {!localization && (
                            <Badge variant="destructive" className="text-xs">
                              Not in version
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">
                          {files.map(f => f.name).join(', ')}
                        </p>
                      </div>
                      {status === 'uploading' ? (
                        <Loader2 className="h-4 w-4 animate-spin text-pink-500" />
                      ) : status === 'done' ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : status === 'error' ? (
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      ) : (
                        <button
                          onClick={() => removeFromUploadQueue(locale)}
                          className="p-1 rounded hover:bg-muted transition-colors"
                        >
                          <X className="h-4 w-4 text-muted-foreground" />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>

              {isUploadingScreenshots && uploadProgress.total > 0 && (
                <div className="p-3 rounded-lg bg-pink-500/10 border border-pink-500/30">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-pink-500 font-medium">Uploading...</span>
                    <span className="text-muted-foreground">{uploadProgress.current}/{uploadProgress.total}</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-pink-500 transition-all duration-300"
                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 truncate">{uploadProgress.currentFile}</p>
                </div>
              )}

              <Button
                onClick={handleUploadScreenshots}
                disabled={isUploadingScreenshots || screenshotUploadQueue.every(q => q.status === 'done')}
                className="w-full h-10 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 border-0"
              >
                {isUploadingScreenshots ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload {screenshotUploadQueue.reduce((sum, q) => sum + q.files.length, 0)} Screenshots
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
