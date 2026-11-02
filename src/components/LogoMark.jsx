// StoreLocalizer mark: an app tile with three lines of copy, one highlighted
// like a proof mark, the last aligned right for languages read right to left.
// Brand colors are fixed so the mark looks the same in both themes.
export function LogoMark({ className = 'h-7 w-7' }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className={className}>
      <rect width="64" height="64" rx="14" fill="#141415" />
      <rect x="1" y="1" width="62" height="62" rx="13" stroke="#ededed" strokeOpacity="0.16" strokeWidth="2" className="hidden dark:block" />
      <rect x="14" y="15" width="30" height="7" rx="3.5" fill="#ededed" />
      <rect x="10" y="26.5" width="44" height="11" rx="3.5" fill="#f5c542" />
      <rect x="15" y="30" width="22" height="4" rx="2" fill="#141415" />
      <rect x="20" y="42" width="30" height="7" rx="3.5" fill="#ededed" />
    </svg>
  )
}
