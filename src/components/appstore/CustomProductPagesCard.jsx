import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  ChevronRight, Copy, ExternalLink, Eye, EyeOff, Globe, Images, Loader2, MessageSquareText, PanelsTopLeft,
  Pencil, Plus, RefreshCw, Sparkles, Trash2, Link,
} from 'lucide-react'
import { ASC_LOCALES } from '@/services/appStoreConnectService'
import {
  CPP_VERSION_STATES,
  CPP_PROMOTIONAL_TEXT_LIMIT,
  MAX_CUSTOM_PRODUCT_PAGES,
  isCppVersionEditable,
} from '@/services/appStoreProductPagesService'
import CustomProductPageDialog from './CustomProductPageDialog'
import PromotionalTextDialog from './PromotionalTextDialog'
import TranslateAllLocalesDialog from './TranslateAllLocalesDialog'
import LocalizedMediaPanel from './LocalizedMediaPanel'
import ConfirmDialog from './ConfirmDialog'

function localeFlag(code) {
  return ASC_LOCALES.find(l => l.code === code)?.flag || '🌐'
}

const CLOSED_PAGE_DIALOG = { open: false, mode: 'create', page: null, isSubmitting: false }
const CLOSED_LOC_DIALOG = { open: false, locale: '', localization: null, isSaving: false }

export default function CustomProductPagesCard({
  selectedApp,
  selectedVersion,
  cppHook,
  assetLibrary,
  defaultLocale,
  promptIsCustom,
  onEditPrompt,
  onPreviewAsset,
}) {
  const {
    pages, isLoadingPages, selectedPage, latestVersion, localizations, sourceLocalization, isLoadingDetail,
    isCreatingVersion, isTranslatingAll, translationProgress, currentAiApiKey, media,
    refreshPages, handleSelectPage, handleCreatePage, handleUpdatePage, handleToggleVisibility, handleDeletePage,
    handleCreateVersion, handleSaveLocalization, handleDeleteLocalization, handleTranslateToAllLocales,
    pageDialog, setPageDialog, deleteConfirm, setDeleteConfirm, localizationDialog, setLocalizationDialog,
    translateAllDialog, setTranslateAllDialog,
  } = cppHook

  const [confirmDeleteLocId, setConfirmDeleteLocId] = useState(null)

  const editable = isCppVersionEditable(latestVersion)
  const canCreateVersion = ['APPROVED', 'ACCEPTED'].includes(latestVersion?.state)

  const copyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url)
      toast.success('Page URL copied')
    } catch {
      toast.error('Could not copy the URL')
    }
  }

  return (
    <>
      <Card id="asc-cpp" className="scroll-mt-44 border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10">
                <PanelsTopLeft className="h-5 w-5 text-sky-500" />
              </div>
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  Custom Product Pages
                  {pages.length > 0 && (
                    <Badge variant="outline" className="text-[10px]">{pages.length}/{MAX_CUSTOM_PRODUCT_PAGES}</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  Product page variants for {selectedApp.name} with their own screenshots, previews and promotional text
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-9" onClick={onEditPrompt} title="Customize the AI translation prompt">
                <MessageSquareText className="mr-2 h-4 w-4" />
                Prompt
                {promptIsCustom && <span className="ml-2 h-1.5 w-1.5 rounded-full bg-foreground" />}
              </Button>
              <Button variant="outline" size="sm" className="h-9" onClick={refreshPages} disabled={isLoadingPages}>
                {isLoadingPages ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                className="h-9"
                onClick={() => setPageDialog({ open: true, mode: 'create', page: null, isSubmitting: false })}
                disabled={pages.length >= MAX_CUSTOM_PRODUCT_PAGES}
              >
                <Plus className="mr-2 h-4 w-4" />
                New page
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {isLoadingPages ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-3 h-6 w-6 animate-spin" />
              Loading custom product pages...
            </div>
          ) : pages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <PanelsTopLeft className="mb-3 h-10 w-10 opacity-30" />
              <p className="font-medium">No custom product pages yet</p>
              <p className="text-sm">Create one per audience or campaign, then send ads and links to its URL</p>
            </div>
          ) : (
            <div className="space-y-2">
              {pages.map(page => {
                const isSelected = selectedPage?.id === page.id
                return (
                  <div
                    key={page.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectPage(page)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSelectPage(page)}
                    className={`group w-full cursor-pointer rounded-xl border p-4 text-left transition-all
                      ${isSelected
                        ? 'border-sky-500/50 bg-sky-500/[0.04] shadow-sm'
                        : 'border-border/50 bg-background hover:border-sky-500/30 hover:bg-muted/40'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg
                        ${isSelected ? 'bg-sky-500/15' : 'bg-muted/60 group-hover:bg-sky-500/10'}`}>
                        <PanelsTopLeft className={`h-5 w-5 ${isSelected ? 'text-sky-500' : 'text-muted-foreground'}`} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="truncate font-semibold">{page.name}</span>
                          <Badge variant={page.visible ? 'default' : 'secondary'} className="h-4 px-1.5 text-[10px]">
                            {page.visible ? 'Visible' : 'Hidden'}
                          </Badge>
                          {isSelected && latestVersion && (
                            <Badge variant="outline" className="h-4 px-1.5 text-[10px]">
                              v{latestVersion.version} · {CPP_VERSION_STATES[latestVersion.state] || latestVersion.state}
                            </Badge>
                          )}
                        </div>
                        {page.url && (
                          <p className="truncate font-mono text-xs text-muted-foreground">{page.url}</p>
                        )}
                      </div>

                      <div className="flex shrink-0 items-center gap-1">
                        {page.url && (
                          <>
                            <Button size="icon" variant="ghost" className="h-8 w-8 opacity-60 group-hover:opacity-100" title="Copy page URL"
                              onClick={(e) => { e.stopPropagation(); copyUrl(page.url) }}>
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 opacity-60 group-hover:opacity-100" title="Open on the App Store" asChild>
                              <a href={page.url} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()}>
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </Button>
                          </>
                        )}
                        <Button size="icon" variant="ghost" className="h-8 w-8 opacity-60 group-hover:opacity-100"
                          title={page.visible ? 'Hide from the App Store' : 'Make visible'}
                          onClick={(e) => { e.stopPropagation(); handleToggleVisibility(page) }}>
                          {page.visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 opacity-60 group-hover:opacity-100" title="Edit page"
                          onClick={(e) => { e.stopPropagation(); setPageDialog({ open: true, mode: 'edit', page, isSubmitting: false }) }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive opacity-60 hover:text-destructive group-hover:opacity-100" title="Delete page"
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, page, isDeleting: false }) }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <ChevronRight className={`ml-1 h-5 w-5 transition-transform
                          ${isSelected ? 'rotate-90 text-sky-500' : 'text-muted-foreground/50 group-hover:translate-x-0.5 group-hover:text-sky-500'}`} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {selectedPage && (
            <div className="space-y-6 rounded-xl border border-border/50 bg-muted/20 p-5">
              {isLoadingDetail ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  <span className="text-sm">Loading page…</span>
                </div>
              ) : !latestVersion ? (
                <p className="text-sm text-muted-foreground">This page has no version yet.</p>
              ) : (
                <>
                  {/* Version status */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold">
                        Version {latestVersion.version} — {CPP_VERSION_STATES[latestVersion.state] || latestVersion.state}
                      </h4>
                      {latestVersion.deepLink && (
                        <p className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                          <Link className="h-3 w-3" /> {latestVersion.deepLink}
                        </p>
                      )}
                      {!editable && (
                        <p className="text-xs text-muted-foreground">
                          {canCreateVersion
                            ? 'This version is live and locked. Create a new version to change text or media.'
                            : 'Locked while App Review looks at it.'}
                        </p>
                      )}
                      {editable && (
                        <p className="text-xs text-muted-foreground">
                          Submit the page for review from App Store Connect once its text and media are ready.
                        </p>
                      )}
                    </div>
                    {canCreateVersion && (
                      <Button size="sm" variant="outline" onClick={handleCreateVersion} disabled={isCreatingVersion}>
                        {isCreatingVersion ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
                        New version
                      </Button>
                    )}
                  </div>

                  {/* Promotional text per locale */}
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <h4 className="flex items-center gap-2 text-sm font-semibold">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        Promotional text
                        <span className="font-normal text-muted-foreground">({localizations.length} locale{localizations.length === 1 ? '' : 's'})</span>
                      </h4>
                      {editable && (
                        <div className="flex flex-wrap items-center gap-2">
                          <Button size="sm" variant="outline"
                            onClick={() => setLocalizationDialog({
                              open: true,
                              locale: ASC_LOCALES.find(l => !localizations.some(x => x.locale === l.code))?.code || defaultLocale,
                              localization: null,
                              isSaving: false,
                            })}>
                            <Plus className="mr-2 h-4 w-4" />
                            Add locale
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => setTranslateAllDialog({ open: true })}
                            disabled={!sourceLocalization || !currentAiApiKey || isTranslatingAll}
                            title={!sourceLocalization
                              ? 'Write the promotional text for one locale first'
                              : !currentAiApiKey ? 'Configure an AI provider API key in the sidebar' : 'AI-translate the promotional text'}
                            className="gradient-primary border-0 text-white hover:opacity-90"
                          >
                            <Sparkles className="mr-2 h-4 w-4" />
                            Translate with AI
                          </Button>
                        </div>
                      )}
                    </div>

                    {isTranslatingAll && (
                      <div className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/60 p-3">
                        <Loader2 className="h-4 w-4 animate-spin text-foreground/70" />
                        <p className="text-xs text-foreground/80">
                          Translating {translationProgress.current}/{translationProgress.total} — {translationProgress.locale}
                        </p>
                      </div>
                    )}

                    {localizations.length === 0 ? (
                      <p className="text-sm italic text-muted-foreground">No locales yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {localizations.map(loc => {
                          const isSource = sourceLocalization?.id === loc.id
                          return (
                            <div key={loc.id} className="flex items-start justify-between gap-3 rounded-lg border border-border/50 bg-background p-3">
                              <div className="min-w-0 flex-1">
                                <div className="mb-1 flex items-center gap-2">
                                  <span className="text-base">{localeFlag(loc.locale)}</span>
                                  <span className="text-sm font-medium">{loc.locale}</span>
                                  {isSource && <Badge variant="secondary" className="text-xs">AI source</Badge>}
                                  <span className="ml-auto text-[11px] text-muted-foreground">
                                    {loc.promotionalText.length}/{CPP_PROMOTIONAL_TEXT_LIMIT}
                                  </span>
                                </div>
                                <p className="line-clamp-2 text-xs text-muted-foreground">
                                  {loc.promotionalText || <em>No promotional text</em>}
                                </p>
                              </div>
                              {editable && (
                                <div className="flex shrink-0 items-center gap-1">
                                  <Button size="icon" variant="ghost" className="h-8 w-8"
                                    onClick={() => setLocalizationDialog({ open: true, locale: loc.locale, localization: loc, isSaving: false })}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  {localizations.length > 1 && (
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 text-destructive hover:text-destructive"
                                      onClick={() => {
                                        if (confirmDeleteLocId === loc.id) {
                                          handleDeleteLocalization(loc)
                                          setConfirmDeleteLocId(null)
                                        } else {
                                          setConfirmDeleteLocId(loc.id)
                                          setTimeout(() => setConfirmDeleteLocId(prev => prev === loc.id ? null : prev), 3000)
                                        }
                                      }}
                                      title={confirmDeleteLocId === loc.id ? 'Click again to confirm' : 'Delete locale'}
                                    >
                                      <Trash2 className={`h-4 w-4 ${confirmDeleteLocId === loc.id ? 'animate-pulse' : ''}`} />
                                    </Button>
                                  )}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* Media */}
                  <div className="space-y-3 border-t border-border/50 pt-5">
                    <h4 className="flex items-center gap-2 text-sm font-semibold">
                      <Images className="h-4 w-4 text-muted-foreground" />
                      Screenshots &amp; previews
                    </h4>
                    <LocalizedMediaPanel
                      media={media}
                      library={assetLibrary}
                      localizations={localizations}
                      readOnly={!editable}
                      readOnlyReason="This version is locked — create a new version to change its media."
                      onPreview={onPreviewAsset}
                      dropHint="Folder with one subfolder per locale (/en-US, /fr-FR…). Missing locales are added to the page."
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {pageDialog.open && (
        <CustomProductPageDialog
          key={pageDialog.page?.id || 'new'}
          open
          mode={pageDialog.mode}
          page={pageDialog.page}
          latestVersion={pageDialog.page?.id === selectedPage?.id ? latestVersion : null}
          deepLinkEditable={pageDialog.page?.id === selectedPage?.id && editable}
          pages={pages}
          selectedVersion={selectedVersion}
          defaultLocale={defaultLocale}
          isSubmitting={pageDialog.isSubmitting}
          onClose={() => setPageDialog(CLOSED_PAGE_DIALOG)}
          onSubmit={(values) => pageDialog.mode === 'create'
            ? handleCreatePage(values)
            : handleUpdatePage(pageDialog.page, values)}
        />
      )}

      {localizationDialog.open && (
        <PromotionalTextDialog
          key={localizationDialog.localization?.id || 'new'}
          open
          locale={localizationDialog.locale}
          localization={localizationDialog.localization}
          existingLocales={localizations.map(l => l.locale)}
          isSaving={localizationDialog.isSaving}
          onClose={() => setLocalizationDialog(CLOSED_LOC_DIALOG)}
          onSave={handleSaveLocalization}
          onLocaleChange={(locale) => setLocalizationDialog(d => ({ ...d, locale }))}
        />
      )}

      {translateAllDialog.open && sourceLocalization && (
        <TranslateAllLocalesDialog
          key={`${selectedPage?.id}-${sourceLocalization.locale}`}
          open
          title="AI-translate promotional text"
          description={`Translates the ${sourceLocalization.locale} promotional text into every selected language and saves it to this custom product page (max ${CPP_PROMOTIONAL_TEXT_LIMIT} characters). New languages are added to the page.`}
          primaryLocale={sourceLocalization.locale}
          existingLocales={localizations.map(l => l.locale)}
          isTranslating={isTranslatingAll}
          translationProgress={translationProgress}
          promptIsCustom={promptIsCustom}
          onEditPrompt={onEditPrompt}
          onClose={() => setTranslateAllDialog({ open: false })}
          onTranslate={handleTranslateToAllLocales}
        />
      )}

      <ConfirmDialog
        open={deleteConfirm.open}
        title="Delete custom product page?"
        description={`"${deleteConfirm.page?.name}" and all its versions will be removed from App Store Connect, and its URL will stop working. Assets stay in the Asset Library. This cannot be undone.`}
        confirmLabel="Delete page"
        isBusy={deleteConfirm.isDeleting}
        onClose={() => setDeleteConfirm({ open: false, page: null, isDeleting: false })}
        onConfirm={() => handleDeletePage(deleteConfirm.page)}
      />
    </>
  )
}
