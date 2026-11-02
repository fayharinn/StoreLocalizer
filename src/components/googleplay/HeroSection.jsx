export default function HeroSection({ listings }) {
  return (
    <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
      <div className="max-w-xl space-y-1">
        <h1 className="text-[28px] leading-9 font-medium tracking-[-0.01em] text-foreground">Google Play Console</h1>
        <p className="text-sm text-muted-foreground">
          Translate your app title, descriptions and other store listing content across every
          locale through the Google Play Developer API.
        </p>
      </div>
      {listings.length > 0 && (
        <div className="flex gap-8">
          <div>
            <div className="text-2xl font-medium tabular-nums text-foreground">{listings.length}</div>
            <div className="text-xs text-faint">Listings</div>
          </div>
        </div>
      )}
    </header>
  )
}
