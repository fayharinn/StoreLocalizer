import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  ChevronRight, CopyPlus, Globe, HeartHandshake, Languages, Loader2, MessageSquareText, Pencil, Plus, RefreshCw, Trash2,
} from 'lucide-react'
import { ASC_LOCALES } from '@/services/appStoreConnectService'
import {
  MAX_RETENTION_MESSAGES,
  RETENTION_LOCALIZATION_LIMITS,
  RETENTION_REFERENCE_NAME_LIMIT,
  RETENTION_VERSION_STATES,
  canCreateRetentionVersion,
  isRetentionVersionEditable,
  pickWorkingVersion,
} from '@/services/appStoreRetentionMessagesService'
import RetentionLocalizationDialog from './RetentionLocalizationDialog'
import TranslateAllLocalesDialog from './TranslateAllLocalesDialog'

function localeFlag(code) {
  return ASC_LOCALES.find(l => l.code === code)?.flag || '🌐'
}

function stateBadgeVariant(state) {
  if (state === 'APPROVED') return 'success'
  if (state === 'REJECTED' || state === 'DEVELOPER_REJECTED') return 'warning'
  return 'secondary'
}

function StateBadge({ version }) {
  if (!version) return <Badge variant="outline" className="h-5 px-1.5 text-xs">No version</Badge>
  return (
    <Badge variant={stateBadgeVariant(version.state)} className="h-5 px-1.5 text-xs">
      {RETENTION_VERSION_STATES[version.state] || version.state}
    </Badge>
  )
}

function Notice({ children }) {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/60 p-3 text-xs text-muted-foreground">
      {children}
    </div>
  )
}

export default function RetentionMessagesCard({ selectedApp, retentionHook, aiConfig, defaultLocale, promptIsCustom, onEditPrompt }) {
  const {
    messages,
    isLoadingMessages,
    selectedMessage,
    workingVersion,
    localizations,
    isLoadingLocalizations,
    sourceLocalization,
    isCreatingVersion,
    isTranslatingAll,
    translationProgress,
    handleRefresh,
    handleSelectMessage,
    handleCreateMessage,
    handleCreateVersion,
    handleSaveLocalization,
    handleDeleteLocalization,
    handleTranslateToAllLocales,
    createDialog,
    setCreateDialog,
    localizationDialog,
    setLocalizationDialog,
    translateAllDialog,
    setTranslateAllDialog,
  } = retentionHook

  const [confirmDeleteLocId, setConfirmDeleteLocId] = useState(null)

  if (!selectedApp) return null

  const atLimit = messages.length >= MAX_RETENTION_MESSAGES
  const openNewLocale = (locale) => setLocalizationDialog({ open: true, locale, localization: null, isSaving: false })

  return (
    <>
      <Card id="asc-retention" className="scroll-mt-44">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base font-medium">Retention messages</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                What people see when they start to cancel a subscription of {selectedApp.name}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onEditPrompt} className="h-9" title="Customize the translation prompt">
                <MessageSquareText className="h-4 w-4 mr-2" />
                Prompt
                {promptIsCustom && <span className="ml-2 h-1.5 w-1.5 rounded-full bg-foreground" />}
              </Button>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoadingMessages} className="h-9" title="Reload">
                {isLoadingMessages ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
              <Button
                size="sm"
                onClick={() => setCreateDialog({ open: true, isSubmitting: false })}
                disabled={atLimit}
                title={atLimit ? `An app can have up to ${MAX_RETENTION_MESSAGES} retention messages` : 'Create a retention message'}
                className="h-9"
              >
                <Plus className="h-4 w-4 mr-2" />
                New message
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {isLoadingMessages && messages.length === 0 ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-3 text-faint" />
              <span>Loading retention messages</span>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <HeartHandshake className="h-6 w-6 mb-3 text-faint" />
              <p className="font-medium">No retention messages yet</p>
              <p className="text-sm">Create one, then assign it to subscriptions in App Store Connect</p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map(message => {
                const isSelected = selectedMessage?.id === message.id
                const version = pickWorkingVersion(message.versions)
                return (
                  <button
                    key={message.id}
                    type="button"
                    onClick={() => handleSelectMessage(message)}
                    className={`group w-full text-left rounded-lg border px-4 py-3 transition-colors
                      ${isSelected ? 'border-highlight/60 bg-muted/30' : 'border-border bg-background hover:bg-muted/40'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium truncate">{message.referenceName}</span>
                          <StateBadge version={version} />
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {message.subscriptions.length > 0
                            ? `Used by ${message.subscriptions.map(s => s.name || s.productId).join(', ')}`
                            : 'Not assigned to a subscription'}
                        </p>
                      </div>
                      <ChevronRight className={`h-4 w-4 shrink-0 transition-transform
                        ${isSelected ? 'rotate-90 text-foreground' : 'text-faint group-hover:text-foreground'}`} />
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          {selectedMessage && (
            <MessagePanel
              message={selectedMessage}
              version={workingVersion}
              localizations={localizations}
              isLoadingLocalizations={isLoadingLocalizations}
              sourceLocalization={sourceLocalization}
              defaultLocale={defaultLocale}
              hasAiKey={Boolean(aiConfig?.apiKeys?.[aiConfig.provider])}
              isCreatingVersion={isCreatingVersion}
              isTranslatingAll={isTranslatingAll}
              translationProgress={translationProgress}
              promptIsCustom={promptIsCustom}
              confirmDeleteLocId={confirmDeleteLocId}
              setConfirmDeleteLocId={setConfirmDeleteLocId}
              onEditPrompt={onEditPrompt}
              onAddLocale={openNewLocale}
              onEditLocale={(loc) => setLocalizationDialog({ open: true, locale: loc.locale, localization: loc, isSaving: false })}
              onDeleteLocale={handleDeleteLocalization}
              onTranslate={() => setTranslateAllDialog({ open: true })}
              onCreateVersion={handleCreateVersion}
            />
          )}
        </CardContent>
      </Card>

      {createDialog.open && (
        <CreateMessageDialog
          isSubmitting={createDialog.isSubmitting}
          existingNames={messages.map(m => m.referenceName)}
          onClose={() => setCreateDialog({ open: false, isSubmitting: false })}
          onSubmit={handleCreateMessage}
        />
      )}

      {localizationDialog.open && (
        <RetentionLocalizationDialog
          key={localizationDialog.localization?.id || 'new'}
          open
          locale={localizationDialog.locale}
          localization={localizationDialog.localization}
          isSaving={localizationDialog.isSaving}
          existingLocales={localizations.map(l => l.locale)}
          onClose={() => setLocalizationDialog({ open: false, locale: '', localization: null, isSaving: false })}
          onSave={handleSaveLocalization}
          onLocaleChange={(locale) => setLocalizationDialog(d => ({ ...d, locale }))}
        />
      )}

      {translateAllDialog.open && sourceLocalization && (
        <TranslateAllLocalesDialog
          key={`${selectedMessage?.id}-${sourceLocalization.locale}`}
          open
          title="Translate retention message"
          description={`Translates the ${sourceLocalization.locale} header and body into every selected language and saves them to this version. Limits: header ${RETENTION_LOCALIZATION_LIMITS.header} characters, body ${RETENTION_LOCALIZATION_LIMITS.body}.`}
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
    </>
  )
}

function MessagePanel({
  message,
  version,
  localizations,
  isLoadingLocalizations,
  sourceLocalization,
  defaultLocale,
  hasAiKey,
  isCreatingVersion,
  isTranslatingAll,
  translationProgress,
  promptIsCustom,
  confirmDeleteLocId,
  setConfirmDeleteLocId,
  onEditPrompt,
  onAddLocale,
  onEditLocale,
  onDeleteLocale,
  onTranslate,
  onCreateVersion,
}) {
  const editable = isRetentionVersionEditable(version)
  const canCreateVersion = canCreateRetentionVersion(message.versions)
  const translateDisabled = !sourceLocalization || !hasAiKey || isTranslatingAll
  const firstLocale = defaultLocale || 'en-US'
  const nextLocale = localizations.length === 0
    ? firstLocale
    : ASC_LOCALES.find(l => !localizations.some(loc => loc.locale === l.code))?.code

  return (
    <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h4 className="text-sm font-medium truncate">Text for "{message.referenceName}"</h4>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            Current version <StateBadge version={version} />
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {editable && (
            <>
              <Button size="sm" variant="outline" onClick={() => onAddLocale(nextLocale)} disabled={!nextLocale}>
                <Plus className="h-4 w-4 mr-2" />
                Add language
              </Button>
              <Button
                size="sm"
                variant="highlight"
                onClick={onTranslate}
                disabled={translateDisabled}
                title={
                  !sourceLocalization
                    ? 'Write the header and body for one language first'
                    : !hasAiKey
                      ? 'Set an AI provider API key in the sidebar'
                      : `Translate from ${sourceLocalization.locale}`
                }
              >
                <Languages className="h-4 w-4 mr-2" />
                Translate with AI
              </Button>
            </>
          )}
          {!editable && canCreateVersion && (
            <Button size="sm" variant="highlight" onClick={onCreateVersion} disabled={isCreatingVersion}>
              {isCreatingVersion ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CopyPlus className="h-4 w-4 mr-2" />}
              {version ? 'New version' : 'Create version'}
            </Button>
          )}
        </div>
      </div>

      {!version && (
        <Notice>This message has no version yet, so it can't hold text. Create one to add languages.</Notice>
      )}
      {version?.state === 'APPROVED' && canCreateVersion && (
        <Notice>
          Approved text is live and can't change. A new version copies it so you can edit and translate it, then submit
          it in App Store Connect. The image isn't copied: add it again there.
        </Notice>
      )}
      {version && !editable && !canCreateVersion && (
        <Notice>This version is with App Review. Its text can't change until the review ends.</Notice>
      )}
      {editable && localizations.length > 0 && (
        <Notice>
          <span>
            When every language is ready, submit this version for review in App Store Connect
            {sourceLocalization ? <> · AI translates from <span className="keycap">{sourceLocalization.locale}</span></> : null}
            {promptIsCustom ? <> · <button type="button" className="underline underline-offset-2" onClick={onEditPrompt}>custom prompt</button></> : null}
          </span>
        </Notice>
      )}

      {isTranslatingAll && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/60 border border-border">
          <Loader2 className="h-4 w-4 animate-spin text-faint" />
          <p className="text-xs tabular-nums text-muted-foreground">
            Translating {translationProgress.current}/{translationProgress.total}, {translationProgress.locale}
          </p>
        </div>
      )}

      {version && (isLoadingLocalizations ? (
        <div className="flex items-center justify-center py-6 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin mr-2 text-faint" />
          <span className="text-sm">Loading languages</span>
        </div>
      ) : localizations.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-8 px-4 rounded-lg border border-dashed border-border bg-background">
          <Globe className="h-6 w-6 text-faint" />
          <div className="text-center">
            <p className="text-sm font-medium">{editable ? 'Start with your source language' : 'No text in this version'}</p>
            {editable && (
              <p className="text-xs text-muted-foreground mt-1">
                Write the header and body once, then translate them into the other languages.
              </p>
            )}
          </div>
          {editable && (
            <Button onClick={() => onAddLocale(firstLocale)}>
              <Plus className="h-4 w-4 mr-2" />
              Add {firstLocale} text
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {localizations.map(loc => {
            const isSource = loc.id === sourceLocalization?.id
            const confirming = confirmDeleteLocId === loc.id
            return (
              <div key={loc.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-background border border-border">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{localeFlag(loc.locale)}</span>
                    <span className="keycap">{loc.locale}</span>
                    {isSource && <Badge variant="secondary" className="text-xs font-normal">Source</Badge>}
                  </div>
                  <p className="text-sm font-medium truncate">{loc.header || <span className="font-normal text-faint">No header</span>}</p>
                  <p className="text-xs text-muted-foreground line-clamp-2">{loc.body}</p>
                </div>
                {editable && (
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEditLocale(loc)} title="Edit">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className={`h-8 w-8 text-destructive hover:text-destructive ${confirming ? 'bg-destructive/10' : ''}`}
                      onClick={() => {
                        if (confirming) {
                          onDeleteLocale(loc)
                          setConfirmDeleteLocId(null)
                        } else {
                          setConfirmDeleteLocId(loc.id)
                          setTimeout(() => setConfirmDeleteLocId(prev => (prev === loc.id ? null : prev)), 3000)
                        }
                      }}
                      title={confirming ? 'Click again to confirm' : 'Delete language'}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function CreateMessageDialog({ isSubmitting, existingNames, onClose, onSubmit }) {
  const [name, setName] = useState('')
  const trimmed = name.trim()
  const tooLong = trimmed.length > RETENTION_REFERENCE_NAME_LIMIT
  const duplicate = existingNames.includes(trimmed)
  const isValid = trimmed.length > 0 && !tooLong && !duplicate

  return (
    <Dialog open onOpenChange={(o) => !o && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>New retention message</DialogTitle>
          <DialogDescription>
            The reference name is only used in App Store Connect and can't be changed later. Assign the message to
            subscriptions in App Store Connect.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-1.5 py-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (isValid && !isSubmitting) onSubmit(trimmed)
          }}
        >
          <div className="flex items-center justify-between">
            <Label htmlFor="retention-reference-name">Reference name</Label>
            <span className={`text-xs tabular-nums ${tooLong ? 'text-destructive font-medium' : 'text-faint'}`}>
              {trimmed.length}/{RETENTION_REFERENCE_NAME_LIMIT}
            </span>
          </div>
          <Input
            id="retention-reference-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="winter-stay-with-us"
            className={tooLong ? 'border-destructive' : ''}
          />
          {duplicate && <p className="text-xs text-highlight-ink">A message already uses this name.</p>}
        </form>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={() => onSubmit(trimmed)} disabled={!isValid || isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
