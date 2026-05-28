# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

Package manager is **bun** (see `bun.lock`); `npm` also works since `package-lock.json` is committed.

- `bun run dev` — Vite dev server at http://localhost:5173 with API proxies enabled
- `bun run build` — production build to `dist/`
- `bun run preview` — serve the built `dist/`
- `bun run lint` — ESLint; `bun run lint -- --fix` to autofix
- `bun run tauri:dev` / `bun run tauri:build` — desktop wrapper (Rust toolchain required)
- `bun run deploy` — build + push `dist/` to GitHub Pages
- `bun run deploy:cloudflare` — build + Cloudflare Pages deploy
- `wrangler deploy -c wrangler.proxy.jsonc` — deploy the API proxy Worker (separate from the site)

No test harness is configured. AGENTS.md suggests Vitest + Testing Library if tests are added; verify manually by exercising `.xcstrings` parse, translation queue, App Store Connect auth, and export paths.

## Architecture

### Single-page React app with five tabs

`src/App.jsx` is the only route. It renders one of five "pages" based on `appState.activePage` (persisted to `localStorage`):

- `xcstrings` — `XCStringsPage` (translate `.xcstrings` files locally)
- `appstore` — `components/appstore/` (App Store Connect integration)
- `googleplay` — `components/googleplay/` (Google Play Console integration)
- `screenshots` — `components/ScreenshotMaker/` (device-frame screenshot generator)
- `subscriptions` — `SubscriptionManager` (GDP-adjusted IAP pricing)

The `screenshots` page is kept mounted but hidden when inactive (Three.js renderer state is expensive to rebuild); all other pages unmount when inactive.

### State lives in top-level hooks, props flow down

`App.jsx` instantiates four hooks and threads their return values down as props. **There is no React context for app state, no Redux, no Zustand** — adding new top-level state means adding to or creating a hook here:

- `useAppState` (`src/hooks/useAppState.js`) — active page, AI provider config, ASC/GP credentials, Astro config. Persists most things to `localStorage`; **private keys (.p8) are deliberately not persisted in plaintext** (see Security below).
- `useTranslation` — `.xcstrings` file state, parsing, translation queue, protected words, logs, progress.
- `useTranslationEditor` — editor UI state (filter, search, pagination, edit dialog) built on top of `useTranslation`'s data.
- `useScreenshotData` — derives a `localizationPayload` from `xcstringsData` for the screenshot generator.

`useAppStoreConnect` and `useGooglePlayConnect` are page-local (instantiated inside `components/appstore/index.jsx` and `components/googleplay/index.jsx`), not shared.

### Service layer separates API/network from UI

`src/services/` holds all external calls; components should never `fetch` directly:

- `appStoreConnectService.js` — JWT signing with `jose` + every ASC endpoint (apps, versions, localizations, screenshots, ASO). Exports `ASC_LOCALES` (canonical locale list). Token is ES256-signed client-side and cached in `sessionStorage` with credential hash for ~19 min.
- `googlePlayService.js` — OAuth2 JWT-bearer for service accounts, edit-session workflow (create edit → mutate → commit).
- `translationService.js` — multi-provider AI translation (OpenAI, Azure OpenAI, AWS Bedrock, GitHub Models, …). Exports `PROVIDERS` registry, `SUPPORTED_LANGUAGES`, `translateStrings` (batched + concurrent: `DEFAULT_TEXTS_PER_BATCH=5`, `DEFAULT_CONCURRENT_REQUESTS=10`).
- `subscriptionService.js` / `subscriptionPricingService.js` / `subscriptionTranslationService.js` — IAP CRUD, GDP-adjusted price recommendations, localized display name translation.
- `astroService.js` — JSON-RPC client to a local Astro MCP server on `127.0.0.1:8089`; switches between direct fetch (Tauri) and the Vite proxy (`/api/astro`).

When adding a new ASC or GP endpoint, extend the service module and surface it through the corresponding hook — don't call from a component.

### `.xcstrings` parsing is the core data flow

`src/utils/xcstringsParser.js` exports `parseXCStrings`, `generateXCStrings`, `getTranslationStats`, `getMissingTranslations`, `addTranslation`. The parsed object is the source of truth that flows through `useTranslation` → `useTranslationEditor` → UI, and through `useScreenshotData` → `ScreenshotMaker` as a `localizationPayload`.

### CORS proxy is mandatory — three deployment modes

App Store Connect and Google Play APIs both block browser CORS, so all calls go through a proxy. Three modes, switched automatically:

1. **Dev** — Vite proxies in `vite.config.js`: `/api/appstoreconnect/*` → `api.appstoreconnect.apple.com`, `/api/googleplay/androidpublisher/*` → `androidpublisher.googleapis.com`, plus `/api/itunes` and `/api/astro`. There is also a custom Vite middleware (`playstoreScraperPlugin`) that fetches the Play Store HTML for developer-ID app discovery (`/api/googleplay/playstore/dev/:id`).
2. **Production web** — Cloudflare Worker in `worker/index.js` (deployed via `wrangler.proxy.jsonc`). Same path routing as dev, plus origin allowlist (`localizer.fayhe.com`, `xcstrings-localizer.pages.dev`). Site reads `VITE_ASC_PROXY_URL` / `VITE_GP_PROXY_URL` and prepends them; if unset, falls back to the relative `/api/*` paths (so dev keeps working).
3. **Tauri desktop** — `src-tauri/` wraps the Vite build; ASC/GP calls can go direct (no CORS in a webview), but the same proxy paths still work.

When changing proxy behavior, update **both** `vite.config.js` (dev) and `worker/index.js` (prod) to keep them in sync.

### Security: `.p8` key encryption flow

App Store Connect `.p8` private keys are encrypted in the browser with AES-GCM (PBKDF2-derived key, 100k iterations) via `src/utils/crypto.js` and stored in `localStorage`. The decrypted key only exists in memory; on reload, the user re-enters their password to unlock. The signed JWT itself is cached in `sessionStorage` for ~19 min (ASC token lifetime is 20 min) keyed by `keyId:issuerId` hash, so reloads inside that window skip the password prompt. `useAppState.js` deliberately strips `privateKey` before writing `ASC_CONFIG_KEY` to localStorage.

### shadcn/ui setup

`components.json` is configured (style: new-york, base color: zinc, alias `@/`). Components live in `src/components/ui/`. To add a new shadcn component use the CLI; do not hand-roll.

### Tauri desktop wrapper

`src-tauri/` is a thin Tauri 2 shell that loads the Vite build. `beforeDevCommand` / `beforeBuildCommand` are wired to `bun run dev` / `bun run build`. Tauri-specific code paths check `'__TAURI__' in window` (see `astroService.js`).

## Conventions (per AGENTS.md)

- React 19, ES modules, functional components + hooks
- PascalCase components, camelCase hooks/utilities, kebab-case assets
- 2-space indent, single quotes
- Keep side effects in hooks/services; components stay presentational
- ESLint rule of note: `no-unused-vars` ignores identifiers matching `^[A-Z_]` (so `_unused` const is flagged, but `UNUSED` isn't)

## Environment variables

All client vars must be prefixed `VITE_` to be exposed:

- `VITE_ASC_PROXY_URL` — App Store Connect proxy Worker URL (production)
- `VITE_GP_PROXY_URL` — Google Play proxy Worker URL (production; same Worker as ASC)
- `VITE_BASE_PATH` — Vite `base` (set to `/xcstrings-localizer/` for GitHub Pages, defaults to `/`)

When the proxy URL changes, also update the `ALLOWED_ORIGINS` array in `worker/index.js`.
