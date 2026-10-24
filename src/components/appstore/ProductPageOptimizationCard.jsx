import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ChevronRight, FlaskConical, Images, Loader2, Pencil, Plus, RefreshCw, Rocket, Trash2, X } from 'lucide-react'
import { ASC_LOCALES } from '@/services/appStoreConnectService'
import {
  EXPERIMENT_STATES,
  MAX_EXPERIMENT_TREATMENTS,
  isExperimentEditable,
  isExperimentRunning,
  canStartExperiment,
} from '@/services/appStoreProductPagesService'
import { assetThumbnailUrl } from '@/services/appAssetLibraryService'
import ExperimentDialog from './ExperimentDialog'
import TreatmentDialog from './TreatmentDialog'
import LocalizedMediaPanel from './LocalizedMediaPanel'
import ConfirmDialog from './ConfirmDialog'

const CLOSED_EXPERIMENT_DIALOG = { open: false, mode: 'create', experiment: null, isSubmitting: false }
const CLOSED_TREATMENT_DIALOG = { open: false, mode: 'create', treatment: null, isSubmitting: false }

function formatDate(iso) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : null
}

function stateBadge(experiment) {
  if (isExperimentRunning(experiment)) return { label: 'Running', variant: 'default' }
  return { label: EXPERIMENT_STATES[experiment.state] || experiment.state, variant: 'secondary' }
}

export default function ProductPageOptimizationCard({ selectedApp, selectedVersion, ppoHook, assetLibrary, onPreviewAsset }) {
  const {
    experiments, isLoadingExperiments, selectedExperiment, treatments, isLoadingDetail, activeTreatment,
    treatmentLocalizations, isLoadingLocalizations, media,
    refreshExperiments, handleSelectExperiment, handleCreateExperiment, handleUpdateExperiment, handleStartExperiment,
    handleSelectTreatment, handleCreateTreatment, handleUpdateTreatment, handleConfirmDelete, handleAddLocale,
    handleDeleteLocalization,
    experimentDialog, setExperimentDialog, treatmentDialog, setTreatmentDialog, deleteConfirm, setDeleteConfirm,
    startConfirm, setStartConfirm,
  } = ppoHook

  const editable = isExperimentEditable(selectedExperiment)
  const missingLocales = ASC_LOCALES.filter(l => !treatmentLocalizations.some(t => t.locale === l.code))

  return (
    <>
      <Card id="asc-ppo" className="scroll-mt-44 border-border/50 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10">
                <FlaskConical className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <CardTitle className="text-lg">Product Page Optimization</CardTitle>
                <CardDescription>
                  A/B test icons, screenshots and app previews of {selectedApp.name} against the original product page
                </CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-9" onClick={refreshExperiments} disabled={isLoadingExperiments}>
                {isLoadingExperiments ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
              <Button size="sm" className="h-9" onClick={() => setExperimentDialog({ open: true, mode: 'create', experiment: null, isSubmitting: false })}>
                <Plus className="mr-2 h-4 w-4" />
                New test
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {isLoadingExperiments ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="mr-3 h-6 w-6 animate-spin" />
              Loading tests...
            </div>
          ) : experiments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <FlaskConical className="mb-3 h-10 w-10 opacity-30" />
              <p className="font-medium">No product page tests yet</p>
              <p className="text-sm">Find out which icon or screenshots convert best before changing your main page</p>
            </div>
          ) : (
            <div className="space-y-2">
              {experiments.map(experiment => {
                const isSelected = selectedExperiment?.id === experiment.id
                const badge = stateBadge(experiment)
                const start = formatDate(experiment.startDate)
                const end = formatDate(experiment.endDate)
                return (
                  <div
                    key={experiment.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleSelectExperiment(experiment)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSelectExperiment(experiment)}
                    className={`group w-full cursor-pointer rounded-xl border p-4 transition-all
                      ${isSelected
                        ? 'border-amber-500/50 bg-amber-500/[0.04] shadow-sm'
                        : 'border-border/50 bg-background hover:border-amber-500/30 hover:bg-muted/40'}`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg
                        ${isSelected ? 'bg-amber-500/15' : 'bg-muted/60 group-hover:bg-amber-500/10'}`}>
                        <FlaskConical className={`h-5 w-5 ${isSelected ? 'text-amber-500' : 'text-muted-foreground'}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <span className="truncate font-semibold">{experiment.name}</span>
                          <Badge variant={badge.variant} className="h-4 px-1.5 text-[10px]">{badge.label}</Badge>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>{experiment.platform}</span>
                          <span className="text-muted-foreground/40">·</span>
                          <span>{experiment.trafficProportion}% of traffic</span>
                          {start && (
                            <>
                              <span className="text-muted-foreground/40">·</span>
                              <span>{start}{end ? ` → ${end}` : ''}</span>
                            </>
                          )}
                          {experiment.reviewRequired && !experiment.startDate && (
                            <>
                              <span className="text-muted-foreground/40">·</span>
                              <span>needs App Review</span>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        {canStartExperiment(experiment) && (
                          <Button size="sm" variant="outline" className="h-8"
                            onClick={(e) => { e.stopPropagation(); setStartConfirm({ open: true, experiment, isStarting: false }) }}>
                            <Rocket className="mr-1.5 h-3.5 w-3.5" />
                            Start
                          </Button>
                        )}
                        {isExperimentEditable(experiment) && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 opacity-60 group-hover:opacity-100" title="Edit test"
                            onClick={(e) => { e.stopPropagation(); setExperimentDialog({ open: true, mode: 'edit', experiment, isSubmitting: false }) }}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive opacity-60 hover:text-destructive group-hover:opacity-100" title="Delete test"
                          onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, kind: 'experiment', target: experiment, isDeleting: false }) }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <ChevronRight className={`ml-1 h-5 w-5 transition-transform
                          ${isSelected ? 'rotate-90 text-amber-500' : 'text-muted-foreground/50 group-hover:translate-x-0.5 group-hover:text-amber-500'}`} />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {selectedExperiment && (
            <div className="space-y-5 rounded-xl border border-border/50 bg-muted/20 p-5">
              {isLoadingDetail ? (
                <div className="flex items-center justify-center py-6 text-muted-foreground">
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  <span className="text-sm">Loading treatments…</span>
                </div>
              ) : (
                <>
                  {/* Treatment tabs */}
                  <div className="flex flex-wrap items-center gap-2">
                    {treatments.map(t => {
                      const iconUrl = assetThumbnailUrl({ mediaType: 'IMAGE', imageAsset: t.appIcon }, 64, 64)
                      const active = activeTreatment?.id === t.id
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => handleSelectTreatment(t.id)}
                          className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors
                            ${active ? 'border-amber-500/50 bg-amber-500/10 font-semibold' : 'border-border/50 bg-background hover:bg-muted/50'}`}
                        >
                          {iconUrl && <img src={iconUrl} alt="" className="h-5 w-5 rounded" />}
                          {t.name}
                        </button>
                      )
                    })}
                    {editable && treatments.length < MAX_EXPERIMENT_TREATMENTS && (
                      <Button size="sm" variant="ghost" onClick={() => setTreatmentDialog({ open: true, mode: 'create', treatment: null, isSubmitting: false })}>
                        <Plus className="mr-1.5 h-4 w-4" />
                        Treatment
                      </Button>
                    )}
                  </div>

                  {!editable && (
                    <p className="text-xs text-muted-foreground">
                      This test is {(EXPERIMENT_STATES[selectedExperiment.state] || selectedExperiment.state).toLowerCase()} — treatments are read-only.
                      Follow results and apply a winner in App Store Connect.
                    </p>
                  )}
                  {editable && (
                    <p className="text-xs text-muted-foreground">
                      Submit the test for review from App Store Connect once each treatment has its media. The Start button
                      appears once the test is accepted, or right away when Apple reports that no review is needed.
                    </p>
                  )}

                  {!activeTreatment ? (
                    <p className="text-sm italic text-muted-foreground">Add a treatment to start.</p>
                  ) : (
                    <div className="space-y-5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <h4 className="text-sm font-semibold">{activeTreatment.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            Icon: {activeTreatment.appIconName ? <span className="font-mono">{activeTreatment.appIconName}</span> : 'original'}
                          </p>
                        </div>
                        {editable && (
                          <div className="flex items-center gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setTreatmentDialog({ open: true, mode: 'edit', treatment: activeTreatment, isSubmitting: false })}>
                              <Pencil className="mr-1.5 h-4 w-4" />
                              Edit
                            </Button>
                            <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteConfirm({ open: true, kind: 'treatment', target: activeTreatment, isDeleting: false })}>
                              <Trash2 className="mr-1.5 h-4 w-4" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>

                      {/* Treatment locales */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-medium text-muted-foreground">
                            Locales in this treatment {isLoadingLocalizations && <Loader2 className="ml-1 inline h-3 w-3 animate-spin" />}
                          </span>
                          {editable && missingLocales.length > 0 && (
                            <Select value="" onValueChange={handleAddLocale}>
                              <SelectTrigger className="h-8 w-[180px] text-xs"><SelectValue placeholder="+ Add locale" /></SelectTrigger>
                              <SelectContent>
                                {missingLocales.map(l => (
                                  <SelectItem key={l.code} value={l.code}>{l.flag} {l.name}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                        {treatmentLocalizations.length === 0 ? (
                          <p className="text-xs italic text-muted-foreground">No locales yet — add one, or drop a folder of localized screenshots below.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {treatmentLocalizations.map(loc => (
                              <Badge key={loc.id} variant="outline" className="gap-1 py-1 pl-2 pr-1 text-xs">
                                {ASC_LOCALES.find(l => l.code === loc.locale)?.flag || '🌐'} {loc.locale}
                                {editable && (
                                  <button type="button" onClick={() => handleDeleteLocalization(loc)} className="rounded p-0.5 hover:bg-muted" title={`Remove ${loc.locale}`}>
                                    <X className="h-3 w-3" />
                                  </button>
                                )}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="space-y-3 border-t border-border/50 pt-5">
                        <h4 className="flex items-center gap-2 text-sm font-semibold">
                          <Images className="h-4 w-4 text-muted-foreground" />
                          Treatment media
                        </h4>
                        <LocalizedMediaPanel
                          media={media}
                          library={assetLibrary}
                          localizations={treatmentLocalizations}
                          readOnly={!editable}
                          readOnlyReason="This test can't be edited anymore."
                          onPreview={onPreviewAsset}
                          dropHint="Folder with one subfolder per locale (/en-US, /fr-FR…). Missing locales are added to the treatment."
                        />
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {experimentDialog.open && (
        <ExperimentDialog
          key={experimentDialog.experiment?.id || 'new'}
          open
          mode={experimentDialog.mode}
          experiment={experimentDialog.experiment}
          defaultPlatform={selectedVersion?.platform || 'IOS'}
          isSubmitting={experimentDialog.isSubmitting}
          onClose={() => setExperimentDialog(CLOSED_EXPERIMENT_DIALOG)}
          onSubmit={(values) => experimentDialog.mode === 'create'
            ? handleCreateExperiment(values)
            : handleUpdateExperiment(experimentDialog.experiment, values)}
        />
      )}

      {treatmentDialog.open && (
        <TreatmentDialog
          key={treatmentDialog.treatment?.id || 'new'}
          open
          mode={treatmentDialog.mode}
          treatment={treatmentDialog.treatment}
          isSubmitting={treatmentDialog.isSubmitting}
          onClose={() => setTreatmentDialog(CLOSED_TREATMENT_DIALOG)}
          onSubmit={(values) => treatmentDialog.mode === 'create'
            ? handleCreateTreatment(values)
            : handleUpdateTreatment(treatmentDialog.treatment, values)}
        />
      )}

      <ConfirmDialog
        open={deleteConfirm.open}
        title={deleteConfirm.kind === 'experiment' ? 'Delete test?' : 'Delete treatment?'}
        description={deleteConfirm.kind === 'experiment'
          ? `"${deleteConfirm.target?.name}" and its treatments will be removed from App Store Connect. Assets stay in the Asset Library.`
          : `"${deleteConfirm.target?.name}" and its locales will be removed from this test. Assets stay in the Asset Library.`}
        confirmLabel="Delete"
        isBusy={deleteConfirm.isDeleting}
        onClose={() => setDeleteConfirm({ open: false, kind: 'experiment', target: null, isDeleting: false })}
        onConfirm={handleConfirmDelete}
      />

      <ConfirmDialog
        open={startConfirm.open}
        destructive={false}
        title="Start this test?"
        description={`"${startConfirm.experiment?.name}" will start showing its treatments to ${startConfirm.experiment?.trafficProportion}% of App Store visitors. You can stop it or apply a winner from App Store Connect.`}
        confirmLabel="Start test"
        isBusy={startConfirm.isStarting}
        onClose={() => setStartConfirm({ open: false, experiment: null, isStarting: false })}
        onConfirm={() => handleStartExperiment(startConfirm.experiment)}
      />
    </>
  )
}
