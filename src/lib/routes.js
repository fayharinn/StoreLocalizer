// One URL per page so the browser's back and forward buttons, reloads and
// shared links work. "/" is the public landing page; the app lives under the
// page paths below. Hosting falls back to index.html for every path
// (public/_redirects, and Vite's dev server does the same).

export const PAGE_PATHS = {
  home: 'home',
  appstore: 'appstoreconnect',
  googleplay: 'googleplay',
  screenshots: 'screenshots',
  agent: 'agent',
  subscriptions: 'subscriptions',
  xcstrings: 'xcstrings',
}

export const PAGE_TITLES = {
  home: 'Home',
  appstore: 'App Store Connect',
  googleplay: 'Google Play',
  screenshots: 'Screenshots',
  agent: 'Agent',
  subscriptions: 'Subscriptions',
  xcstrings: 'XCStrings',
}

// Ends with "/" ("/" by default, "/xcstrings-localizer/" on GitHub Pages)
const BASE = import.meta.env.BASE_URL || '/'

// The desktop app has no landing page: it opens straight on Home
export const isDesktopApp = () => typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window)

export function pathFor(page) {
  return page ? `${BASE}${PAGE_PATHS[page] || PAGE_PATHS.home}` : BASE
}

// null means the landing page; an unknown path falls back to Home
export function pageFromPath(pathname) {
  const rest = pathname.startsWith(BASE) ? pathname.slice(BASE.length) : pathname.replace(/^\//, '')
  const segment = rest.split('/')[0].toLowerCase()
  if (!segment || segment === 'index.html') return isDesktopApp() ? 'home' : null
  const page = Object.keys(PAGE_PATHS).find(key => PAGE_PATHS[key] === segment)
  return page || 'home'
}
