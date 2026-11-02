import { useCallback, useState, lazy, Suspense } from 'react'
import { Toaster } from 'sonner'
import { Loader2 } from 'lucide-react'
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from './components/AppSidebar'
import { ThemeToggle } from './components/ThemeToggle'
import { useTheme } from './components/ThemeProvider'
import DemoShowcase from './components/DemoShowcase'
import { useAppState } from './hooks/useAppState'
import { useTranslation } from './hooks/useTranslation'
import { useTranslationEditor } from './hooks/useTranslationEditor'
import { useScreenshotData } from './hooks/useScreenshotData'
import useAccounts from './hooks/useAccounts'

// A failed chunk fetch (stale index.html right after a deploy) would otherwise
// crash the whole tree into a black screen — reload once to pick up fresh assets.
function lazyRetry(importFn, key) {
  return lazy(() =>
    importFn()
      .then((m) => {
        sessionStorage.removeItem(`lazy-retry:${key}`)
        return m
      })
      .catch((err) => {
        if (!sessionStorage.getItem(`lazy-retry:${key}`)) {
          sessionStorage.setItem(`lazy-retry:${key}`, '1')
          window.location.reload()
          return new Promise(() => {}) // keep the fallback up until the reload happens
        }
        throw err
      })
  )
}

const WelcomeScreen = lazyRetry(() => import('./components/WelcomeScreen'), 'welcome')
const HomePage = lazyRetry(
  () => import('./components/HomePage').then((m) => ({ default: m.HomePage })),
  'home'
)
const AppStoreConnect = lazyRetry(() => import('./components/appstore'), 'appstore')
const GooglePlayConnect = lazyRetry(() => import('./components/googleplay'), 'googleplay')
const ScreenshotMaker = lazyRetry(() => import('./components/ScreenshotMaker'), 'screenshots')
const SubscriptionManager = lazyRetry(() => import('./components/SubscriptionManager'), 'subscription')
const AgentPage = lazyRetry(() => import('./components/agent'), 'agent')
const XCStringsPage = lazyRetry(
  () => import('./components/XCStringsPage').then((m) => ({ default: m.XCStringsPage })),
  'xcstrings'
)

function PageLoader() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  )
}

function App() {
  const { resolvedTheme } = useTheme()
  const translation = useTranslation()

  const appState = useAppState(translation.addLog)

  const accounts = useAccounts({
    ascCredentials: appState.ascCredentials,
    setAscCredentials: appState.setAscCredentials,
    gpCredentials: appState.gpCredentials,
    setGpCredentials: appState.setGpCredentials,
  })
  // Store pages start over when another account is picked in the sidebar
  const ascAccountKey = accounts.activeAscId || 'unsaved'
  const gpAccountKey = accounts.activeGpId || 'unsaved'

  const editor = useTranslationEditor(
    translation.xcstringsData,
    translation.setXcstringsData,
    translation.stats,
    translation.setStats,
    translation.addLog
  )

  const screenshot = useScreenshotData(
    translation.xcstringsData,
    translation.stats
  )

  const handleTranslate = useCallback(() => {
    translation.handleTranslate(appState.providerConfig, appState.currentApiKey, appState.currentModel)
  }, [translation.handleTranslate, appState.providerConfig, appState.currentApiKey, appState.currentModel])

  // Mount ScreenshotMaker lazily on first visit (it pulls in three.js), keep it mounted afterwards
  const [screenshotsVisited, setScreenshotsVisited] = useState(appState.activePage === 'screenshots')
  if (appState.activePage === 'screenshots' && !screenshotsVisited) {
    setScreenshotsVisited(true)
  }

  if (appState.showWelcome) {
    return (
      <Suspense fallback={<div className="min-h-svh bg-background" />}>
        <WelcomeScreen onComplete={appState.handleWelcomeComplete} />
      </Suspense>
    )
  }

  return (
    <div className="min-h-svh bg-background">
      <Toaster
        position="top-right"
        theme={resolvedTheme}
        closeButton
        style={{
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
        }}
      />
      {/* Feature-dialog showcase for README screenshots — dev only (?demo=…) */}
      {import.meta.env.DEV && <DemoShowcase />}
      <SidebarProvider>
        <AppSidebar
          activePage={appState.activePage}
          onPageChange={appState.setActivePage}
          providerConfig={appState.providerConfig}
          onProviderConfigChange={appState.setProviderConfig}
          ascCredentials={appState.ascCredentials}
          onAscCredentialsChange={appState.setAscCredentials}
          gpCredentials={appState.gpCredentials}
          onGpCredentialsChange={appState.setGpCredentials}
          astroConfig={appState.astroConfig}
          onAstroConfigChange={appState.setAstroConfig}
          appCompeteConfig={appState.appCompeteConfig}
          onAppCompeteConfigChange={appState.setAppCompeteConfig}
          accounts={accounts}
        />
        <SidebarInset>
          <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-border bg-background px-6">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
            <div className="ml-auto flex items-center gap-3">
              <ThemeToggle variant="compact" />
            </div>
          </header>

          <main className={`min-h-0 ${
            appState.activePage === 'screenshots'
              ? 'flex-1'
              : appState.activePage === 'agent'
                ? 'flex-none h-[calc(100svh-3.5rem)] md:h-[calc(100svh-4.5rem)] overflow-hidden p-3 md:p-4'
                : 'flex-1 p-4 md:p-6 lg:p-8'
          }`}>
            <div className={`mx-auto ${
              appState.activePage === 'screenshots'
                ? 'w-full max-w-none h-full'
                : appState.activePage === 'agent'
                  ? 'w-full max-w-none h-full'
                  : 'max-w-7xl space-y-6'
            }`}>
              {appState.activePage === 'home' && (
                <Suspense fallback={<PageLoader />}>
                  <HomePage
                    onPageChange={appState.setActivePage}
                    ascCredentials={appState.ascCredentials}
                    gpCredentials={appState.gpCredentials}
                    providerConfig={appState.providerConfig}
                  />
                </Suspense>
              )}

              {appState.activePage === 'appstore' && (
                <Suspense fallback={<PageLoader />}>
                  <AppStoreConnect
                    key={ascAccountKey}
                    credentials={appState.ascCredentials}
                    onCredentialsChange={appState.setAscCredentials}
                    aiConfig={appState.providerConfig}
                    astroConfig={appState.astroConfig}
                    appCompeteConfig={appState.appCompeteConfig}
                  />
                </Suspense>
              )}

              {appState.activePage === 'googleplay' && (
                <Suspense fallback={<PageLoader />}>
                  <GooglePlayConnect
                    key={gpAccountKey}
                    credentials={appState.gpCredentials}
                    onCredentialsChange={appState.setGpCredentials}
                    aiConfig={appState.providerConfig}
                  />
                </Suspense>
              )}

              {screenshotsVisited && (
                <div className={appState.activePage === 'screenshots' ? 'h-full' : 'hidden'}>
                  <Suspense fallback={<PageLoader />}>
                    <ScreenshotMaker
                      localizationPayload={screenshot.screenshotLocalizationPayload}
                      aiConfig={appState.providerConfig}
                      active={appState.activePage === 'screenshots'}
                    />
                  </Suspense>
                </div>
              )}

              {appState.activePage === 'subscriptions' && (
                <Suspense fallback={<PageLoader />}>
                  <SubscriptionManager
                    key={ascAccountKey}
                    aiConfig={appState.providerConfig}
                    ascCredentials={appState.ascCredentials}
                    onCredentialsChange={appState.setAscCredentials}
                  />
                </Suspense>
              )}

              {appState.activePage === 'agent' && (
                <Suspense fallback={<PageLoader />}>
                  <AgentPage
                    aiConfig={appState.providerConfig}
                    ascCredentials={appState.ascCredentials}
                    onAscCredentialsChange={appState.setAscCredentials}
                    gpCredentials={appState.gpCredentials}
                    appCompeteConfig={appState.appCompeteConfig}
                    xcstringsData={translation.xcstringsData}
                    fileName={translation.fileName}
                  />
                </Suspense>
              )}

              {appState.activePage === 'xcstrings' && (
                <Suspense fallback={<PageLoader />}>
                  <XCStringsPage
                    providerConfig={appState.providerConfig}
                    currentApiKey={appState.currentApiKey}
                    currentModel={appState.currentModel}
                    isTesting={appState.isTesting}
                    testResult={appState.testResult}
                    handleTestConnection={appState.handleTestConnection}
                    concurrency={translation.concurrency}
                    setConcurrency={translation.setConcurrency}
                    batchSize={translation.batchSize}
                    setBatchSize={translation.setBatchSize}
                    protectedWords={translation.protectedWords}
                    newProtectedWord={translation.newProtectedWord}
                    setNewProtectedWord={translation.setNewProtectedWord}
                    addProtectedWord={translation.addProtectedWord}
                    removeProtectedWord={translation.removeProtectedWord}
                    xcstringsData={translation.xcstringsData}
                    fileName={translation.fileName}
                    stats={translation.stats}
                    selectedLanguages={translation.selectedLanguages}
                    isTranslating={translation.isTranslating}
                    progress={translation.progress}
                    progressPercent={translation.progressPercent}
                    logs={translation.logs}
                    isDragging={translation.isDragging}
                    languageSearch={translation.languageSearch}
                    setLanguageSearch={translation.setLanguageSearch}
                    handleFileUpload={translation.handleFileUpload}
                    handleDragOver={translation.handleDragOver}
                    handleDragLeave={translation.handleDragLeave}
                    handleDrop={translation.handleDrop}
                    handleLanguageToggle={translation.handleLanguageToggle}
                    handleSelectAll={translation.handleSelectAll}
                    handleTranslate={handleTranslate}
                    handleSave={translation.handleSave}
                    editDialog={editor.editDialog}
                    setEditDialog={editor.setEditDialog}
                    filterLang={editor.filterLang}
                    setFilterLang={editor.setFilterLang}
                    searchQuery={editor.searchQuery}
                    setSearchQuery={editor.setSearchQuery}
                    currentPage={editor.currentPage}
                    setCurrentPage={editor.setCurrentPage}
                    availableLanguages={editor.availableLanguages}
                    filteredTranslations={editor.filteredTranslations}
                    paginatedTranslations={editor.paginatedTranslations}
                    totalPages={editor.totalPages}
                    truncateText={editor.truncateText}
                    handleEditTranslation={editor.handleEditTranslation}
                    handleSaveEdit={editor.handleSaveEdit}
                    ITEMS_PER_PAGE={editor.ITEMS_PER_PAGE}
                  />
                </Suspense>
              )}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}

export default App
