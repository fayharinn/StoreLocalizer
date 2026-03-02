import { useCallback } from 'react'
import { Toaster } from 'sonner'
import WelcomeScreen from './components/WelcomeScreen'
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from './components/AppSidebar'
import AppStoreConnect from './components/appstore'
import GooglePlayConnect from './components/GooglePlayConnect'
import ScreenshotMaker from './components/ScreenshotMaker'
import SubscriptionManager from './components/SubscriptionManager'
import { XCStringsPage } from './components/XCStringsPage'
import { ThemeToggle } from './components/ThemeToggle'
import { useAppState } from './hooks/useAppState'
import { useTranslation } from './hooks/useTranslation'
import { useTranslationEditor } from './hooks/useTranslationEditor'
import { useScreenshotData } from './hooks/useScreenshotData'

function App() {
  const translation = useTranslation()

  const appState = useAppState(translation.addLog)

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

  if (appState.showWelcome) {
    return <WelcomeScreen onComplete={appState.handleWelcomeComplete} />
  }

  return (
    <div className="min-h-svh bg-background">
      <Toaster position="top-right" richColors closeButton />
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
        />
        <SidebarInset>
          <header className="sticky top-0 z-20 flex h-14 items-center gap-4 border-b border-border/50 bg-background/80 px-6 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger className="text-muted-foreground hover:text-foreground transition-colors" />
            <div className="ml-auto flex items-center gap-3">
              <ThemeToggle variant="compact" />
            </div>
          </header>

          <main className="flex-1 p-6 md:p-8 lg:p-10">
            <div className={`mx-auto space-y-8 ${appState.activePage === 'screenshots' ? 'w-full max-w-none' : 'max-w-6xl'}`}>
              {appState.activePage === 'appstore' && (
                <AppStoreConnect
                  credentials={appState.ascCredentials}
                  onCredentialsChange={appState.setAscCredentials}
                  aiConfig={appState.providerConfig}
                />
              )}

              {appState.activePage === 'googleplay' && (
                <GooglePlayConnect
                  credentials={appState.gpCredentials}
                  onCredentialsChange={appState.setGpCredentials}
                  aiConfig={appState.providerConfig}
                />
              )}

              <div className={appState.activePage === 'screenshots' ? 'space-y-6' : 'hidden'}>
                <ScreenshotMaker
                  localizationPayload={screenshot.screenshotLocalizationPayload}
                  aiConfig={appState.providerConfig}
                  active={appState.activePage === 'screenshots'}
                />
              </div>

              {appState.activePage === 'subscriptions' && (
                <SubscriptionManager
                  aiConfig={appState.providerConfig}
                  ascCredentials={appState.ascCredentials}
                  onCredentialsChange={appState.setAscCredentials}
                />
              )}

              {appState.activePage === 'xcstrings' && (
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
              )}
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}

export default App
