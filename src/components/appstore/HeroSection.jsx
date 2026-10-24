import { Store } from 'lucide-react'

export default function HeroSection({ apps, selectedVersion, versionLocalizations }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-sm">
        <Store className="h-5 w-5 text-white" />
      </div>
      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-semibold leading-tight tracking-tight text-foreground">App Store Connect</h1>
        <p className="text-sm text-muted-foreground">
          Translate and manage your listing, media, events and product pages.
        </p>
      </div>
      {apps.length > 0 && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1">
            <span className="font-semibold text-foreground">{apps.length}</span> {apps.length === 1 ? 'app' : 'apps'}
          </span>
          {selectedVersion && (
            <span className="rounded-full border border-border/60 bg-muted/40 px-2.5 py-1">
              <span className="font-semibold text-foreground">{versionLocalizations.length}</span> locales
            </span>
          )}
        </div>
      )}
    </div>
  )
}
