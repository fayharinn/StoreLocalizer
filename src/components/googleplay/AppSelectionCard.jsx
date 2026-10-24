import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogClose, DialogTrigger } from '@/components/ui/dialog'
import { AppWindow, Store, AlertCircle, Loader2, RefreshCw, X, Save, ExternalLink } from 'lucide-react'

function AppIcon({ app, className = 'h-8 w-8' }) {
  return app?.icon ? (
    <img
      src={app.icon}
      alt=""
      className={`${className} shrink-0 rounded-lg object-cover`}
      onError={(e) => { e.target.style.display = 'none' }}
    />
  ) : (
    <div className={`${className} flex shrink-0 items-center justify-center rounded-lg bg-muted`}>
      <AppWindow className="h-4 w-4 text-muted-foreground" />
    </div>
  )
}

export default function AppSelectionCard({
  packageName,
  setPackageName,
  savedApps,
  onRemoveSavedApp,
  editId,
  isCreatingEdit,
  developerUrl,
  setDeveloperUrl,
  developerApps,
  isLoadingDevApps,
  handleCreateEdit,
  handleFetchDeveloperApps,
  handleSelectDeveloperApp,
  handleCommitEdit,
  handleDiscardEdit,
}) {
  return (
    <Card id="gp-app" className="border-border/50 shadow-sm card-hover scroll-mt-6">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
            <AppWindow className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <CardTitle className="text-lg">App Package</CardTitle>
            <CardDescription>Enter your app's package name to manage listings</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {editId && (() => {
          const current = savedApps.find((a) => a.packageName === packageName.trim())
          return (
            <div className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/30 p-3">
              <AppIcon app={current} className="h-10 w-10" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{current?.name || packageName}</p>
                <p className="truncate text-xs text-muted-foreground">{packageName}</p>
              </div>
            </div>
          )
        })()}

        {!editId && savedApps.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Recent apps — click to load</p>
            <div className="flex flex-wrap gap-2">
              {savedApps.map((app) => (
                <div
                  key={app.packageName}
                  className={`group flex items-center gap-2 rounded-xl border bg-card py-1.5 pl-1.5 pr-1 transition-colors hover:border-primary/50 hover:bg-muted/50 ${
                    packageName.trim() === app.packageName ? 'border-primary/60' : 'border-border/60'
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => handleCreateEdit(app.packageName)}
                    disabled={isCreatingEdit}
                    className="flex min-w-0 items-center gap-2 text-left disabled:opacity-60"
                    title={`Load ${app.packageName}`}
                  >
                    <AppIcon app={app} />
                    <span className="min-w-0 pr-1">
                      <span className="block max-w-[180px] truncate text-sm font-medium leading-tight">{app.name || app.packageName}</span>
                      {app.name && <span className="block max-w-[180px] truncate text-[11px] leading-tight text-muted-foreground">{app.packageName}</span>}
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveSavedApp(app.packageName)}
                    aria-label={`Forget ${app.name || app.packageName}`}
                    className="rounded-md p-1 text-muted-foreground/50 opacity-0 transition-opacity hover:bg-muted hover:text-foreground focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-3">
          <div className="flex-1 max-w-md relative">
            <Input
              placeholder="com.example.myapp"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
              disabled={!!editId}
              list="developer-apps-list"
            />
            {developerApps.length > 0 && (
              <datalist id="developer-apps-list">
                {developerApps.map((app) => (
                  <option key={app.packageName} value={app.packageName}>
                    {app.name}
                  </option>
                ))}
              </datalist>
            )}
          </div>

          {!editId && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="icon" title="Find from developer profile">
                  <Store className="h-4 w-4" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Find Apps from Developer Profile</DialogTitle>
                  <DialogDescription>
                    Enter your Google Play developer profile URL or ID to quickly find your apps.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="flex gap-2">
                    <Input
                      placeholder="Developer ID or profile URL"
                      value={developerUrl}
                      onChange={(e) => setDeveloperUrl(e.target.value)}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={handleFetchDeveloperApps}
                      disabled={isLoadingDevApps || !developerUrl.trim()}
                    >
                      {isLoadingDevApps ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <RefreshCw className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Example: https://play.google.com/store/apps/dev?id=123456789
                  </p>

                  {developerApps.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-medium">{developerApps.length} app(s) found:</p>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {developerApps.map((app) => (
                          <DialogClose key={app.packageName} asChild>
                            <button
                              onClick={() => handleSelectDeveloperApp(app)}
                              className={`flex items-center gap-3 w-full p-3 rounded-lg border text-left transition-all hover:border-primary/50 hover:bg-muted/50 ${
                                packageName === app.packageName ? 'border-primary bg-primary/5' : 'border-border'
                              }`}
                            >
                              {app.icon ? (
                                <img
                                  src={app.icon}
                                  alt={app.name}
                                  className="h-10 w-10 rounded-lg object-cover"
                                  onError={(e) => { e.target.style.display = 'none' }}
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
                                  <AppWindow className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium truncate">{app.name}</p>
                                <p className="text-xs text-muted-foreground truncate">{app.packageName}</p>
                              </div>
                              <a
                                href={app.storeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-2 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </button>
                          </DialogClose>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          )}

          {!editId ? (
            <Button
              onClick={handleCreateEdit}
              disabled={isCreatingEdit || !packageName.trim()}
            >
              {isCreatingEdit ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Loading...
                </>
              ) : 'Load App'}
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button onClick={handleCommitEdit} className="bg-green-600 hover:bg-green-700">
                <Save className="h-4 w-4 mr-2" />
                Commit Changes
              </Button>
              <Button variant="outline" onClick={handleDiscardEdit}>
                <X className="h-4 w-4 mr-2" />
                Discard
              </Button>
            </div>
          )}
        </div>
        {editId && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 text-amber-500 text-sm">
            <AlertCircle className="h-4 w-4" />
            Edit session active. Remember to commit your changes!
          </div>
        )}
      </CardContent>
    </Card>
  )
}
