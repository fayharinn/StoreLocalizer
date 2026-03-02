import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CheckCircle2, AlertCircle, Clock, Terminal, Image } from 'lucide-react'
import { ASC_LOCALES } from '@/services/appStoreConnectService'
import useAppStoreConnect from '@/hooks/useAppStoreConnect'
import HeroSection from './HeroSection'
import ConnectionCard from './ConnectionCard'
import AppVersionSelector from './AppVersionSelector'
import LocalizationsCard from './LocalizationsCard'
import ASOKeywordsCard from './ASOKeywordsCard'
import ScreenshotsCard from './ScreenshotsCard'
import TranslationCard from './TranslationCard'

export default function AppStoreConnect({ credentials, onCredentialsChange, aiConfig }) {
  const hook = useAppStoreConnect({ credentials, onCredentialsChange, aiConfig })

  return (
    <div className="space-y-8">
      <HeroSection
        apps={hook.apps}
        selectedVersion={hook.selectedVersion}
        versionLocalizations={hook.versionLocalizations}
      />

      <ConnectionCard
        credentials={hook.credentials}
        hasStoredKey={hook.hasStoredKey}
        unlockPassword={hook.unlockPassword}
        setUnlockPassword={hook.setUnlockPassword}
        isUnlocking={hook.isUnlocking}
        unlockError={hook.unlockError}
        setUnlockError={hook.setUnlockError}
        handleUnlockKey={hook.handleUnlockKey}
        isConnecting={hook.isConnecting}
        connectionStatus={hook.connectionStatus}
        canConnect={hook.canConnect}
        handleTestConnection={hook.handleTestConnection}
        apps={hook.apps}
        sessionTimeLeft={hook.sessionTimeLeft}
        formatTimeLeft={hook.formatTimeLeft}
      />

      {hook.apps.length > 0 && (
        <AppVersionSelector
          apps={hook.apps}
          selectedApp={hook.selectedApp}
          appPickerOpen={hook.appPickerOpen}
          setAppPickerOpen={hook.setAppPickerOpen}
          isLoadingApps={hook.isLoadingApps}
          versions={hook.versions}
          selectedVersion={hook.selectedVersion}
          isLoadingVersions={hook.isLoadingVersions}
          handleAppSelect={hook.handleAppSelect}
          handleVersionSelect={hook.handleVersionSelect}
          setCreateVersionDialog={hook.setCreateVersionDialog}
        />
      )}

      {hook.selectedVersion && (
        <LocalizationsCard
          selectedVersion={hook.selectedVersion}
          versionLocalizations={hook.versionLocalizations}
          appInfoLocalizations={hook.appInfoLocalizations}
          isLoadingLocalizations={hook.isLoadingLocalizations}
          localesNeedingCopy={hook.localesNeedingCopy}
          isCopyingFromPrevious={hook.isCopyingFromPrevious}
          handleCopyFromPreviousVersion={hook.handleCopyFromPreviousVersion}
          handleEditLocalization={hook.handleEditLocalization}
          isCopyingSupportUrl={hook.isCopyingSupportUrl}
          handleCopySupportUrl={hook.handleCopySupportUrl}
          sourceLocale={hook.sourceLocale}
          hasAppInfoChanges={hook.hasAppInfoChanges}
          isSavingAppInfo={hook.isSavingAppInfo}
          handleSaveAllAppInfo={hook.handleSaveAllAppInfo}
          editedFieldsCount={hook.editedFieldsCount}
          isTranslatingAppInfo={hook.isTranslatingAppInfo}
          currentAiApiKey={hook.currentAiApiKey}
          appInfoProtectedWords={hook.appInfoProtectedWords}
          setAppInfoProtectedWords={hook.setAppInfoProtectedWords}
          handleTranslateAppInfo={hook.handleTranslateAppInfo}
          handleAppInfoChange={hook.handleAppInfoChange}
          getAppInfoValue={hook.getAppInfoValue}
          isFieldEdited={hook.isFieldEdited}
          editedAppInfo={hook.editedAppInfo}
        />
      )}

      {hook.selectedVersion && hook.versionLocalizations.length > 0 && (
        <ASOKeywordsCard
          versionLocalizations={hook.versionLocalizations}
          generatingKeywordsFor={hook.generatingKeywordsFor}
          asoExpandedLocales={hook.asoExpandedLocales}
          editingKeywordsFor={hook.editingKeywordsFor}
          editedKeywords={hook.editedKeywords}
          setEditedKeywords={hook.setEditedKeywords}
          isSavingKeywords={hook.isSavingKeywords}
          currentAiApiKey={hook.currentAiApiKey}
          handleGenerateASOKeywords={hook.handleGenerateASOKeywords}
          toggleAsoLocale={hook.toggleAsoLocale}
          startEditingKeywords={hook.startEditingKeywords}
          cancelEditingKeywords={hook.cancelEditingKeywords}
          saveEditedKeywords={hook.saveEditedKeywords}
        />
      )}

      {hook.selectedVersion && hook.versionLocalizations.length > 0 && (
        <ScreenshotsCard
          versionLocalizations={hook.versionLocalizations}
          screenshotsByLocale={hook.screenshotsByLocale}
          isLoadingScreenshots={hook.isLoadingScreenshots}
          expandedScreenshotLocales={hook.expandedScreenshotLocales}
          handleLoadScreenshots={hook.handleLoadScreenshots}
          toggleScreenshotLocale={hook.toggleScreenshotLocale}
          setScreenshotPreview={hook.setScreenshotPreview}
          isDraggingScreenshots={hook.isDraggingScreenshots}
          setIsDraggingScreenshots={hook.setIsDraggingScreenshots}
          screenshotUploadQueue={hook.screenshotUploadQueue}
          setScreenshotUploadQueue={hook.setScreenshotUploadQueue}
          isUploadingScreenshots={hook.isUploadingScreenshots}
          uploadProgress={hook.uploadProgress}
          selectedDisplayType={hook.selectedDisplayType}
          setSelectedDisplayType={hook.setSelectedDisplayType}
          deleteExistingScreenshots={hook.deleteExistingScreenshots}
          setDeleteExistingScreenshots={hook.setDeleteExistingScreenshots}
          handleScreenshotDrop={hook.handleScreenshotDrop}
          removeFromUploadQueue={hook.removeFromUploadQueue}
          formatFileSize={hook.formatFileSize}
          handleUploadScreenshots={hook.handleUploadScreenshots}
        />
      )}

      {hook.selectedVersion && hook.versionLocalizations.length > 0 && (
        <TranslationCard
          versionLocalizations={hook.versionLocalizations}
          aiConfig={hook.aiConfig}
          currentAiApiKey={hook.currentAiApiKey}
          currentAiModel={hook.currentAiModel}
          sourceLocale={hook.sourceLocale}
          setSourceLocale={hook.setSourceLocale}
          targetLocales={hook.targetLocales}
          setTargetLocales={hook.setTargetLocales}
          fieldsToTranslate={hook.fieldsToTranslate}
          isTranslating={hook.isTranslating}
          translationProgress={hook.translationProgress}
          translationAlert={hook.translationAlert}
          setTranslationAlert={hook.setTranslationAlert}
          availableTargetLocales={hook.availableTargetLocales}
          existingLocales={hook.existingLocales}
          TRANSLATABLE_FIELDS={hook.TRANSLATABLE_FIELDS}
          handleFieldToggle={hook.handleFieldToggle}
          handleLocaleToggle={hook.handleLocaleToggle}
          handleTranslate={hook.handleTranslate}
        />
      )}

      <Card id="asc-logs" className="border-border/50 shadow-sm scroll-mt-6">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-500/10">
              <Terminal className="h-5 w-5 text-slate-500" />
            </div>
            <div>
              <CardTitle className="text-lg">Activity Log</CardTitle>
              <CardDescription>Track API calls and events</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48 rounded-xl border border-border/50 bg-muted/20">
            {hook.logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <Terminal className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-sm">No activity yet</p>
              </div>
            ) : (
              <div className="p-4 space-y-2">
                {hook.logs.map((log, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 text-sm py-1.5 px-3 rounded-lg transition-colors ${
                      log.type === 'error' ? 'bg-red-500/10' :
                      log.type === 'success' ? 'bg-emerald-500/10' :
                      'hover:bg-muted/50'
                    }`}
                  >
                    <span className={`mt-0.5 ${
                      log.type === 'error' ? 'text-red-500' :
                      log.type === 'success' ? 'text-emerald-500' :
                      'text-muted-foreground'
                    }`}>
                      {log.type === 'error' ? <AlertCircle className="h-4 w-4" /> :
                       log.type === 'success' ? <CheckCircle2 className="h-4 w-4" /> :
                       <Clock className="h-4 w-4" />}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground shrink-0 pt-0.5">{log.timestamp}</span>
                    <span className={`break-all ${
                      log.type === 'error' ? 'text-red-400' :
                      log.type === 'success' ? 'text-emerald-400' :
                      'text-foreground'
                    }`}>{log.message}</span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      <Dialog open={hook.editDialog.open} onOpenChange={(open) => !open && hook.setEditDialog({ ...hook.editDialog, open: false })}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Localization</DialogTitle>
            <DialogDescription>
              {ASC_LOCALES.find(l => l.code === hook.editDialog.locale)?.flag}{' '}
              {ASC_LOCALES.find(l => l.code === hook.editDialog.locale)?.name || hook.editDialog.locale}
            </DialogDescription>
          </DialogHeader>
          {hook.editDialog.localization && hook.editDialog.type === 'version' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Description (max 4000 chars)</Label>
                <Textarea
                  value={hook.editDialog.localization.description}
                  onChange={(e) => hook.setEditDialog(prev => ({
                    ...prev,
                    localization: { ...prev.localization, description: e.target.value }
                  }))}
                  rows={6}
                  maxLength={4000}
                />
                <span className="text-xs text-muted-foreground">
                  {hook.editDialog.localization.description?.length || 0}/4000
                </span>
              </div>
              <div className="space-y-2">
                <Label>What's New (max 4000 chars)</Label>
                <Textarea
                  value={hook.editDialog.localization.whatsNew}
                  onChange={(e) => hook.setEditDialog(prev => ({
                    ...prev,
                    localization: { ...prev.localization, whatsNew: e.target.value }
                  }))}
                  rows={4}
                  maxLength={4000}
                />
                <span className="text-xs text-muted-foreground">
                  {hook.editDialog.localization.whatsNew?.length || 0}/4000
                </span>
              </div>
              <div className="space-y-2">
                <Label>Promotional Text (max 170 chars)</Label>
                <Textarea
                  value={hook.editDialog.localization.promotionalText}
                  onChange={(e) => hook.setEditDialog(prev => ({
                    ...prev,
                    localization: { ...prev.localization, promotionalText: e.target.value }
                  }))}
                  rows={2}
                  maxLength={170}
                />
                <span className="text-xs text-muted-foreground">
                  {hook.editDialog.localization.promotionalText?.length || 0}/170
                </span>
              </div>
              <div className="space-y-2">
                <Label>Keywords (max 100 chars, comma-separated)</Label>
                <Input
                  value={hook.editDialog.localization.keywords}
                  onChange={(e) => hook.setEditDialog(prev => ({
                    ...prev,
                    localization: { ...prev.localization, keywords: e.target.value }
                  }))}
                  maxLength={100}
                />
                <span className="text-xs text-muted-foreground">
                  {hook.editDialog.localization.keywords?.length || 0}/100
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Support URL</Label>
                  <Input
                    type="url"
                    placeholder="https://example.com/support"
                    value={hook.editDialog.localization.supportUrl || ''}
                    onChange={(e) => hook.setEditDialog(prev => ({
                      ...prev,
                      localization: { ...prev.localization, supportUrl: e.target.value }
                    }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Marketing URL</Label>
                  <Input
                    type="url"
                    placeholder="https://example.com"
                    value={hook.editDialog.localization.marketingUrl || ''}
                    onChange={(e) => hook.setEditDialog(prev => ({
                      ...prev,
                      localization: { ...prev.localization, marketingUrl: e.target.value }
                    }))}
                  />
                </div>
              </div>
            </div>
          )}
          {hook.editDialog.localization && hook.editDialog.type === 'appInfo' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>App Name (max 30 chars)</Label>
                <Input
                  value={hook.editDialog.localization.name}
                  onChange={(e) => hook.setEditDialog(prev => ({
                    ...prev,
                    localization: { ...prev.localization, name: e.target.value }
                  }))}
                  maxLength={30}
                />
              </div>
              <div className="space-y-2">
                <Label>Subtitle (max 30 chars)</Label>
                <Input
                  value={hook.editDialog.localization.subtitle}
                  onChange={(e) => hook.setEditDialog(prev => ({
                    ...prev,
                    localization: { ...prev.localization, subtitle: e.target.value }
                  }))}
                  maxLength={30}
                />
              </div>
              <div className="space-y-2">
                <Label>Privacy Policy URL</Label>
                <Input
                  type="url"
                  placeholder="https://example.com/privacy"
                  value={hook.editDialog.localization.privacyPolicyUrl}
                  onChange={(e) => hook.setEditDialog(prev => ({
                    ...prev,
                    localization: { ...prev.localization, privacyPolicyUrl: e.target.value }
                  }))}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => hook.setEditDialog({ ...hook.editDialog, open: false })}>
              Cancel
            </Button>
            <Button onClick={hook.handleSaveEdit}>
              Save to App Store Connect
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={hook.createVersionDialog.open} onOpenChange={(open) => !open && hook.setCreateVersionDialog(prev => ({ ...prev, open: false }))}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create New Version</DialogTitle>
            <DialogDescription>
              Create a new App Store version for {hook.selectedApp?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Version Number</Label>
              <Input
                placeholder="1.0.0"
                value={hook.createVersionDialog.versionString}
                onChange={(e) => hook.setCreateVersionDialog(prev => ({ ...prev, versionString: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Platform</Label>
              <Select value={hook.createVersionDialog.platform} onValueChange={(val) => hook.setCreateVersionDialog(prev => ({ ...prev, platform: val }))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IOS">iOS</SelectItem>
                  <SelectItem value="MAC_OS">macOS</SelectItem>
                  <SelectItem value="TV_OS">tvOS</SelectItem>
                  <SelectItem value="VISION_OS">visionOS</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => hook.setCreateVersionDialog({ open: false, versionString: '', platform: 'IOS', isCreating: false })}
              disabled={hook.createVersionDialog.isCreating}
            >
              Cancel
            </Button>
            <Button
              onClick={hook.handleCreateVersion}
              disabled={hook.createVersionDialog.isCreating || !hook.createVersionDialog.versionString.trim()}
            >
              {hook.createVersionDialog.isCreating ? 'Creating...' : 'Create Version'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={hook.screenshotPreview.open} onOpenChange={(open) => !open && hook.setScreenshotPreview({ open: false, screenshot: null, locale: '', deviceType: '' })}>
        <DialogContent className="sm:max-w-[90vw] md:max-w-[80vw] lg:max-w-[900px] max-h-[90vh] p-0 overflow-hidden">
          <div className="relative">
            <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-black/60 to-transparent">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-black/40 border-white/20 text-white">
                  {hook.screenshotPreview.locale}
                </Badge>
                <Badge variant="outline" className="bg-black/40 border-white/20 text-white">
                  {hook.screenshotPreview.deviceType}
                </Badge>
              </div>
              <button
                onClick={() => hook.setScreenshotPreview({ open: false, screenshot: null, locale: '', deviceType: '' })}
                className="p-2 rounded-full bg-black/40 hover:bg-black/60 text-white transition-colors"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex items-center justify-center bg-black/95 min-h-[60vh]">
              {hook.screenshotPreview.screenshot?.imageAsset?.templateUrl ? (
                <img
                  src={hook.screenshotPreview.screenshot.imageAsset.templateUrl
                    .replace('{w}', '1200')
                    .replace('{h}', '2400')
                    .replace('{f}', 'png')}
                  alt={hook.screenshotPreview.screenshot.fileName}
                  className="max-h-[85vh] w-auto object-contain"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-white/50 py-20">
                  <Image className="h-16 w-16 mb-4" />
                  <p>Image not available</p>
                </div>
              )}
            </div>

            {hook.screenshotPreview.screenshot?.fileName && (
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/60 to-transparent">
                <p className="text-white/80 text-sm text-center truncate">
                  {hook.screenshotPreview.screenshot.fileName}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
