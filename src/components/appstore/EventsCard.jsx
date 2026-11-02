import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CalendarRange, Loader2, Plus, RefreshCw, Pencil, Trash2, Globe, ChevronRight, Languages, MessageSquareText } from 'lucide-react'
import { ASC_LOCALES } from '@/services/appStoreConnectService'
import { EVENT_BADGES, EVENT_LOCALIZATION_LIMITS } from '@/services/appStoreEventsService'
import EventDialog from './EventDialog'
import EventLocalizationDialog from './EventLocalizationDialog'
import EventDeleteConfirm from './EventDeleteConfirm'
import TranslateAllLocalesDialog from './TranslateAllLocalesDialog'
import LocalizedMediaPanel from './LocalizedMediaPanel'

function badgeLabel(value) {
  return EVENT_BADGES.find(b => b.value === value)?.label || value || '—'
}

function localeFlag(code) {
  return ASC_LOCALES.find(l => l.code === code)?.flag || '🌐'
}

export default function EventsCard({ selectedApp, eventsHook, assetLibrary, aiConfig, promptIsCustom, onEditPrompt, onPreviewAsset }) {
  const {
    events,
    isLoadingEvents,
    selectedEvent,
    eventLocalizations,
    isLoadingLocalizations,
    isTranslatingAll,
    translationProgress,
    refreshEvents,
    handleSelectEvent,
    handleCreateEvent,
    handleUpdateEvent,
    handleDeleteEvent,
    handleSaveLocalization,
    handleDeleteLocalization,
    handleTranslateToAllLocales,
    createEventDialog,
    setCreateEventDialog,
    editEventDialog,
    setEditEventDialog,
    deleteConfirm,
    setDeleteConfirm,
    localizationDialog,
    setLocalizationDialog,
    translateAllDialog,
    setTranslateAllDialog,
    media,
  } = eventsHook

  const [confirmDeleteLocId, setConfirmDeleteLocId] = useState(null)

  if (!selectedApp) return null

  return (
    <>
      <Card id="asc-events" className="scroll-mt-44">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-medium">In-App Events</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Create and localize App Store In-App Events for {selectedApp.name}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onEditPrompt}
                className="h-9"
                title="Customize the translation prompt"
              >
                <MessageSquareText className="h-4 w-4 mr-2" />
                Prompt
                {promptIsCustom && <span className="ml-2 h-1.5 w-1.5 rounded-full bg-foreground" />}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={refreshEvents}
                disabled={isLoadingEvents}
                className="h-9"
              >
                {isLoadingEvents ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
              </Button>
              <Button
                size="sm"
                onClick={() => setCreateEventDialog({ open: true, isSubmitting: false })}
                className="h-9"
              >
                <Plus className="h-4 w-4 mr-2" />
                New event
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoadingEvents ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-3 text-faint" />
              <span>Loading events</span>
            </div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <CalendarRange className="h-6 w-6 mb-3 text-faint" />
              <p className="font-medium">No In-App Events yet</p>
              <p className="text-sm">Create one to start promoting it on the App Store</p>
            </div>
          ) : (
            <div className="space-y-2">
              {events.map(event => {
                  const isSelected = selectedEvent?.id === event.id
                  return (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => handleSelectEvent(event)}
                      className={`group w-full text-left rounded-lg border px-4 py-3 transition-colors
                        ${isSelected
                          ? 'border-highlight/60 bg-muted/30'
                          : 'border-border bg-background hover:bg-muted/40'}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium truncate">{event.referenceName}</span>
                            <Badge
                              variant={event.eventState === 'PUBLISHED' ? 'success' : 'secondary'}
                              className="text-xs h-5 px-1.5"
                            >
                              {event.eventState}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <span>{localeFlag(event.primaryLocale)}</span>
                              <span className="keycap">{event.primaryLocale}</span>
                            </span>
                            <span className="text-faint">·</span>
                            <Badge variant="outline" className="text-xs h-5 px-1.5">{badgeLabel(event.badge)}</Badge>
                            {isSelected && (
                              <>
                                <span className="text-faint">·</span>
                                <span className="inline-flex items-center gap-1 tabular-nums text-foreground">
                                  <Languages className="h-3 w-3 text-faint" />
                                  {eventLocalizations.length} localization{eventLocalizations.length === 1 ? '' : 's'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 opacity-60 group-hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditEventDialog({ open: true, event, isSubmitting: false })
                            }}
                            title="Edit event"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 opacity-60 group-hover:opacity-100 text-destructive hover:text-destructive"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDeleteConfirm({ open: true, event, isDeleting: false })
                            }}
                            title="Delete event"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                          <ChevronRight className={`h-4 w-4 ml-1 transition-transform
                            ${isSelected ? 'rotate-90 text-foreground' : 'text-faint group-hover:text-foreground'}`} />
                        </div>
                      </div>
                    </button>
                  )
                })}
            </div>
          )}

          {selectedEvent && (() => {
            const hasPrimary = Boolean(eventLocalizations.find(l => l.locale === selectedEvent.primaryLocale))
            const hasAiKey = Boolean(aiConfig?.apiKeys?.[aiConfig.provider])
            const onlyPrimary = hasPrimary && eventLocalizations.length === 1
            const translateDisabled = !hasPrimary || !hasAiKey
            return (
            <div className="rounded-xl border border-border bg-muted/20 p-5 space-y-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <h4 className="text-sm font-medium">
                    Localizations for "{selectedEvent.referenceName}"
                  </h4>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    Primary locale: {localeFlag(selectedEvent.primaryLocale)} <span className="keycap">{selectedEvent.primaryLocale}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLocalizationDialog({
                      open: true,
                      locale: selectedEvent.primaryLocale,
                      localization: null,
                      isSaving: false,
                    })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add locale
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onEditPrompt}
                  >
                    <MessageSquareText className="h-4 w-4 mr-2" />
                    Edit prompt
                    {promptIsCustom && <Badge variant="secondary" className="ml-2 text-xs h-5 px-1.5 font-normal">Custom</Badge>}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setTranslateAllDialog({ open: true })}
                    disabled={translateDisabled}
                    title={
                      !hasPrimary
                        ? `Add the primary locale (${selectedEvent.primaryLocale}) first`
                        : !hasAiKey
                          ? 'Set an AI provider API key in the sidebar'
                          : 'Translate this event into other languages'
                    }
                    variant="highlight"
                  >
                    <Languages className="h-4 w-4 mr-2" />
                    Translate with AI
                  </Button>
                </div>
              </div>

              {onlyPrimary && !translateDisabled && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/60 border border-border text-xs">
                  <Languages className="h-3.5 w-3.5 text-faint shrink-0" />
                  <p className="text-muted-foreground">
                    Primary locale ready. Select <span className="font-medium text-foreground">Translate with AI</span> to localize this event in 40+ languages.
                  </p>
                </div>
              )}

              {isTranslatingAll && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/60 border border-border">
                  <Loader2 className="h-4 w-4 animate-spin text-faint" />
                  <p className="text-xs tabular-nums text-muted-foreground">
                    Translating {translationProgress.current}/{translationProgress.total} — {translationProgress.locale}
                  </p>
                </div>
              )}

              {isLoadingLocalizations ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin mr-2 text-faint" />
                  <span className="text-sm">Loading localizations</span>
                </div>
              ) : eventLocalizations.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 px-4 rounded-lg border border-dashed border-border bg-background">
                  <Globe className="h-6 w-6 text-faint" />
                  <div className="text-center">
                    <p className="text-sm font-medium">Start with the primary locale</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Write your event in {localeFlag(selectedEvent.primaryLocale)} {selectedEvent.primaryLocale}, then translate it into the other languages.
                    </p>
                  </div>
                  <Button
                    onClick={() => setLocalizationDialog({
                      open: true,
                      locale: selectedEvent.primaryLocale,
                      localization: null,
                      isSaving: false,
                    })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add {selectedEvent.primaryLocale} content
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  {eventLocalizations.map(loc => {
                    const isPrimary = loc.locale === selectedEvent.primaryLocale
                    return (
                      <div
                        key={loc.id}
                        className="flex items-start justify-between gap-3 p-3 rounded-lg bg-background border border-border"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-base">{localeFlag(loc.locale)}</span>
                            <span className="keycap">{loc.locale}</span>
                            {isPrimary && <Badge variant="secondary" className="text-xs font-normal">Primary</Badge>}
                          </div>
                          <p className="text-sm font-medium truncate">{loc.name || <span className="font-normal text-faint">No name</span>}</p>
                          <p className="text-xs text-muted-foreground truncate">{loc.shortDescription}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            onClick={() => setLocalizationDialog({
                              open: true,
                              locale: loc.locale,
                              localization: loc,
                              isSaving: false,
                            })}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          {!isPrimary && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className={`h-8 w-8 text-destructive hover:text-destructive ${confirmDeleteLocId === loc.id ? 'bg-destructive/10' : ''}`}
                              onClick={() => {
                                if (confirmDeleteLocId === loc.id) {
                                  handleDeleteLocalization(loc)
                                  setConfirmDeleteLocId(null)
                                } else {
                                  setConfirmDeleteLocId(loc.id)
                                  setTimeout(() => setConfirmDeleteLocId(prev => prev === loc.id ? null : prev), 3000)
                                }
                              }}
                              title={confirmDeleteLocId === loc.id ? 'Click again to confirm' : 'Delete localization'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {eventLocalizations.length > 0 && assetLibrary && (
                <div className="space-y-3 border-t border-border pt-4">
                  <h4 className="flex items-center gap-2 text-sm font-medium">
                    Event artwork
                    <Badge variant="secondary" className="h-5 px-1.5 text-xs font-normal">iOS 27</Badge>
                  </h4>
                  <p className="text-xs text-muted-foreground">
                    Event card and details page media, from the Asset Library. One asset per slot and locale.
                  </p>
                  <LocalizedMediaPanel
                    media={media}
                    library={assetLibrary}
                    localizations={eventLocalizations}
                    onPreview={onPreviewAsset}
                    dropHint="Folder with one subfolder per event locale (/en-US, /fr-FR…)."
                  />
                </div>
              )}
            </div>
            )
          })()}
        </CardContent>
      </Card>

      {createEventDialog.open && (
        <EventDialog
          mode="create"
          open
          isSubmitting={createEventDialog.isSubmitting}
          onClose={() => setCreateEventDialog({ open: false, isSubmitting: false })}
          onSubmit={handleCreateEvent}
        />
      )}

      {editEventDialog.open && editEventDialog.event && (
        <EventDialog
          key={editEventDialog.event.id}
          mode="edit"
          open
          event={editEventDialog.event}
          isSubmitting={editEventDialog.isSubmitting}
          onClose={() => setEditEventDialog({ open: false, event: null, isSubmitting: false })}
          onSubmit={(attrs) => handleUpdateEvent(editEventDialog.event.id, attrs)}
        />
      )}

      {localizationDialog.open && (
        <EventLocalizationDialog
          key={localizationDialog.localization?.id || `new-${localizationDialog.locale}`}
          open
          locale={localizationDialog.locale}
          localization={localizationDialog.localization}
          isSaving={localizationDialog.isSaving}
          primaryLocale={selectedEvent?.primaryLocale}
          existingLocales={eventLocalizations.map(l => l.locale)}
          onClose={() => setLocalizationDialog({ open: false, locale: '', localization: null, isSaving: false })}
          onSave={handleSaveLocalization}
          onLocaleChange={(locale) => setLocalizationDialog(d => ({ ...d, locale }))}
        />
      )}

      <EventDeleteConfirm
        open={deleteConfirm.open}
        event={deleteConfirm.event}
        isDeleting={deleteConfirm.isDeleting}
        onClose={() => setDeleteConfirm({ open: false, event: null, isDeleting: false })}
        onConfirm={() => handleDeleteEvent(deleteConfirm.event)}
      />

      {translateAllDialog.open && selectedEvent && (
        <TranslateAllLocalesDialog
          key={selectedEvent.id}
          open
          title="Translate event into other languages"
          description={`Translates the primary locale (${selectedEvent.primaryLocale}) into every selected language and saves each localization to App Store Connect. Char limits are enforced strictly (${EVENT_LOCALIZATION_LIMITS.name}/${EVENT_LOCALIZATION_LIMITS.shortDescription}/${EVENT_LOCALIZATION_LIMITS.longDescription}).`}
          primaryLocale={selectedEvent.primaryLocale}
          existingLocales={eventLocalizations.map(l => l.locale)}
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
