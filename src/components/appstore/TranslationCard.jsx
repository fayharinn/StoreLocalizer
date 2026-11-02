import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Languages, CheckCircle2, AlertCircle, Loader2, MessageSquareText } from 'lucide-react'
import { PROVIDERS } from '@/services/translationService'
import { ASC_LOCALES } from '@/services/appStoreConnectService'

export default function TranslationCard({
  versionLocalizations,
  aiConfig,
  currentAiApiKey,
  currentAiModel,
  sourceLocale,
  setSourceLocale,
  targetLocales,
  setTargetLocales,
  fieldsToTranslate,
  isTranslating,
  translationProgress,
  translationAlert,
  setTranslationAlert,
  availableTargetLocales,
  existingLocales,
  TRANSLATABLE_FIELDS,
  handleFieldToggle,
  handleLocaleToggle,
  handleTranslate,
  promptIsCustom,
  onEditPrompt,
}) {
  return (
    <Card id="asc-translation" className="scroll-mt-44">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-medium">AI translation</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">Translate the listing metadata into other languages</CardDescription>
          </div>
          {onEditPrompt && (
            <Button
              variant="outline"
              size="sm"
              onClick={onEditPrompt}
              className="h-9 shrink-0"
              title="Customize the AI translation prompt"
            >
              <MessageSquareText className="h-4 w-4 mr-2" />
              Prompt
              {promptIsCustom && <span className="ml-2 h-1.5 w-1.5 rounded-full bg-foreground" />}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
          <span className="text-sm text-faint">Using</span>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-background">
            <span className="text-sm font-medium">{PROVIDERS[aiConfig.provider]?.name || aiConfig.provider}</span>
            <span className="text-faint">/</span>
            <span className="text-sm text-muted-foreground">
              {currentAiModel?.includes('inference-profile/')
                ? currentAiModel.split('/').pop().replace('global.anthropic.', '').replace(/-v\d+:\d+$/, '')
                : currentAiModel || 'No model'}
            </span>
          </div>
          {!currentAiApiKey && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-highlight/10 text-highlight-ink text-xs font-medium ml-auto">
              <AlertCircle className="h-3.5 w-3.5" />
              Set an API key in the sidebar
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Source language</Label>
          <Select value={sourceLocale} onValueChange={setSourceLocale}>
            <SelectTrigger className="h-10 max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {versionLocalizations.map(loc => {
                const localeInfo = ASC_LOCALES.find(l => l.code === loc.locale)
                return (
                  <SelectItem key={loc.locale} value={loc.locale}>
                    {localeInfo?.flag} {localeInfo?.name || loc.locale} <span className="keycap">{loc.locale}</span>
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Fields to translate</Label>
          <div className="flex flex-wrap gap-2">
            {TRANSLATABLE_FIELDS.map(field => {
              const isSelected = fieldsToTranslate.includes(field.key)
              return (
                <button
                  key={field.key}
                  onClick={() => handleFieldToggle(field.key)}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors
                    ${isSelected
                      ? 'border-foreground/30 bg-secondary text-foreground'
                      : 'border-border bg-background text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                    }
                  `}
                >
                  <div className={`
                    flex h-4 w-4 items-center justify-center rounded border transition-colors
                    ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40'}
                  `}>
                    {isSelected && (
                      <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span>{field.label}</span>
                  <span className="text-xs tabular-nums text-faint">{field.limit}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Target languages</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (targetLocales.length === availableTargetLocales.length) {
                  setTargetLocales([])
                } else {
                  setTargetLocales(availableTargetLocales.map(l => l.code))
                }
              }}
              className="h-9"
            >
              {targetLocales.length === availableTargetLocales.length ? 'Deselect all' : 'Select all'}
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {availableTargetLocales.map(locale => {
              const exists = existingLocales.includes(locale.code)
              const isSelected = targetLocales.includes(locale.code)
              return (
                <button
                  key={locale.code}
                  onClick={() => handleLocaleToggle(locale.code)}
                  className={`
                    flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-colors
                    ${isSelected
                      ? 'border-foreground/30 bg-secondary'
                      : 'border-border bg-background hover:bg-muted/30'
                    }
                  `}
                >
                  <div className={`
                    flex h-4 w-4 items-center justify-center rounded border transition-colors
                    ${isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/40'}
                  `}>
                    {isSelected && (
                      <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className="text-lg">{locale.flag}</span>
                  <span className="text-sm font-medium flex-1 min-w-0 truncate">{locale.name}</span>
                  <span className="keycap shrink-0">{locale.code}</span>
                  {exists && (
                    <span className="shrink-0 text-positive" title="Already localized">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>

        <Button
          onClick={handleTranslate}
          disabled={isTranslating || !currentAiApiKey || targetLocales.length === 0 || fieldsToTranslate.length === 0}
          variant="highlight"
          className="w-full h-11 font-medium"
          size="lg"
        >
          {isTranslating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Translating
            </>
          ) : (
            <>
              <Languages className="h-4 w-4 mr-2" />
              Translate to {targetLocales.length} language{targetLocales.length !== 1 ? 's' : ''}
            </>
          )}
        </Button>

        {isTranslating && (
          <div className="space-y-3 p-4 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-highlight animate-pulse" />
                <span className="text-sm font-medium">Translation in progress</span>
              </div>
              <span className="text-sm font-mono tabular-nums text-muted-foreground">{translationProgress.current} / {translationProgress.total}</span>
            </div>
            <div className="relative h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-highlight transition-[width] duration-300"
                style={{ width: `${(translationProgress.current / translationProgress.total) * 100}%` }}
              />
            </div>
            <p className="text-sm text-muted-foreground">{translationProgress.status}</p>
          </div>
        )}

        {translationAlert.show && (
          <div className={`relative flex items-start gap-3 p-4 rounded-lg ${translationAlert.success ? 'bg-positive/10 text-positive' : 'bg-destructive/10 text-destructive'}`}>
            {translationAlert.success ? <CheckCircle2 className="h-4 w-4 mt-0.5" /> : <AlertCircle className="h-4 w-4 mt-0.5" />}
            <div className="flex-1">
              <p className="text-sm font-medium">{translationAlert.success ? 'Translation complete' : 'Completed with errors'}</p>
              <p className="text-sm text-muted-foreground">{translationAlert.message}</p>
            </div>
            <button
              onClick={() => setTranslationAlert(prev => ({ ...prev, show: false }))}
              className="p-1 rounded-md text-muted-foreground hover:bg-background/50 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
