import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Languages, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { GP_LOCALES } from '@/services/googlePlayService'

const TRANSLATABLE_FIELDS = [
  { key: 'title', label: 'Title', limit: 30 },
  { key: 'shortDescription', label: 'Short description', limit: 80 },
  { key: 'fullDescription', label: 'Full description', limit: 4000 },
]

export default function TranslationCard({
  existingLocales,
  sourceLocale,
  setSourceLocale,
  targetLocales,
  setTargetLocales,
  fieldsToTranslate,
  isTranslating,
  translationProgress,
  translationAlert,
  availableTargetLocales,
  currentAiApiKey,
  handleLocaleToggle,
  handleFieldToggle,
  handleTranslate,
}) {
  return (
    <Card id="gp-translation" className="scroll-mt-6">
      <CardHeader className="pb-4">
        <CardTitle className="text-base font-medium">Translation</CardTitle>
        <CardDescription className="text-sm text-muted-foreground">Translate listings to multiple languages</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {translationAlert.show && (
          <Alert className={translationAlert.success ? 'border-positive/30 bg-positive/10' : 'border-highlight/30 bg-highlight/10'}>
            {translationAlert.success ? <CheckCircle2 className="h-4 w-4 text-positive" /> : <AlertCircle className="h-4 w-4 text-highlight-ink" />}
            <AlertTitle className={`font-medium ${translationAlert.success ? 'text-positive' : 'text-highlight-ink'}`}>
              {translationAlert.success ? 'Translation complete' : 'Translation completed with errors'}
            </AlertTitle>
            <AlertDescription>{translationAlert.message}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <Label className="text-sm font-medium">Source language</Label>
          <Select value={sourceLocale} onValueChange={setSourceLocale}>
            <SelectTrigger className="h-10 max-w-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {existingLocales.map(locale => {
                const info = GP_LOCALES.find(l => l.code === locale)
                return (
                  <SelectItem key={locale} value={locale}>
                    {info?.flag} {info?.name || locale}
                  </SelectItem>
                )
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label className="text-sm font-medium">Fields to translate</Label>
          <div className="flex flex-wrap gap-2">
            {TRANSLATABLE_FIELDS.map(field => (
              <button
                key={field.key}
                onClick={() => handleFieldToggle(field.key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors ${
                  fieldsToTranslate.includes(field.key)
                    ? 'border-foreground/40 bg-secondary text-foreground'
                    : 'border-border text-muted-foreground hover:border-foreground/30'
                }`}
              >
                <div className={`h-4 w-4 rounded border-2 flex items-center justify-center ${
                  fieldsToTranslate.includes(field.key) ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                }`}>
                  {fieldsToTranslate.includes(field.key) && (
                    <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                {field.label}
                <Badge variant="outline" className="text-xs font-mono tabular-nums">{field.limit.toLocaleString('en-US')}</Badge>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Target languages</Label>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (targetLocales.length === availableTargetLocales.length) {
                  setTargetLocales([])
                } else {
                  setTargetLocales(availableTargetLocales.map(l => l.code))
                }
              }}
            >
              {targetLocales.length === availableTargetLocales.length ? 'Deselect all' : 'Select all'}
            </Button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-64 overflow-y-auto p-1">
            {availableTargetLocales.map(locale => {
              const isSelected = targetLocales.includes(locale.code)
              const exists = existingLocales.includes(locale.code)
              return (
                <button
                  key={locale.code}
                  onClick={() => handleLocaleToggle(locale.code)}
                  className={`flex items-center gap-2 p-2 rounded-lg border text-left text-sm transition-colors ${
                    isSelected
                      ? 'border-foreground/40 bg-secondary'
                      : exists
                        ? 'border-border bg-secondary/40'
                        : 'border-border hover:border-foreground/30'
                  }`}
                >
                  <div className={`h-4 w-4 rounded border-2 flex items-center justify-center shrink-0 ${
                    isSelected ? 'bg-primary border-primary' : 'border-muted-foreground/30'
                  }`}>
                    {isSelected && (
                      <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span>{locale.flag}</span>
                  <span className="truncate">{locale.name}</span>
                  {exists && <CheckCircle2 className="h-3 w-3 text-faint ml-auto shrink-0" aria-label="Already listed" />}
                </button>
              )
            })}
          </div>
        </div>

        <div className="pt-4">
          <Button
            onClick={handleTranslate}
            disabled={isTranslating || !currentAiApiKey || targetLocales.length === 0 || fieldsToTranslate.length === 0}
            variant="highlight"
            className="w-full"
            size="lg"
          >
            {isTranslating ? (
              <span className="flex items-center gap-2 tabular-nums">
                <Loader2 className="h-4 w-4 animate-spin" />
                Translating ({translationProgress.current}/{translationProgress.total})
              </span>
            ) : (
              <span className="flex items-center gap-2 tabular-nums">
                <Languages className="h-4 w-4" />
                Translate {targetLocales.length > 0 && `(${targetLocales.length} languages)`}
              </span>
            )}
          </Button>
          {isTranslating && translationProgress.status && (
            <p className="text-sm text-muted-foreground mt-2 text-center">{translationProgress.status}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
