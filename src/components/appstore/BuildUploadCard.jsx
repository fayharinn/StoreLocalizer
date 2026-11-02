import { useState } from 'react'
import { Upload, Loader2, RefreshCw, ExternalLink, AlertCircle, FileArchive, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const PLATFORM_LABELS = { IOS: 'iOS', TV_OS: 'tvOS', VISION_OS: 'visionOS', MAC_OS: 'macOS' }

const STAGE_LABELS = {
  creating: 'Creating the upload',
  uploading: 'Sending the .ipa',
  committing: 'Handing it to Apple',
}

function formatBytes(bytes) {
  if (!bytes) return '0 MB'
  const mb = bytes / (1024 * 1024)
  return mb >= 1024 ? `${(mb / 1024).toFixed(2)} GB` : `${mb.toFixed(mb < 10 ? 1 : 0)} MB`
}

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function UploadState({ upload, tracked }) {
  if (upload.state === 'COMPLETE') return <Badge variant="success">Ready</Badge>
  if (upload.state === 'FAILED') return <Badge className="border-transparent bg-destructive/10 text-destructive">Failed</Badge>
  if (upload.state === 'PROCESSING') {
    return (
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {tracked && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Processing
      </span>
    )
  }
  return <span className="text-xs text-faint">Waiting for the file</span>
}

export default function BuildUploadCard({ selectedApp, buildHook }) {
  const [isDragging, setIsDragging] = useState(false)
  const {
    dropped, isReading, isUploading, progress, uploads, isLoadingUploads, trackedId,
    bundleMismatch, handleFile, clearDropped, startUpload, refreshUploads,
  } = buildHook

  const onDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    handleFile(e.dataTransfer.files?.[0])
  }

  const percent = progress?.total ? Math.round((progress.sent / progress.total) * 100) : 0
  const testflightUrl = `https://appstoreconnect.apple.com/apps/${selectedApp.id}/testflight/ios`

  return (
    <Card id="asc-builds" className="scroll-mt-40">
      <CardHeader>
        <CardTitle className="text-base">Upload a build</CardTitle>
        <CardDescription>
          Drop an .ipa built for {selectedApp.name}. It goes straight to App Store Connect, then to TestFlight once Apple has processed it.
        </CardDescription>
        <CardAction>
          <Button variant="outline" size="sm" asChild>
            <a href={testflightUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
              TestFlight
            </a>
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent className="space-y-6">
        {!dropped?.info ? (
          <>
            <input
              id="asc-ipa-input"
              type="file"
              accept=".ipa"
              className="hidden"
              onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = '' }}
            />
            <label
              htmlFor="asc-ipa-input"
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
              onDrop={onDrop}
              className={`flex h-40 cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed transition-colors duration-150 ${
                isDragging ? 'border-foreground/40 bg-accent' : 'border-border hover:border-foreground/25 hover:bg-secondary/40'
              }`}
            >
              {isReading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-faint" />
                  <span className="text-sm">Reading Info.plist</span>
                </>
              ) : (
                <>
                  <Upload className={`h-5 w-5 ${isDragging ? 'text-foreground' : 'text-faint'}`} />
                  <span className="text-sm">
                    {isDragging ? 'Drop the build here' : <>Drop an <span className="font-mono">.ipa</span> or click to choose</>}
                  </span>
                  <span className="text-xs text-faint">Version and build number are read from the file</span>
                </>
              )}
            </label>
            {dropped?.error && (
              <p className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {dropped.error}
              </p>
            )}
          </>
        ) : (
          <div className="space-y-4 rounded-lg border border-border bg-secondary/30 p-4">
            <div className="flex items-start gap-3">
              <FileArchive className="mt-0.5 h-4 w-4 text-faint" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-[13px]">{dropped.file.name}</p>
                <p className="text-xs text-faint tabular-nums">{formatBytes(dropped.file.size)}</p>
              </div>
              {!isUploading && (
                <Button variant="ghost" size="icon-sm" onClick={clearDropped} title="Choose another file">
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-4">
              <div className="col-span-2">
                <dt className="text-xs text-faint">Bundle ID</dt>
                <dd className={`mt-1 truncate font-mono text-[13px] ${bundleMismatch ? 'text-destructive' : ''}`}>{dropped.info.bundleId || 'Unknown'}</dd>
              </div>
              <div>
                <dt className="text-xs text-faint">Version</dt>
                <dd className="mt-1 font-mono text-[13px] tabular-nums">{dropped.info.version} <span className="text-faint">({dropped.info.build})</span></dd>
              </div>
              <div>
                <dt className="text-xs text-faint">Platform</dt>
                <dd className="mt-1 flex items-center gap-2">
                  <span className="keycap">{PLATFORM_LABELS[dropped.info.platform] || dropped.info.platform}</span>
                  {dropped.info.minimumOS && <span className="text-xs text-faint">{dropped.info.minimumOS}+</span>}
                </dd>
              </div>
            </dl>

            {bundleMismatch && (
              <p className="flex items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                This build is for {dropped.info.bundleId}, but the selected app is {selectedApp.bundleId}. Pick the matching app first.
              </p>
            )}

            {progress ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{STAGE_LABELS[progress.stage]}</span>
                  <span className="font-mono text-xs tabular-nums text-muted-foreground">
                    {formatBytes(progress.sent)} of {formatBytes(progress.total)}
                  </span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full rounded-full bg-highlight transition-[width] duration-300 ease-out" style={{ width: `${percent}%` }} />
                </div>
              </div>
            ) : (
              <Button variant="highlight" onClick={startUpload} disabled={isUploading || bundleMismatch} className="w-full sm:w-auto">
                <Upload className="h-4 w-4" />
                Upload to App Store Connect
              </Button>
            )}
          </div>
        )}

        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs text-faint">Recent uploads</h3>
            <Button variant="ghost" size="icon-sm" onClick={refreshUploads} disabled={isLoadingUploads} title="Refresh">
              <RefreshCw className={`h-3.5 w-3.5 ${isLoadingUploads ? 'animate-spin' : ''}`} />
            </Button>
          </div>
          {uploads.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-faint">
              {isLoadingUploads ? 'Loading uploads' : 'No build uploaded through the API yet'}
            </p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {uploads.map((upload) => (
                <li key={upload.id} className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[13px] tabular-nums">{upload.version} <span className="text-faint">({upload.build})</span></span>
                    {upload.platform && <span className="keycap">{PLATFORM_LABELS[upload.platform] || upload.platform}</span>}
                    <span className="flex-1 text-xs text-faint">{formatDate(upload.uploadedDate || upload.createdDate)}</span>
                    <UploadState upload={upload} tracked={upload.id === trackedId} />
                  </div>
                  {upload.state === 'FAILED' && upload.errors.length > 0 && (
                    <ul className="mt-2 space-y-1">
                      {upload.errors.map((err, i) => (
                        <li key={i} className="text-xs text-destructive">
                          {err.code && <span className="font-mono">{err.code} </span>}
                          {err.description}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
