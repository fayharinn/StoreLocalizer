import { Store } from 'lucide-react'

export default function HeroSection({ apps, selectedVersion, versionLocalizations }) {
  return (
    <div className="relative overflow-hidden rounded-2xl gradient-card border border-border/50 p-8 shadow-xl">
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
      <div className="relative flex flex-col md:flex-row md:items-center gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg">
              <Store className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">App Store Connect</h1>
              <p className="text-sm text-muted-foreground">Translate your app metadata</p>
            </div>
          </div>
          <p className="text-muted-foreground max-w-xl">
            Connect to Apple's App Store Connect API to automatically translate your app descriptions,
            what's new, keywords, and promotional text across all locales.
          </p>
        </div>
        {apps.length > 0 && (
          <div className="flex gap-4">
            <div className="text-center px-4 py-3 rounded-xl bg-background/50 border border-border/50">
              <div className="text-2xl font-bold text-blue-500">{apps.length}</div>
              <div className="text-xs text-muted-foreground">Apps</div>
            </div>
            {selectedVersion && (
              <div className="text-center px-4 py-3 rounded-xl bg-background/50 border border-border/50">
                <div className="text-2xl font-bold text-emerald-500">{versionLocalizations.length}</div>
                <div className="text-xs text-muted-foreground">Locales</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
