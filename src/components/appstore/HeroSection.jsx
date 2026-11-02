export default function HeroSection({ apps, selectedVersion, versionLocalizations }) {
  return (
    <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
      <div className="min-w-0 flex-1">
        <h1 className="text-[28px] leading-9 font-medium tracking-[-0.01em] text-foreground">App Store Connect</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Translate and manage your listing, media, events and product pages.
        </p>
      </div>
      {apps.length > 0 && (
        <div className="flex items-end gap-8">
          <div>
            <div className="text-2xl font-medium tabular-nums text-foreground">{apps.length}</div>
            <div className="text-xs text-faint">{apps.length === 1 ? 'App' : 'Apps'}</div>
          </div>
          {selectedVersion && (
            <div>
              <div className="text-2xl font-medium tabular-nums text-foreground">{versionLocalizations.length}</div>
              <div className="text-xs text-faint">Locales</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
